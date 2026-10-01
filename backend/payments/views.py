from decimal import Decimal, InvalidOperation

import stripe
from django.conf import settings
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import PremiumMembership, get_profile
from moderation.content_filter import check_text, BLOCKED_MESSAGE
from stories.models import stories_for
from .fulfil import fulfil_payment
from .models import Payment
from .prices import PRO_PLANS, TIP_AMOUNTS, SITE_CUT_PERCENT, payment_mode, site_cut_for, to_cents


# ---------------------------------------------------------------
# PAYMENTS - Pro and tips ("candles").
#
# How a payment goes, step by step:
#   1. React asks POST /api/payments/checkout/ { kind: 'pro_monthly' }
#   2. We save a Payment row ('pending') and ask Stripe for a payment
#      page. React sends the browser there.
#   3. The person pays ON STRIPE'S PAGE - card numbers never touch
#      our site, so we never have to keep them safe.
#   4. Stripe sends the browser back to /payment/done/<id> ...
#   5. ...and, separately, tells Django "it's paid" (the webhook,
#      StripeWebhookView). ONLY the webhook switches Pro on: the
#      browser coming back proves nothing - anyone can type that URL.
#
# On your computer without a Stripe key (payment_mode() == 'fake'),
# step 2 sends you to OUR pretend page instead, with a "Pay (fake)"
# button that does step 5 (FakePayView).
#
# The keys (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) come from the
# host's settings - never from the code. See DEPLOY.md.
# ---------------------------------------------------------------


def money(value):
    # 3.9 -> "3.90"   (always 2 decimals, as text, for React)
    return str(Decimal(value or 0).quantize(Decimal('0.01')))


# When does my Pro end? None = not Pro. 'lifetime' = never ends.
def pro_ends_at(user):
    running = [m for m in PremiumMembership.objects.filter(user=user) if m.is_active()]
    if not running:
        return None
    if any(m.ends_at is None for m in running):
        return 'lifetime'
    # Paid twice? The second one starts when the first ends, so the
    # latest end date is the real one.
    future = PremiumMembership.objects.filter(user=user, cancelled_at__isnull=True, ends_at__gt=timezone.now())
    return max(m.ends_at for m in future)


# GET /api/payments/plans/ - the prices, for the Pro page and the
# candle box. Anyone can look.
class PlansView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        me = None
        if user.is_authenticated:
            me = {'is_pro': get_profile(user).is_premium, 'pro_ends_at': pro_ends_at(user)}
        return Response({
            'mode': payment_mode(),
            'currency': settings.CURRENCY,
            'plans': [
                {'kind': kind, 'label': plan['label'], 'price': money(plan['price'])}
                for kind, plan in PRO_PLANS.items()
            ],
            'tip_amounts': [money(amount) for amount in TIP_AMOUNTS],
            'site_cut_percent': SITE_CUT_PERCENT,
            'me': me,
        })


# POST /api/payments/checkout/
#   Pro: { kind: 'pro_monthly' }  or  { kind: 'pro_yearly' }
#   Tip: { kind: 'tip', story_id: 5, amount: '3.00', message: '...' }
# -> { url: 'https://checkout.stripe.com/...' }  (or our fake page)
class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        mode = payment_mode()
        if mode == 'off':
            return Response({'detail': 'Payments are not switched on yet.'}, status=503)

        user = request.user
        kind = request.data.get('kind')
        site_url = settings.SITE_URL

        if kind in PRO_PLANS:
            payment = Payment.objects.create(buyer=user, kind=kind, amount=PRO_PLANS[kind]['price'])
            product_name = f'Silent Evidence {PRO_PLANS[kind]["label"]}'
            cancel_url = f'{site_url}/premium'

        elif kind == 'tip':
            # Only a story this person may see (stories_for) - and the
            # writer must be someone else.
            story = get_object_or_404(stories_for(user), pk=request.data.get('story_id'))
            if story.author_id == user.id:
                return Response({'detail': "You can't light a candle for your own story."}, status=400)

            # The amount must be one of OUR candle sizes - never trust a
            # number sent by the browser (someone could send 0.01).
            try:
                amount = Decimal(str(request.data.get('amount')))
            except (InvalidOperation, TypeError):
                return Response({'detail': 'Pick a candle.'}, status=400)
            if amount not in TIP_AMOUNTS:
                return Response({'detail': 'Pick a candle.'}, status=400)

            message = (request.data.get('message') or '').strip()[:200]
            if message and check_text(message)[0] == 'block':
                return Response({'detail': BLOCKED_MESSAGE}, status=400)

            payment = Payment.objects.create(
                buyer=user, kind='tip', amount=amount, writer=story.author, story=story,
                message=message, site_cut=site_cut_for(amount),
            )
            product_name = f'A candle for {story.author.username} ("{story.title[:60]}")'
            cancel_url = f'{site_url}/stories/{story.id}'

        else:
            return Response({'detail': 'Unknown thing to buy.'}, status=400)

        # Where the browser lands after paying (PaymentDonePage in React).
        done_url = f'{site_url}/payment/done/{payment.id}'

        if mode == 'fake':
            return Response({'url': f'{site_url}/payment/fake/{payment.id}', 'payment_id': payment.id}, status=201)

        # --- Real Stripe: make a Checkout page for this one payment ---
        client = stripe.StripeClient(settings.STRIPE_SECRET_KEY)
        try:
            session = client.v1.checkout.sessions.create(params={
                'mode': 'payment',
                'line_items': [{
                    'quantity': 1,
                    'price_data': {
                        'currency': settings.CURRENCY.lower(),   # Stripe wants 'eur'
                        'unit_amount': to_cents(payment.amount),
                        'product_data': {'name': product_name},
                    },
                }],
                # Our Payment id goes along, so the webhook knows which row it is.
                'client_reference_id': str(payment.id),
                'customer_email': user.email or None,
                'success_url': done_url,
                'cancel_url': cancel_url,
            })
        except stripe.StripeError:
            return Response({'detail': 'Could not reach the payment service. Try again in a minute.'}, status=502)

        payment.stripe_session_id = session.id
        payment.save()
        return Response({'url': session.url, 'payment_id': payment.id}, status=201)


def payment_data(payment):
    return {
        'id': payment.id,
        'kind': payment.kind,
        'amount': money(payment.amount),
        'status': payment.status,
        'story_id': payment.story_id,
        'story_title': payment.story.title if payment.story else None,
        'writer': payment.writer.username if payment.writer else None,
    }


# GET /api/payments/<id>/ - "is it paid yet?" for the page you land
# on after paying. Only your own payments.
class PaymentStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        payment = get_object_or_404(Payment, pk=pk, buyer=request.user)
        return Response(payment_data(payment))


# POST /api/payments/<id>/fake-pay/ - the "Pay (fake)" button.
# ONLY works in fake mode (your computer, no Stripe key). On the live
# site this answers 404, as if it didn't exist.
class FakePayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if payment_mode() != 'fake':
            return Response({'detail': 'Not found.'}, status=404)
        payment = get_object_or_404(Payment, pk=pk, buyer=request.user)
        payment = fulfil_payment(payment.id)
        return Response(payment_data(payment))


# POST /api/payments/stripe-webhook/ - STRIPE calls this, not a person.
#
# Anyone on the internet could POST here pretending to be Stripe, so
# construct_event() checks the signature: Stripe signs every message
# with STRIPE_WEBHOOK_SECRET, and only Stripe and we know it.
#
# authentication_classes = []: no login and no CSRF check here
# (Stripe has neither) - the signature is our check instead.
class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        secret = settings.STRIPE_WEBHOOK_SECRET
        if not secret:
            return Response({'detail': 'Webhook not set up.'}, status=503)

        try:
            event = stripe.Webhook.construct_event(
                request.body, request.META.get('HTTP_STRIPE_SIGNATURE'), secret,
            )
        except (ValueError, stripe.SignatureVerificationError):
            # Not JSON, or not signed by Stripe.
            return Response({'detail': 'Bad signature.'}, status=400)

        # The two messages that mean "the money arrived". (The second
        # one is for slower payment types like bank transfers.)
        if event.type in ('checkout.session.completed', 'checkout.session.async_payment_succeeded'):
            session = event.data.object
            if session.payment_status == 'paid':
                # Find OUR row: the id we sent along, AND the same Stripe
                # page id - so one real payment can't unlock another row.
                payment = Payment.objects.filter(
                    pk=session.client_reference_id, stripe_session_id=session.id,
                ).first()
                # The amount must match too (in cents).
                if payment and session.amount_total == to_cents(payment.amount):
                    fulfil_payment(payment.id)

        # 200 = "got it". For other kinds of messages too - otherwise
        # Stripe keeps retrying them for days.
        return Response({'received': True})


# GET /api/payments/tips/received/ - a writer's candles, for the
# Author Dashboard.
class TipsReceivedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tips = Payment.objects.filter(kind='tip', status='paid', writer=request.user)
        total = tips.aggregate(total=Sum('amount'), cut=Sum('site_cut'))
        waiting = tips.filter(paid_out_at__isnull=True).aggregate(total=Sum('amount'), cut=Sum('site_cut'))
        return Response({
            'count': tips.count(),
            # The writer's part = amount - site cut.
            'earned': money((total['total'] or 0) - (total['cut'] or 0)),
            'waiting': money((waiting['total'] or 0) - (waiting['cut'] or 0)),
            'site_cut_percent': SITE_CUT_PERCENT,
            'recent': [
                {
                    'id': tip.id,
                    'amount': money(tip.amount),
                    'from': tip.buyer.username if tip.buyer else 'A deleted account',
                    'story_id': tip.story_id,
                    'story_title': tip.story.title if tip.story else '(deleted story)',
                    'message': tip.message,
                    'paid_at': tip.paid_at,
                }
                for tip in tips.select_related('buyer', 'story').order_by('-paid_at')[:20]
            ],
        })


# ADMINS: what we owe each writer from tips (their share, not paid
# out yet), and a button to say "sent".
#   GET  /api/dashboard/tips-owed/
#   POST /api/dashboard/tips-owed/  { writer_id: 5 }  -> mark all of theirs as paid out
class TipsOwedView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        owed = {}
        unpaid = Payment.objects.filter(kind='tip', status='paid', paid_out_at__isnull=True, writer__isnull=False)
        for tip in unpaid.select_related('writer'):
            # setdefault: make the writer's entry the first time we see them.
            row = owed.setdefault(tip.writer_id, {'writer_id': tip.writer_id, 'writer': tip.writer.username, 'tips': 0, 'owed': Decimal('0')})
            row['tips'] += 1
            row['owed'] += tip.writer_share

        paid_tips = Payment.objects.filter(kind='tip', status='paid')
        totals = paid_tips.aggregate(total=Sum('amount'), cut=Sum('site_cut'))
        rows = sorted(owed.values(), key=lambda row: row['owed'], reverse=True)
        return Response({
            'writers': [{**row, 'owed': money(row['owed'])} for row in rows],
            'tips_total': money(totals['total']),
            'site_cut_total': money(totals['cut']),
            'tip_count': paid_tips.count(),
        })

    def post(self, request):
        writer_id = request.data.get('writer_id')
        updated = Payment.objects.filter(
            kind='tip', status='paid', paid_out_at__isnull=True, writer_id=writer_id,
        ).update(paid_out_at=timezone.now())
        return Response({'marked': updated})
