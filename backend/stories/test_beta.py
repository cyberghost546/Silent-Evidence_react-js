from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import Notification
from stories.models import Story


# Tests for beta readers. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class BetaReaderTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.reader = User.objects.create_user('reader', password=PASSWORD)
        self.stranger = User.objects.create_user('stranger', password=PASSWORD)
        self.draft = Story.objects.create(title='Not Finished Yet', body='The draft text.', author=self.writer, is_published=False)

    def invite(self, username='reader'):
        self.client.force_login(self.writer)
        return self.client.post(f'/api/stories/{self.draft.id}/beta/', {'username': username}, content_type='application/json')

    def open_draft(self, user):
        self.client.force_login(user)
        return self.client.get(f'/api/stories/{self.draft.id}/')

    def test_only_invited_readers_can_open_the_draft(self):
        self.assertEqual(self.open_draft(self.reader).status_code, 404)
        self.invite()
        response = self.open_draft(self.reader)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['is_draft'])
        self.assertEqual(self.open_draft(self.stranger).status_code, 404)
        self.client.logout()
        self.assertEqual(self.client.get(f'/api/stories/{self.draft.id}/').status_code, 404)
        self.assertTrue(Notification.objects.filter(recipient=self.reader, kind='beta').exists())

    def test_writer_can_preview_their_own_draft_without_counting_a_view(self):
        self.assertEqual(self.open_draft(self.writer).status_code, 200)
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.views, 0)

    def test_feedback_is_private_to_writer_and_reader(self):
        self.invite()
        self.client.force_login(self.reader)
        response = self.client.post(f'/api/stories/{self.draft.id}/beta/feedback/', {'body': 'The ending is too fast.'}, content_type='application/json')
        self.assertEqual(response.status_code, 201)

        # The writer sees it on their beta page.
        self.client.force_login(self.writer)
        feedback = self.client.get(f'/api/stories/{self.draft.id}/beta/').json()['feedback']
        self.assertEqual([item['body'] for item in feedback], ['The ending is too fast.'])

        # Someone who wasn't invited can't send feedback or read the list.
        self.client.force_login(self.stranger)
        self.assertEqual(self.client.post(f'/api/stories/{self.draft.id}/beta/feedback/', {'body': 'hi'}, content_type='application/json').status_code, 404)
        self.assertEqual(self.client.get(f'/api/stories/{self.draft.id}/beta/').status_code, 404)

    def test_removing_a_reader_closes_the_door(self):
        self.invite()
        self.client.force_login(self.writer)
        self.client.delete(f'/api/stories/{self.draft.id}/beta/reader/')
        self.assertEqual(self.open_draft(self.reader).status_code, 404)

    def test_unknown_or_self_invites_are_refused(self):
        self.assertEqual(self.invite('nobody').status_code, 400)
        self.assertEqual(self.invite('writer').status_code, 400)
