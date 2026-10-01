from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import LoginEvent


# ---------------------------------------------------------------
# LOGIN SECURITY - used by LogInView (accounts/views.py).
#
# 1. Every login attempt is saved as a LoginEvent (Login Logs page).
# 2. Too many FAILED attempts in a short time = locked for a while.
#    This stops someone from trying thousands of passwords
#    ("brute force"). Two separate limits:
#      - per account:  5 failures on the same username
#      - per IP:      10 failures from the same computer (any names)
#    The lock lifts by itself when the old failures are more than
#    lock_minutes old - or an admin presses "Unlock" (Security page).
#
# The three numbers live in the database (SiteSettings), so admins
# can change them on the Rate Limits page without touching code.
# ---------------------------------------------------------------

def login_limits():
    # Imported here, not at the top: dashboard.models imports from
    # this file's app, and a top-level import would go round in a circle.
    from dashboard.models import SiteSettings
    site = SiteSettings.load()
    return {
        'max_failures_per_username': site.login_max_per_username,
        'max_failures_per_ip': site.login_max_per_ip,
        'lock_minutes': site.login_lock_minutes,
    }


# Where did the request come from? REMOTE_ADDR is the address of
# whoever connected to Django - on your computer, that's the visitor.
#
# On the live site, requests pass through the host's servers first
# (TRUSTED_PROXY_COUNT in settings.py says how many). Each one adds
# the address it saw to the end of the X-Forwarded-For header:
#     X-Forwarded-For: <maybe fake>, <visitor>, <proxy 1>
# We count TRUSTED_PROXY_COUNT from the END, because the START can
# be typed by the visitor themselves - trusting it would let anyone
# pretend to be any IP (and dodge the login lock or the blocklist).
def client_ip(request):
    count = getattr(settings, 'TRUSTED_PROXY_COUNT', 0)
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if count and forwarded:
        addresses = [part.strip() for part in forwarded.split(',') if part.strip()]
        if len(addresses) >= count:
            return addresses[-count]
    return request.META.get('REMOTE_ADDR')


def record_login(request, username, user, success):
    LoginEvent.objects.create(
        user=user,
        username=username[:150],
        success=success,
        ip_address=client_ip(request),
        # [:300] = cut off very long browser descriptions.
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:300],
    )


# The failures that still count: recent, and not unlocked by an admin.
def recent_failures():
    since = timezone.now() - timedelta(minutes=login_limits()['lock_minutes'])
    return LoginEvent.objects.filter(success=False, counts_for_lockout=True, created_at__gte=since)


# "Is this username or this IP locked right now?"
# iexact: 'Bob' and 'bob' count as the same name.
def is_locked(username, ip):
    limits = login_limits()
    failures = recent_failures()
    too_many_for_name = failures.filter(username__iexact=username).count() >= limits['max_failures_per_username']
    too_many_for_ip = ip is not None and failures.filter(ip_address=ip).count() >= limits['max_failures_per_ip']
    return too_many_for_name or too_many_for_ip


# Admin pressed "Unlock": the recent failures stop counting.
# (We don't delete them - they stay visible in Login Logs.)
def unlock(username='', ip=''):
    failures = recent_failures()
    if username:
        failures.filter(username__iexact=username).update(counts_for_lockout=False)
    if ip:
        failures.filter(ip_address=ip).update(counts_for_lockout=False)


# Everything that's locked right now, for the Security page:
#   { 'usernames': [ {'value': 'bob', 'failures': 6} ], 'ips': [...] }
def current_locks():
    limits = login_limits()
    failures = recent_failures()

    def over_limit(field, limit):
        counts = {}
        for value in failures.exclude(**{f'{field}__isnull': True}).values_list(field, flat=True):
            # Usernames: count 'Bob' and 'bob' together.
            key = value.lower() if field == 'username' else value
            counts[key] = counts.get(key, 0) + 1
        return [{'value': key, 'failures': n} for key, n in counts.items() if n >= limit]

    return {
        'usernames': over_limit('username', limits['max_failures_per_username']),
        'ips': over_limit('ip_address', limits['max_failures_per_ip']),
    }

