import base64
import io
from contextlib import redirect_stdout
from unittest import mock

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase, override_settings

from accounts.models import PushSubscription
from accounts.notifications import notify


# Tests for phone notifications (web push). Run with:  python manage.py test
#
# No real phone or push service here: the last step (the HTTP request
# to Google/Mozilla) is faked. Everything before it is real.

PASSWORD = 'Str0ng-pass-123'


def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def fresh_keys():
    # Exactly what `python manage.py make_push_keys` prints.
    out = io.StringIO()
    with redirect_stdout(out):
        call_command('make_push_keys', stdout=out)
    lines = dict(line.split('=', 1) for line in out.getvalue().splitlines() if line.startswith('VAPID_') and '=' in line)
    return lines['VAPID_PUBLIC_KEY'], lines['VAPID_PRIVATE_KEY']


def a_browser_subscription():
    # A phone's subscription: a real EC public key + a random secret, like a browser makes.
    key = ec.generate_private_key(ec.SECP256R1())
    public = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return {'endpoint': 'https://push.example.com/send/abc123', 'keys': {'p256dh': b64url(public), 'auth': b64url(b'0123456789abcdef')}}


PUBLIC, PRIVATE = fresh_keys()


@override_settings(VAPID_PUBLIC_KEY=PUBLIC, VAPID_PRIVATE_KEY=PRIVATE, VAPID_CONTACT='mailto:test@example.com')
class PushTests(TestCase):
    def setUp(self):
        self.member = User.objects.create_user('raven', password=PASSWORD)
        self.other = User.objects.create_user('moth', password=PASSWORD)
        self.client.force_login(self.member)

    def subscribe(self):
        return self.client.post('/api/accounts/push/', a_browser_subscription(), content_type='application/json')

    def test_switch_on_and_off_for_a_device(self):
        self.assertEqual(self.client.get('/api/accounts/push/').json()['public_key'], PUBLIC)
        self.assertEqual(self.subscribe().status_code, 201)
        self.assertEqual(PushSubscription.objects.filter(user=self.member).count(), 1)
        self.client.post('/api/accounts/push/unsubscribe/', {'endpoint': 'https://push.example.com/send/abc123'}, content_type='application/json')
        self.assertFalse(PushSubscription.objects.exists())

    def test_a_notification_is_really_sent_with_our_keys(self):
        self.subscribe()
        answer = mock.Mock(status_code=201, text='')
        # Only the final HTTP request is faked - encryption and the VAPID
        # signature with the keys from make_push_keys are done for real.
        with mock.patch('requests.post', return_value=answer) as post:
            notify(self.member, self.other, 'follow', 'moth started following you', '/profile/moth')
        self.assertEqual(post.call_count, 1)
        url = post.call_args.args[0]
        headers = post.call_args.kwargs['headers']
        self.assertEqual(url, 'https://push.example.com/send/abc123')
        self.assertTrue(headers['Authorization'].startswith('vapid t='))   # signed with our private key
        self.assertEqual(headers['content-encoding'], 'aes128gcm')          # the text is encrypted

    def test_a_phone_that_turned_it_off_is_forgotten(self):
        self.subscribe()
        with mock.patch('requests.post', return_value=mock.Mock(status_code=410, text='gone')):
            notify(self.member, self.other, 'follow', 'moth started following you', '/profile/moth')
        self.assertFalse(PushSubscription.objects.exists())

    def test_the_bell_still_works_when_the_push_service_is_down(self):
        self.subscribe()
        with mock.patch('requests.post', side_effect=ConnectionError('push service down')):
            notification = notify(self.member, self.other, 'follow', 'moth started following you', '/profile/moth')
        self.assertIsNotNone(notification)

    def test_rubbish_subscriptions_are_refused(self):
        response = self.client.post('/api/accounts/push/', {'endpoint': 'http://evil.example', 'keys': {}}, content_type='application/json')
        self.assertEqual(response.status_code, 400)


@override_settings(VAPID_PUBLIC_KEY='', VAPID_PRIVATE_KEY='')
class PushSwitchedOffTests(TestCase):
    def test_without_keys_nothing_happens(self):
        user = User.objects.create_user('raven', password=PASSWORD)
        self.client.force_login(user)
        self.assertEqual(self.client.get('/api/accounts/push/').json()['public_key'], '')
        self.assertEqual(self.client.post('/api/accounts/push/', a_browser_subscription(), content_type='application/json').status_code, 400)
