from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from categories.models import Category
from stories.models import Story
from .models import Announcement, WritingPrompt, Challenge, ChallengeEntry, Bundle


# Tests for announcements, prompts, challenges, bundles, categories
# and Story of the Week. Run with:  python manage.py test
# (How tests work is explained at the top of accounts/tests.py.)

PASSWORD = 'Str0ng-pass-123'


def patch(client, url, body):
    return client.patch(url, body, content_type='application/json')


class AnnouncementTests(TestCase):
    def setUp(self):
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.client.login(username='boss', password=PASSWORD)

    def test_only_one_banner_at_a_time(self):
        self.client.post('/api/dashboard/announcements/', {'message': 'First', 'style': 'info', 'is_active': True})
        self.client.post('/api/dashboard/announcements/', {'message': 'Second', 'style': 'event', 'is_active': True})
        self.assertEqual(Announcement.objects.filter(is_active=True).count(), 1)
        self.assertEqual(self.client.get('/api/announcement/').json()['message'], 'Second')

    def test_nothing_on(self):
        self.assertEqual(self.client.get('/api/announcement/').status_code, 204)


class PromptTests(TestCase):
    def test_random_prompt_only_from_active_ones(self):
        WritingPrompt.objects.create(text='Off', is_active=False)
        self.assertEqual(self.client.get('/api/prompts/random/').status_code, 204)
        WritingPrompt.objects.create(text='On')
        self.assertEqual(self.client.get('/api/prompts/random/').json()['text'], 'On')


class ChallengeTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.story = Story.objects.create(title='Entry', body='x', author=self.writer, is_published=True)
        self.open = Challenge.objects.create(title='Open', theme='Fog', deadline=timezone.now() + timedelta(days=3))
        self.closed = Challenge.objects.create(title='Closed', theme='Rain', deadline=timezone.now() - timedelta(days=1))
        self.client.login(username='writer', password=PASSWORD)

    def test_enter_an_open_challenge(self):
        detail = self.client.get(f'/api/challenges/{self.open.id}/').json()
        self.assertEqual(detail['my_eligible_stories'], [{'id': self.story.id, 'title': 'Entry'}])

        response = self.client.post(f'/api/challenges/{self.open.id}/enter/', {'story_id': self.story.id})
        self.assertEqual(response.status_code, 201)
        detail = self.client.get(f'/api/challenges/{self.open.id}/').json()
        self.assertEqual([entry['title'] for entry in detail['entries']], ['Entry'])

    def test_closed_challenge_refuses(self):
        response = self.client.post(f'/api/challenges/{self.closed.id}/enter/', {'story_id': self.story.id})
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ChallengeEntry.objects.exists())


class BundleTests(TestCase):
    def test_admin_makes_a_bundle_and_only_published_show(self):
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        writer = User.objects.create_user('writer', password=PASSWORD)
        story = Story.objects.create(title='In it', body='x', author=writer, is_published=True)

        self.client.login(username='boss', password=PASSWORD)
        response = self.client.post(
            '/api/dashboard/bundles/',
            {'title': 'Best of', 'slug': 'best-of', 'story_ids': [story.id], 'is_published': False},
            content_type='application/json',
        )
        bundle_id = response.json()['id']
        self.assertEqual(self.client.get('/api/bundles/').json(), [])            # not published yet

        patch(self.client, f'/api/dashboard/bundles/{bundle_id}/', {'is_published': True})
        detail = self.client.get('/api/bundles/best-of/').json()
        self.assertEqual([s['title'] for s in detail['stories']], ['In it'])


class CategoryAdminTests(TestCase):
    def test_delete_category_keeps_its_stories(self):
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        writer = User.objects.create_user('writer', password=PASSWORD)
        category = Category.objects.create(name='Fog', slug='fog')
        story = Story.objects.create(title='S', body='x', author=writer, category=category)

        self.client.login(username='boss', password=PASSWORD)
        rows = self.client.get('/api/dashboard/categories/').json()
        self.assertEqual(rows[0]['story_count'], 1)

        self.client.delete(f'/api/dashboard/categories/{category.id}/')
        story.refresh_from_db()
        self.assertIsNone(story.category)


class StoryOfTheWeekTests(TestCase):
    def test_only_one_story_of_the_week(self):
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        writer = User.objects.create_user('writer', password=PASSWORD)
        first = Story.objects.create(title='A', body='x', author=writer, is_published=True, is_story_of_the_week=True)
        second = Story.objects.create(title='B', body='x', author=writer, is_published=True)

        self.client.login(username='boss', password=PASSWORD)
        self.client.patch(f'/api/dashboard/stories/{second.id}/', 'is_story_of_the_week=true',
                          content_type='application/x-www-form-urlencoded')
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertFalse(first.is_story_of_the_week)
        self.assertTrue(second.is_story_of_the_week)
