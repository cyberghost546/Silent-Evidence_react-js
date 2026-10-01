from django.contrib.auth.models import User
from django.test import TestCase

from stories.models import Story, StoryVersion


# Tests for editing a story and its version history. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class StoryVersionTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.story = Story.objects.create(title='First Title', body='First text.', author=self.writer, is_published=True)
        self.client.force_login(self.writer)

    def edit(self, **fields):
        return self.client.patch(f'/api/stories/{self.story.id}/edit/', fields, content_type='application/json')

    def test_an_edit_keeps_the_old_text(self):
        self.assertEqual(self.edit(title='Better Title', body='Better text.').status_code, 200)
        self.story.refresh_from_db()
        self.assertEqual((self.story.title, self.story.body), ('Better Title', 'Better text.'))
        history = self.client.get(f'/api/stories/{self.story.id}/versions/').json()
        self.assertEqual((history[0]['title'], history[0]['body']), ('First Title', 'First text.'))

    def test_restore_brings_it_back_and_can_itself_be_undone(self):
        self.edit(body='Second text.')
        first = StoryVersion.objects.get(body='First text.')
        self.client.post(f'/api/stories/{self.story.id}/versions/{first.id}/restore/')
        self.story.refresh_from_db()
        self.assertEqual(self.story.body, 'First text.')
        # The text from before the restore is in the history too.
        self.assertTrue(StoryVersion.objects.filter(story=self.story, body='Second text.').exists())

    def test_saving_without_changes_makes_no_version(self):
        self.edit(title='First Title', body='First text.')
        self.assertFalse(StoryVersion.objects.exists())

    def test_only_the_newest_30_are_kept(self):
        for number in range(35):
            self.edit(body=f'Text number {number}.')
        self.assertEqual(self.story.versions.count(), 30)

    def test_nobody_else_can_edit_or_see_the_history(self):
        User.objects.create_user('stranger', password=PASSWORD)
        self.client.login(username='stranger', password=PASSWORD)
        self.assertEqual(self.edit(body='Mine now.').status_code, 404)
        self.assertEqual(self.client.get(f'/api/stories/{self.story.id}/versions/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/stories/{self.story.id}/edit/').status_code, 404)

    def test_empty_text_is_refused(self):
        self.assertEqual(self.edit(body='   ').status_code, 400)
