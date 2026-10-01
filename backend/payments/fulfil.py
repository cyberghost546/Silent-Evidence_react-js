from django.db import transaction
from django.utils import timezone

from accounts.notifications import notify, short_title
from accounts.premium import grant_premium
from .models import Payment
from .prices import PRO_PLANS, money_label


# ---------------------------------------------------------------
# fulfil_payment() - the money arrived, now hand over what was bought.
#
#   Pro  -> a PremiumMembership (the same thing an admin makes by hand
#           on the Premium Members page), so the PRO perks switch on
#   Tip  -> tell the writer they got a candle
#
# Called by the Stripe webhook (views.py), or by the fake payment
# page on your computer.
#
# Stripe may send the SAME "it's paid" message twice (it retries if
# our answer was slow). So: if the payment is already 'paid', do
# nothing - otherwise someone could get two months for one payment.
#
# select_for_update() locks the row until we're done, so two copies
# of the message arriving at the same moment can't BOTH see 'pending'.
# (transaction.atomic = all of it happens, or none of it does.)
# ---------------------------------------------------------------
@transaction.atomic
def fulfil_payment(payment_id):
    payment = Payment.objects.select_for_update().get(pk=payment_id)
    if payment.status == 'paid':
        return payment

    payment.status = 'paid'
    payment.paid_at = timezone.now()
    payment.save()

    buyer = payment.buyer
    if buyer is None:
        # They deleted their account in the minute between paying and
        # this message. The money is recorded; there's nobody to give it to.
        return payment

    if payment.kind in PRO_PLANS:
        grant_premium(
            buyer,
            PRO_PLANS[payment.kind]['membership_plan'],
            payment.amount,
            note=f'Paid online (payment #{payment.id})',
            created_by=None,   # nobody - the site did it by itself
        )

    elif payment.kind == 'tip' and payment.writer is not None:
        story_title = short_title(payment.story.title) if payment.story else 'your story'
        text = f'{buyer.username} lit a {money_label(payment.amount)} candle for "{story_title}"'
        if payment.message:
            text += f': "{payment.message}"'
        link = f'/stories/{payment.story_id}' if payment.story_id else '/author'
        notify(payment.writer, buyer, 'tip', text, link)

    return payment
