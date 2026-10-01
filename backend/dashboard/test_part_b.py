from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from accounts.models import PremiumMembership, get_profile
from categories.models import Category
from sitecontent.models import MoodOfDay
from stories.models import Story, Tag


# Tests for Premium Members, Revenue, Scheduled Stories, Tags and
# Mood of the Day. Run with:  python manage.py test
# (Django finds every file whose name starts with "test".)

PASSWORD = 'Str0ng-pass-123'


class PremiumTests(TestCase):
    def setUp(self):
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.member = User.objects.create_user('member', password=PASSWORD)
        self.client.login(username='boss', password=PASSWORD)

    def grant(self, **extra):
        body = {'username': 'member', 'plan': 'monthly', 'amount': '4.99'}
        body.update(extra)
        return self.client.post('/api/dashboard/premium/', body)

    def test_grant_extend_and_cancel(self):
        first = self.grant().json()
        self.assertTrue(get_profile(self.member).is_premium)

        # Paying again while it runs: the new month starts when the
        # first one ends, so no days are lost.
        second = self.grant().json()
        self.assertEqual(second['starts_at'], first['ends_at'])

        self.client.post(f"/api/dashboard/premium/{first['id']}/cancel/")
        self.client.post(f"/api/dashboard/premium/{second['id']}/cancel/")
        self.assertFalse(get_profile(self.member).is_premium)

    def test_expired_membership_switches_the_badge_off(self):
        self.grant()
        PremiumMembership.objects.update(ends_at=timezone.now() - timedelta(minutes=1))
        self.client.login(username='member', password=PASSWORD)
        self.client.get('/api/accounts/me/')          # refreshes on every page load
        self.assertFalse(get_profile(self.member).is_premium)

    def test_revenue_adds_up_paid_memberships(self):
        self.grant(amount='4.99')
        self.grant(plan='yearly', amount='39.00')
        self.grant(plan='gift', amount='100')          # gifts are always free
        data = self.client.get('/api/dashboard/revenue/').json()
        self.assertEqual(data['total_all_time'], '43.99')
        self.assertEqual(data['this_month'], '43.99')
        self.assertEqual(len(data['months']), 12)


class ScheduledTests(TestCase):
    def test_publish_now_and_cancel(self):
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        writer = User.objects.create_user('writer', password=PASSWORD)
        later = timezone.now() + timedelta(days=2)
        story = Story.objects.create(title='Soon', body='x', author=writer, is_published=True, publish_at=later)

        self.client.login(username='boss', password=PASSWORD)
        self.assertEqual([s['title'] for s in self.client.get('/api/dashboard/scheduled/').json()], ['Soon'])

        self.client.post(f'/api/dashboard/scheduled/{story.id}/', {'action': 'now'})
        self.assertEqual(self.client.get('/api/dashboard/scheduled/').json(), [])
        self.assertEqual(len(self.client.get('/api/stories/').json()), 1)   # live now


class TagTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.category = Category.objects.create(name='C', slug='c')
        self.client.login(username='writer', password=PASSWORD)

    def write(self, tags):
        data = {'title': 'Tagged', 'body': 'Once upon a time', 'category': self.category.id, 'is_published': 'true'}
        # The same key several times = a list (like FormData in React).
        data['tag_names'] = tags
        return self.client.post('/api/stories/new/', data)

    def test_tags_are_cleaned_and_searchable(self):
        response = self.write(['  Cursed Object! ', 'VHS'])
        story = Story.objects.get(id=response.json()['id'])
        self.assertEqual(sorted(tag.name for tag in story.tags.all()), ['cursed-object', 'vhs'])

        titles = [s['title'] for s in self.client.get('/api/search/?q=vhs').json()['stories']]
        self.assertEqual(titles, ['Tagged'])

    def test_merge(self):
        self.write(['spooky-house'])
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.client.login(username='boss', password=PASSWORD)
        old = Tag.objects.get(name='spooky-house')
        into = Tag.objects.create(name='haunted-house')
        self.client.post(f'/api/dashboard/tags/{old.id}/merge/', {'into_id': into.id})
        self.assertFalse(Tag.objects.filter(name='spooky-house').exists())
        self.assertEqual(into.stories.count(), 1)


class MoodOfDayTests(TestCase):
    def test_todays_mood_with_matching_stories(self):
        writer = User.objects.create_user('writer', password=PASSWORD)
        Story.objects.create(title='Creepy one', body='x', author=writer, is_published=True, mood='creepy')
        Story.objects.create(title='Sad one', body='x', author=writer, is_published=True, mood='sad')

        self.assertEqual(self.client.get('/api/mood-of-the-day/').status_code, 204)   # none planned

        MoodOfDay.objects.create(date=timezone.localdate(), mood='creepy', note='Brr')
        data = self.client.get('/api/mood-of-the-day/').json()
        self.assertEqual(data['mood_label'], 'Creepy')
        self.assertEqual([s['title'] for s in data['stories']], ['Creepy one'])
