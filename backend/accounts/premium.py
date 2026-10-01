from datetime import timedelta

from django.utils import timezone

from .models import PremiumMembership, get_profile


# ---------------------------------------------------------------
# PREMIUM - the helpers behind Admin Dashboard -> Premium Members.
#
# Profile.is_premium is what the site checks (the PRO badge...).
# It follows the memberships: ON while a membership runs, OFF after
# the last one ended or was cancelled.
#
# Members with NO membership rows are left alone - their PRO badge
# may have been switched on by hand on the Users page.
# ---------------------------------------------------------------

# ---------------------------------------------------------------
# THE PRO LOOKS - what other people see.
#
# A name colour or a Pro border stays SAVED when someone's Pro runs
# out (so it comes back if they buy again), but it's only SHOWN while
# they're Pro. These two helpers do that check, so every page agrees.
# ---------------------------------------------------------------
PRO_BORDERS = {'gold'}


# { is_pro: True, name_color: 'ember' } - for a name next to a
# comment, a story, a profile...
def pro_look(profile):
    return {
        'is_pro': profile.is_premium,
        'name_color': profile.name_color if profile.is_premium else '',
    }


# The border to SHOW: a Pro one falls back to 'none' when not Pro.
def shown_border(profile):
    if profile.avatar_border in PRO_BORDERS and not profile.is_premium:
        return 'none'
    return profile.avatar_border


# How long each plan lasts. None = forever.
PLAN_DAYS = {'monthly': 30, 'yearly': 365, 'lifetime': None}


def refresh_premium(user):
    memberships = PremiumMembership.objects.filter(user=user)
    if not memberships.exists():
        return
    is_premium = any(membership.is_active() for membership in memberships)
    profile = get_profile(user)
    if profile.is_premium != is_premium:
        profile.is_premium = is_premium
        profile.save()


# Give (or extend) premium. A new paid month on top of one that's
# still running starts when the running one ENDS - so nobody loses
# days by paying early.
def grant_premium(user, plan, amount, note, created_by, gift_days=30):
    now = timezone.now()
    running = [m for m in PremiumMembership.objects.filter(user=user) if m.is_active() and m.ends_at]
    starts_at = max([m.ends_at for m in running], default=now)

    days = gift_days if plan == 'gift' else PLAN_DAYS[plan]
    ends_at = None if days is None else starts_at + timedelta(days=days)

    membership = PremiumMembership.objects.create(
        user=user, plan=plan, amount=amount, note=note,
        starts_at=starts_at, ends_at=ends_at, created_by=created_by,
    )
    refresh_premium(user)
    return membership


def cancel_membership(membership):
    membership.cancelled_at = timezone.now()
    membership.save()
    refresh_premium(membership.user)
