from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import Notification
from stories.models import Chain


# Tests for story chains. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class ChainTests(TestCase):
    def setUp(self):
        self.raven = User.objects.create_user('raven', password=PASSWORD)
        self.moth = User.objects.create_user('moth', password=PASSWORD)

    def start(self):
        self.client.force_login(self.raven)
        return self.client.post('/api/chains/', {'title': 'The House at the End', 'opening': 'The lights came on by themselves.'}, content_type='application/json').json()

    def add(self, user, chain_id, body='Then the door opened.'):
        self.client.force_login(user)
        return self.client.post(f'/api/chains/{chain_id}/', {'body': body}, content_type='application/json')

    def test_members_take_turns(self):
        chain = self.start()
        # raven wrote the opening - raven can't go again straight away.
        self.assertEqual(self.add(self.raven, chain['id']).status_code, 400)
        self.assertEqual(self.add(self.moth, chain['id']).status_code, 201)
        self.assertEqual(self.add(self.raven, chain['id'], 'And closed.').status_code, 201)

        parts = self.client.get(f"/api/chains/{chain['id']}/").json()['parts']
        self.assertEqual([part['author'] for part in parts], ['raven', 'moth', 'raven'])
        self.assertTrue(Notification.objects.filter(recipient=self.raven, kind='chain').exists())

    def test_the_chain_closes_after_the_last_part(self):
        chain = self.start()
        Chain.objects.filter(pk=chain['id']).update(max_parts=2)
        self.add(self.moth, chain['id'])
        self.assertFalse(Chain.objects.get(pk=chain['id']).is_open)
        self.assertEqual(self.add(self.raven, chain['id']).status_code, 400)

    def test_too_long_and_logged_out_are_refused(self):
        chain = self.start()
        self.assertEqual(self.add(self.moth, chain['id'], 'x' * 1501).status_code, 400)
        self.client.logout()
        self.assertEqual(self.client.post(f"/api/chains/{chain['id']}/", {'body': 'hi'}, content_type='application/json').status_code, 403)
