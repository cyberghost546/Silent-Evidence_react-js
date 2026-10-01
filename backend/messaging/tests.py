from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import Block
from .models import Message


# Tests for private messages. Run with:  python manage.py test
# (How tests work is explained at the top of accounts/tests.py.)

PASSWORD = 'Str0ng-pass-123'


class MessageTests(TestCase):
    def setUp(self):
        self.me = User.objects.create_user('me', password=PASSWORD)
        self.bob = User.objects.create_user('bob', password=PASSWORD)
        self.client.login(username='me', password=PASSWORD)

    def test_send_and_read_a_conversation(self):
        response = self.client.post('/api/messages/bob/', {'body': 'Hi Bob'})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()['is_mine'])

        thread = self.client.get('/api/messages/bob/').json()
        self.assertEqual([m['body'] for m in thread['messages']], ['Hi Bob'])

    def test_conversation_list_counts_unread(self):
        Message.objects.create(sender=self.bob, recipient=self.me, body='one')
        Message.objects.create(sender=self.bob, recipient=self.me, body='two')

        conversations = self.client.get('/api/messages/').json()
        self.assertEqual(conversations[0]['username'], 'bob')
        self.assertEqual(conversations[0]['unread'], 2)
        self.assertEqual(self.client.get('/api/messages/unread/').json()['unread'], 2)

        # Opening the conversation marks them as read.
        self.client.get('/api/messages/bob/')
        self.assertEqual(self.client.get('/api/messages/unread/').json()['unread'], 0)

    def test_cannot_message_someone_who_blocked_you(self):
        Block.objects.create(blocker=self.bob, blocked=self.me)
        response = self.client.post('/api/messages/bob/', {'body': 'Hi'})
        self.assertEqual(response.status_code, 400)

    def test_empty_message_is_refused(self):
        response = self.client.post('/api/messages/bob/', {'body': '   '})
        self.assertEqual(response.status_code, 400)

    def test_needs_login(self):
        self.client.logout()
        self.assertEqual(self.client.get('/api/messages/').status_code, 403)
