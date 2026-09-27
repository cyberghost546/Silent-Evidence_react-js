import re

from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import TestCase

from accounts.models import get_profile


# Tests for "confirm your email". Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class EmailVerificationTests(TestCase):
    def setUp(self):
        cache.clear()   # sign-up and "send again" limits count in the cache

    def sign_up(self):
        return self.client.post('/api/accounts/signup/', {
            'username': 'raven', 'email': 'raven@example.com', 'password': PASSWORD,
        }, content_type='application/json')

    def link_parts(self):
        match = re.search(r'/verify-email/([^/\s]+)/([^/\s]+)', mail.outbox[-1].body)
        return {'uid': match.group(1), 'token': match.group(2)}

    def verify(self, parts):
        return self.client.post('/api/accounts/verify-email/', parts, content_type='application/json')

    def test_sign_up_sends_a_link_that_confirms_the_address(self):
        response = self.sign_up()
        self.assertFalse(response.json()['email_verified'])
        self.assertEqual(mail.outbox[-1].to, ['raven@example.com'])

        # Works even after logging out (you might open it on your phone).
        self.client.logout()
        self.assertEqual(self.verify(self.link_parts()).status_code, 200)
        self.assertTrue(get_profile(User.objects.get(username='raven')).email_verified)

    def test_link_survives_logging_in_again(self):
        # The reason we have our own token generator: Django's default
        # one would break as soon as last_login changes.
        self.sign_up()
        parts = self.link_parts()
        self.client.logout()
        self.client.post('/api/accounts/login/', {'username': 'raven', 'password': PASSWORD}, content_type='application/json')
        self.assertEqual(self.verify(parts).status_code, 200)

    def test_made_up_token_is_refused(self):
        self.sign_up()
        parts = self.link_parts()
        parts['token'] = 'nope-123'
        self.assertEqual(self.verify(parts).status_code, 400)
        self.assertFalse(get_profile(User.objects.get(username='raven')).email_verified)

    def test_send_again_button(self):
        self.sign_up()   # logs us in
        before = len(mail.outbox)
        self.assertEqual(self.client.post('/api/accounts/verify-email/resend/').status_code, 200)
        self.assertEqual(len(mail.outbox), before + 1)

    def test_newsletter_skips_unconfirmed_addresses(self):
        self.sign_up()
        boss = User.objects.create_user('boss', 'boss@example.com', PASSWORD, is_staff=True)
        self.client.force_login(boss)
        response = self.client.post('/api/dashboard/newsletter/', {'subject': 'Hi', 'body': 'News'}, content_type='application/json')
        self.assertNotIn('raven@example.com', [address for message in mail.outbox for address in message.to if message.subject == 'Hi'])
        self.assertEqual(response.status_code, 201)
