from decimal import Decimal

from django.conf import settings


# ---------------------------------------------------------------
# PRICES - everything that costs money, in ONE place.
# Want to change a price? Change it here and nothing else.
#
# Prices are Decimal('3.99'), not 3.99 - see Payment.amount for why.
# ---------------------------------------------------------------

# The two ways to buy Pro. Both are ONE payment (not a subscription
# that renews by itself): you pay, you get 30 or 365 days. Paying
# again while it's still running adds the days on the end
# (accounts/premium.py -> grant_premium).
PRO_PLANS = {
    'pro_monthly': {
        'label': 'Pro - 1 month',
        'price': Decimal('3.99'),
        # The matching PremiumMembership.plan (accounts/models.py).
        'membership_plan': 'monthly',
    },
    'pro_yearly': {
        'label': 'Pro - 1 year',
        'price': Decimal('29.99'),
        'membership_plan': 'yearly',
    },
}

# The candle sizes a reader can pick on a story.
TIP_AMOUNTS = [Decimal('1.00'), Decimal('3.00'), Decimal('5.00')]

# How much of each tip the site keeps (the rest is the writer's).
SITE_CUT_PERCENT = 10


# 3.00 -> 0.30. quantize(...) = round to whole cents.
def site_cut_for(amount):
    return (amount * SITE_CUT_PERCENT / 100).quantize(Decimal('0.01'))


# Stripe counts money in CENTS, as a whole number: 3.99 -> 399.
def to_cents(amount):
    return int(amount * 100)


# Which way payments work right now:
#   'stripe' - real Stripe (a STRIPE_SECRET_KEY is set)
#   'fake'   - on your computer with no Stripe key: a pretend
#              payment page, so you can try everything for free
#   'off'    - the live site without a key: nobody can pay
def payment_mode():
    if settings.STRIPE_SECRET_KEY:
        return 'stripe'
    if settings.PAYMENTS_FAKE_MODE:
        return 'fake'
    return 'off'


# 3 -> "€3.00" (the sign for settings.CURRENCY), for notifications.
CURRENCY_SIGNS = {'EUR': '€', 'USD': '$', 'GBP': '£'}


def money_label(amount):
    sign = CURRENCY_SIGNS.get(settings.CURRENCY, settings.CURRENCY + ' ')
    return f'{sign}{amount:.2f}'
