import re

from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import TestCase


# Tests for "Forgot password?". Run with:  python manage.py test
#
# mail.outbox: during tests Django doesn't send emails - it collects
# them in this list, so we can read the link inside.

PASSWORD = 'Str0ng-pass-123'
NEW_PASSWORD = 'Brand-new-pass-456'


class PasswordResetTests(TestCase):
    def setUp(self):
        cache.clear()   # the reset limit counts in the cache
        self.user = User.objects.create_user('raven', email='raven@example.com', password=PASSWORD)

    def ask_for_link(self, email='raven@example.com'):
        return self.client.post('/api/accounts/password-reset/', {'email': email}, content_type='application/json')

    def link_parts(self):
        # ".../reset-password/<uid>/<token>" -> (uid, token)
        match = re.search(r'/reset-password/([^/\s]+)/([^/\s]+)', mail.outbox[-1].body)
        return match.group(1), match.group(2)

    def confirm(self, uid, token, password=NEW_PASSWORD):
        return self.client.post('/api/accounts/password-reset/confirm/', {
            'uid': uid, 'token': token, 'password': password,
        }, content_type='application/json')

    def test_the_link_changes_the_password_once(self):
        self.assertEqual(self.ask_for_link().status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        uid, token = self.link_parts()

        self.assertEqual(self.confirm(uid, token).status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))

        # The same link again: refused (the password changed, so the token did too).
        self.assertEqual(self.confirm(uid, token, 'Another-pass-789').status_code, 400)

    def test_unknown_email_gets_the_same_answer_and_no_email(self):
        known = self.ask_for_link().json()
        unknown = self.ask_for_link('nobody@example.com').json()
        self.assertEqual(known, unknown)          # no hint who has an account
        self.assertEqual(len(mail.outbox), 1)     # only the real one got mail

    def test_weak_new_password_is_refused(self):
        self.ask_for_link()
        uid, token = self.link_parts()
        response = self.confirm(uid, token, '123')
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.json())

    def test_made_up_link_is_refused(self):
        self.assertEqual(self.confirm('MQ', 'not-a-real-token').status_code, 400)
        self.assertEqual(self.confirm('garbage!!', 'x').status_code, 400)
