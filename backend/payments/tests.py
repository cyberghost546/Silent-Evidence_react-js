import hashlib
import hmac
import json
import time
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings

from accounts.models import Notification, PremiumMembership, get_profile
from stories.models import Story
from .models import Payment


# Tests for payments (Pro + tips). Run with:  python manage.py test payments
#
# No test ever talks to the real Stripe: fake mode is used, or Stripe's
# answer is pretended with patch(), or we sign webhook messages
# ourselves with a test secret - exactly like Stripe does.

PASSWORD = 'Str0ng-pass-123'
WEBHOOK_SECRET = 'whsec_test_secret'


# Make a "Stripe-Signature" header the same way Stripe does:
# HMAC-SHA256 of "<time>.<the message>" with the webhook secret.
def stripe_signature(payload, secret=WEBHOOK_SECRET):
    timestamp = int(time.time())
    signed = f'{timestamp}.{payload}'.encode()
    signature = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f't={timestamp},v1={signature}'


@override_settings(STRIPE_SECRET_KEY='', PAYMENTS_FAKE_MODE=True)
class FakeModeTests(TestCase):
    def setUp(self):
        self.reader = User.objects.create_user('reader', password=PASSWORD)
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.story = Story.objects.create(title='The Well', body='word ' * 50, author=self.writer, is_published=True)
        self.client.force_login(self.reader)

    def checkout(self, **data):
        return self.client.post('/api/payments/checkout/', data, content_type='application/json')

    def test_plans_show_prices_and_mode(self):
        data = self.client.get('/api/payments/plans/').json()
        self.assertEqual(data['mode'], 'fake')
        self.assertEqual([plan['price'] for plan in data['plans']], ['3.99', '29.99'])
        self.assertEqual(data['tip_amounts'], ['1.00', '3.00', '5.00'])
        self.assertEqual(data['me'], {'is_pro': False, 'pro_ends_at': None})

    def test_buying_pro_switches_it_on(self):
        answer = self.checkout(kind='pro_monthly')
        self.assertEqual(answer.status_code, 201)
        payment_id = answer.json()['payment_id']
        self.assertIn(f'/payment/fake/{payment_id}', answer.json()['url'])
        # Not paid yet -> no Pro.
        self.assertFalse(get_profile(self.reader).is_premium)

        self.assertEqual(self.client.post(f'/api/payments/{payment_id}/fake-pay/').json()['status'], 'paid')
        self.assertTrue(get_profile(self.reader).is_premium)
        membership = PremiumMembership.objects.get(user=self.reader)
        self.assertEqual((membership.plan, membership.amount), ('monthly', Decimal('3.99')))

        # Paying the same payment again does NOT add a second month.
        self.client.post(f'/api/payments/{payment_id}/fake-pay/')
        self.assertEqual(PremiumMembership.objects.filter(user=self.reader).count(), 1)

    def test_a_candle_reaches_the_writer(self):
        answer = self.checkout(kind='tip', story_id=self.story.id, amount='3.00', message='Could not sleep!')
        payment_id = answer.json()['payment_id']
        self.client.post(f'/api/payments/{payment_id}/fake-pay/')

        tip = Payment.objects.get(pk=payment_id)
        self.assertEqual((tip.writer, tip.site_cut, tip.writer_share), (self.writer, Decimal('0.30'), Decimal('2.70')))
        note = Notification.objects.get(recipient=self.writer, kind='tip')
        self.assertIn('€3.00 candle', note.text)
        self.assertIn('Could not sleep!', note.text)

        # The writer sees it on their dashboard...
        self.client.force_login(self.writer)
        data = self.client.get('/api/payments/tips/received/').json()
        self.assertEqual((data['count'], data['earned'], data['waiting']), (1, '2.70', '2.70'))

    def test_only_our_candle_sizes(self):
        self.assertEqual(self.checkout(kind='tip', story_id=self.story.id, amount='0.01').status_code, 400)
        self.assertEqual(self.checkout(kind='tip', story_id=self.story.id, amount='nonsense').status_code, 400)
        self.assertEqual(self.checkout(kind='diamonds').status_code, 400)

    def test_no_candles_for_your_own_story(self):
        self.client.force_login(self.writer)
        self.assertEqual(self.checkout(kind='tip', story_id=self.story.id, amount='1.00').status_code, 400)

    def test_you_cannot_pay_someone_elses_payment(self):
        payment_id = self.checkout(kind='pro_monthly').json()['payment_id']
        self.client.force_login(self.writer)
        self.assertEqual(self.client.post(f'/api/payments/{payment_id}/fake-pay/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/payments/{payment_id}/').status_code, 404)

    def test_must_be_logged_in(self):
        self.client.logout()
        self.assertEqual(self.checkout(kind='pro_monthly').status_code, 403)

    def test_admins_see_what_is_owed_and_mark_it_paid(self):
        payment_id = self.checkout(kind='tip', story_id=self.story.id, amount='5.00').json()['payment_id']
        self.client.post(f'/api/payments/{payment_id}/fake-pay/')

        admin = User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.client.force_login(admin)
        data = self.client.get('/api/dashboard/tips-owed/').json()
        self.assertEqual(data['writers'], [{'writer_id': self.writer.id, 'writer': 'writer', 'tips': 1, 'owed': '4.50'}])
        self.assertEqual(data['site_cut_total'], '0.50')

        self.client.post('/api/dashboard/tips-owed/', {'writer_id': self.writer.id}, content_type='application/json')
        self.assertEqual(self.client.get('/api/dashboard/tips-owed/').json()['writers'], [])

    def test_members_cannot_see_the_admin_page(self):
        self.assertEqual(self.client.get('/api/dashboard/tips-owed/').status_code, 403)


# The live site with no Stripe key: nobody can pay, and the fake
# "pay" button doesn't exist.
@override_settings(STRIPE_SECRET_KEY='', PAYMENTS_FAKE_MODE=False)
class PaymentsOffTests(TestCase):
    def test_off_without_a_key(self):
        user = User.objects.create_user('reader', password=PASSWORD)
        self.client.force_login(user)
        answer = self.client.post('/api/payments/checkout/', {'kind': 'pro_monthly'}, content_type='application/json')
        self.assertEqual(answer.status_code, 503)

        payment = Payment.objects.create(buyer=user, kind='pro_monthly', amount=Decimal('3.99'))
        self.assertEqual(self.client.post(f'/api/payments/{payment.id}/fake-pay/').status_code, 404)
        self.assertFalse(get_profile(user).is_premium)


@override_settings(STRIPE_SECRET_KEY='sk_test_123', STRIPE_WEBHOOK_SECRET=WEBHOOK_SECRET, PAYMENTS_FAKE_MODE=False)
class StripeTests(TestCase):
    def setUp(self):
        self.reader = User.objects.create_user('reader', password=PASSWORD, email='reader@example.com')
        self.client.force_login(self.reader)

    # Pretend Stripe made a payment page - no internet needed.
    def start_checkout(self):
        fake_session = SimpleNamespace(id='cs_test_abc', url='https://checkout.stripe.com/c/pay/cs_test_abc')
        with patch('stripe.checkout._session_service.SessionService.create', return_value=fake_session) as create:
            answer = self.client.post('/api/payments/checkout/', {'kind': 'pro_yearly'}, content_type='application/json')
        return answer, create

    def send_webhook(self, payment, amount_total=2999, session_id='cs_test_abc', secret=WEBHOOK_SECRET):
        payload = json.dumps({
            'id': 'evt_1', 'object': 'event', 'type': 'checkout.session.completed',
            'data': {'object': {
                'id': session_id, 'object': 'checkout.session', 'payment_status': 'paid',
                'client_reference_id': str(payment.id), 'amount_total': amount_total,
            }},
        })
        return self.client.post(
            '/api/payments/stripe-webhook/', payload, content_type='application/json',
            HTTP_STRIPE_SIGNATURE=stripe_signature(payload, secret),
        )

    def test_checkout_asks_stripe_for_the_right_price(self):
        answer, create = self.start_checkout()
        self.assertEqual(answer.status_code, 201)
        self.assertEqual(answer.json()['url'], 'https://checkout.stripe.com/c/pay/cs_test_abc')
        params = create.call_args.kwargs['params']
        self.assertEqual(params['line_items'][0]['price_data']['unit_amount'], 2999)
        self.assertEqual(params['line_items'][0]['price_data']['currency'], 'eur')
        self.assertEqual(Payment.objects.get().stripe_session_id, 'cs_test_abc')

    def test_a_signed_webhook_switches_pro_on_once(self):
        self.start_checkout()
        payment = Payment.objects.get()
        self.assertEqual(self.send_webhook(payment).status_code, 200)
        self.assertTrue(get_profile(self.reader).is_premium)
        # Stripe sends it again -> still only one year.
        self.send_webhook(payment)
        self.assertEqual(PremiumMembership.objects.filter(user=self.reader).count(), 1)

    def test_a_fake_webhook_is_refused(self):
        self.start_checkout()
        payment = Payment.objects.get()
        self.assertEqual(self.send_webhook(payment, secret='whsec_wrong').status_code, 400)
        self.assertFalse(get_profile(self.reader).is_premium)

    def test_wrong_amount_or_session_does_nothing(self):
        self.start_checkout()
        payment = Payment.objects.get()
        self.send_webhook(payment, amount_total=1)
        self.send_webhook(payment, session_id='cs_test_someone_else')
        self.assertFalse(get_profile(self.reader).is_premium)
        self.assertEqual(Payment.objects.get().status, 'pending')
