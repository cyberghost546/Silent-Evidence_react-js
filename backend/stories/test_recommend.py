from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import Follow, get_profile
from categories.models import Category
from stories.models import Like, ReadingHistory, Story, Tag


# Tests for "Because you read..." recommendations. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class RecommendationTests(TestCase):
    def setUp(self):
        self.reader = User.objects.create_user('reader', password=PASSWORD)
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.other = User.objects.create_user('other', password=PASSWORD)
        self.cat = Category.objects.create(name='Ghosts Test', slug='ghosts-test')
        self.tag = Tag.objects.create(name='lighthouse')

    def story(self, title, author=None, **extra):
        return Story.objects.create(title=title, body='x', author=author or self.writer, is_published=True, **extra)

    def recommended(self):
        self.client.force_login(self.reader)
        return self.client.get('/api/stories/recommended/').json()

    def test_a_new_member_gets_nothing(self):
        self.story('Anything')
        self.assertEqual(self.recommended(), [])

    def test_liked_tags_and_reasons(self):
        liked = self.story('The Keeper')
        liked.tags.add(self.tag)
        Like.objects.create(user=self.reader, story=liked)
        same_tag = self.story('Beacon')
        same_tag.tags.add(self.tag)
        self.story('Unrelated')

        results = self.recommended()
        self.assertEqual([r['title'] for r in results], ['Beacon'])
        self.assertEqual(results[0]['reason'], 'Because you liked "The Keeper"')

    def test_fear_profile_and_followed_writers(self):
        profile = get_profile(self.reader)
        profile.fear_moods = 'creepy'
        profile.save()
        Follow.objects.create(follower=self.reader, following=self.other)
        self.story('Creepy One', mood='creepy')
        self.story('By Other', author=self.other)
        reasons = {r['title']: r['reason'] for r in self.recommended()}
        self.assertEqual(reasons['Creepy One'], 'Matches your Fear Profile: creepy')
        self.assertEqual(reasons['By Other'], 'By other, who you follow')

    def test_never_something_you_read_or_wrote(self):
        Follow.objects.create(follower=self.reader, following=self.other)
        read = self.story('Already Read', author=self.other)
        ReadingHistory.objects.create(user=self.reader, story=read, progress=100)
        self.story('My Own', author=self.reader)
        draft = self.story('Draft', author=self.other)
        draft.is_published = False
        draft.save()
        self.assertEqual(self.recommended(), [])

    def test_login_needed(self):
        self.assertEqual(self.client.get('/api/stories/recommended/').status_code, 403)
