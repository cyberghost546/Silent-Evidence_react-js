from django.contrib.auth.models import User
from django.test import TestCase

from stories.models import Story


# Tests for "Continue reading". Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class ContinueReadingTests(TestCase):
    def setUp(self):
        writer = User.objects.create_user('writer', password=PASSWORD)
        self.reader = User.objects.create_user('reader', password=PASSWORD)
        self.half = Story.objects.create(title='Half read', body='x', author=writer, is_published=True)
        self.done = Story.objects.create(title='Finished', body='x', author=writer, is_published=True)
        self.client.force_login(self.reader)

    def save(self, story, percent):
        return self.client.post(f'/api/stories/{story.id}/progress/', {'percent': percent}, content_type='application/json')

    def test_only_started_and_unfinished_stories_show_up(self):
        self.save(self.half, 43)
        self.save(self.done, 100)
        rows = self.client.get('/api/stories/continue/').json()
        self.assertEqual([(row['story']['title'], row['progress']) for row in rows], [('Half read', 43)])

    def test_the_story_page_knows_where_you_were(self):
        self.save(self.half, 43)
        self.assertEqual(self.client.get(f'/api/stories/{self.half.id}/').json()['my_progress'], 43)
        # Opening the story again doesn't reset it.
        self.assertEqual(self.client.get(f'/api/stories/{self.half.id}/').json()['my_progress'], 43)

    def test_silly_numbers_are_kept_between_0_and_100(self):
        self.assertEqual(self.save(self.half, 250).json()['progress'], 100)
        self.assertEqual(self.save(self.half, 'lots').status_code, 400)

    def test_logged_out_gets_403(self):
        self.client.logout()
        self.assertEqual(self.client.get('/api/stories/continue/').status_code, 403)
