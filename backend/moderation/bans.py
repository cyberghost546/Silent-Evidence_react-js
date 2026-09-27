from django.utils import timezone

from .models import Ban


# ---------------------------------------------------------------
# BANS - the helpers the views use (Warnings & Bans page, LogInView).
#
# While a ban runs, the account is also is_active=False. Django then
# refuses the account everywhere: its login cookie stops working
# (they're logged out on every device) and authenticate() refuses it.
# ---------------------------------------------------------------

# The ban that's running now for this user, or None.
def active_ban(user):
    for ban in Ban.objects.filter(user=user, lifted_at__isnull=True):
        if ban.is_active():
            return ban
    return None


def ban_user(user, reason, until, issued_by):
    ban = Ban.objects.create(user=user, reason=reason, until=until, issued_by=issued_by)
    user.is_active = False
    user.save()
    return ban


def lift_ban(ban):
    ban.lifted_at = timezone.now()
    ban.save()
    # Only switch the account back on if no OTHER ban is still running.
    if active_ban(ban.user) is None:
        ban.user.is_active = True
        ban.user.save()


# Called when someone tries to log in: a ban whose `until` has
# passed switches the account back on by itself - no admin needed.
# (Only for accounts that were switched off BY a ban; an account
# with no bans at all is left alone.)
def refresh_ban_status(user):
    if not user.is_active and Ban.objects.filter(user=user).exists() and active_ban(user) is None:
        user.is_active = True
        user.save()


# What the Log In page shows to a banned member.
def ban_message(ban):
    if ban.until is None:
        return 'This account has been banned permanently.'
    # %Z = the time zone's name (e.g. UTC), so nobody misreads the hour.
    return f'This account is banned until {timezone.localtime(ban.until):%d %B %Y, %H:%M %Z}.'
