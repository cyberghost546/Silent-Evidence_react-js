from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from accounts.models import get_profile
from categories.models import Category
from stories.models import Story


# PRO EARLY ACCESS: a writer can keep a new story for Pro readers for
# its first 48 hours. Run with:  python manage.py test stories.test_early_access

PASSWORD = 'Str0ng-pass-123'


class EarlyAccessTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.reader = User.objects.create_user('reader', password=PASSWORD)
        self.pro = User.objects.create_user('pro', password=PASSWORD)
        profile = get_profile(self.pro)
        profile.is_premium = True
        profile.save()
        self.category = Category.objects.create(name='Haunted', slug='haunted')

    def publish(self, **extra):
        self.client.force_login(self.writer)
        data = {
            'title': 'The Door', 'excerpt': 'Knock knock.', 'body': 'word ' * 120,
            'category': self.category.id, 'is_published': 'true', **extra,
        }
        answer = self.client.post('/api/stories/new/', data)
        self.assertEqual(answer.status_code, 201, answer.content)
        return Story.objects.get(pk=answer.json()['id'])

    def read_as(self, user, story):
        if user is None:
            self.client.logout()
        else:
            self.client.force_login(user)
        return self.client.get(f'/api/stories/{story.id}/').json()

    def test_ticking_early_access_gives_48_hours(self):
        story = self.publish(early_access='true')
        hours_left = (story.early_access_until - timezone.now()) / timedelta(hours=1)
        self.assertAlmostEqual(hours_left, 48, delta=0.1)

    def test_not_ticked_means_open_to_everyone(self):
        story = self.publish()
        self.assertIsNone(story.early_access_until)
        self.assertIsNone(self.read_as(self.reader, story)['lock'])

    def test_only_pro_readers_get_the_text(self):
        story = self.publish(early_access='true')

        locked = self.read_as(self.reader, story)
        self.assertEqual(locked['lock'], 'early_access')
        self.assertEqual(locked['body'], '')
        # The title and the opening time still show (the lock screen uses them).
        self.assertEqual(locked['title'], 'The Door')
        self.assertIsNotNone(locked['early_access_until'])

        self.assertEqual(self.read_as(None, story)['lock'], 'early_access')

        unlocked = self.read_as(self.pro, story)
        self.assertIsNone(unlocked['lock'])
        self.assertIn('word', unlocked['body'])

        # The writer, of course.
        self.assertIsNone(self.read_as(self.writer, story)['lock'])

    def test_admins_can_read_it_too(self):
        story = self.publish(early_access='true')
        admin = User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.assertIsNone(self.read_as(admin, story)['lock'])

    def test_it_opens_to_everyone_afterwards(self):
        story = self.publish(early_access='true')
        Story.objects.filter(pk=story.pk).update(early_access_until=timezone.now() - timedelta(minutes=1))
        self.assertIsNone(self.read_as(self.reader, story)['lock'])

    def test_a_scheduled_story_counts_from_its_publish_date(self):
        later = timezone.now() + timedelta(days=3)
        story = self.publish(early_access='true', publish_at=later.isoformat())
        self.assertEqual(story.early_access_until, later + timedelta(hours=48))

    def test_a_draft_gets_no_early_access(self):
        story = self.publish(early_access='true', is_published='false')
        self.assertIsNone(story.early_access_until)

    def test_pro_does_not_skip_the_age_check(self):
        story = self.publish(early_access='true', content_rating='mature')
        # Pro, but never confirmed an age -> the age question comes first.
        self.assertEqual(self.read_as(self.pro, story)['lock'], 'age')
