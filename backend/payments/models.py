from django.conf import settings
from django.db import models


# ---------------------------------------------------------------
# PAYMENT - one row every time someone starts paying for something:
#   - Pro for a month or a year (kind 'pro_monthly' / 'pro_yearly')
#   - a tip for a writer, a "candle" (kind 'tip')
#
# The row is made BEFORE the person pays (status 'pending'), so we
# can send its id to Stripe. When Stripe tells us the money arrived
# (the webhook, see views.py) it becomes 'paid' and we hand over
# what was bought (fulfil.py).
#
# Someone who closes the payment page never pays - their row just
# stays 'pending' forever. That's fine, it costs nothing.
# ---------------------------------------------------------------
class Payment(models.Model):
    KINDS = [
        ('pro_monthly', 'Pro - 1 month'),
        ('pro_yearly', 'Pro - 1 year'),
        ('tip', 'Tip (a candle)'),
    ]
    STATUSES = [
        ('pending', 'Waiting for payment'),
        ('paid', 'Paid'),
    ]

    # Who paid. SET_NULL: if they delete their account, the record of
    # the money stays (we still need it for the books).
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='payments')
    kind = models.CharField(max_length=12, choices=KINDS)
    # DecimalField for money - never FloatField (0.1 + 0.2 != 0.3 with floats).
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUSES, default='pending')

    # --- Only for tips ---
    writer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='tips_received')
    story = models.ForeignKey('stories.Story', on_delete=models.SET_NULL, null=True, blank=True, related_name='tips')
    # A short note to the writer ("Couldn't sleep after this one!").
    message = models.CharField(max_length=200, blank=True)
    # The part the site keeps (prices.py -> SITE_CUT_PERCENT).
    site_cut = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    # When an admin sent the writer their share (Revenue page).
    # Empty = we still owe it to them.
    paid_out_at = models.DateTimeField(null=True, blank=True)

    # Stripe's id for the payment page ("cs_test_..."). Empty in fake mode.
    stripe_session_id = models.CharField(max_length=255, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'#{self.id} {self.kind} {self.amount} ({self.status})'

    # What the writer gets from a tip, after the site's part.
    @property
    def writer_share(self):
        return self.amount - self.site_cut
