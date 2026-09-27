import json

from django.http import JsonResponse

from moderation.security import client_ip
from .models import SiteSettings, BlockedIP, AuditEntry


# ---------------------------------------------------------------
# MIDDLEWARE = code that runs on EVERY request, before (and after)
# the view. Django calls them in the order of MIDDLEWARE in
# settings.py - these two come after AuthenticationMiddleware, so
# request.user is already known.
#
# The shape is always the same:
#
#     class Something:
#         def __init__(self, get_response):   # once, when Django starts
#             self.get_response = get_response
#
#         def __call__(self, request):        # once per request
#             ...before the view...
#             response = self.get_response(request)   # <- the view runs
#             ...after the view...
#             return response
# ---------------------------------------------------------------


# During maintenance these still work for everybody - otherwise an
# admin couldn't log in to switch maintenance off again!
MAINTENANCE_ALLOWED = (
    '/api/site-status/',
    '/api/accounts/login/',
    '/api/accounts/logout/',
    '/api/accounts/me/',
    # An admin who forgot their password must be able to reset it.
    '/api/accounts/password-reset/',
    '/admin/',
    '/media/',
    '/static/',
)


# 1. BLOCKED IPs  -> 403 on everything.
# 2. MAINTENANCE  -> 503 on the API for everyone except staff.
class SiteGuardMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip = client_ip(request)
        if ip and BlockedIP.objects.filter(ip_address=ip).exists():
            # `code` lets React tell this apart from other 403s.
            return JsonResponse({'detail': 'Access from your network has been blocked.', 'code': 'ip_blocked'}, status=403)

        is_staff = request.user.is_authenticated and request.user.is_staff
        if request.path.startswith('/api/') and not is_staff and not request.path.startswith(MAINTENANCE_ALLOWED):
            site = SiteSettings.load()
            if site.maintenance_mode:
                # 503 = "Service Unavailable" - the honest code for
                # "down for maintenance".
                return JsonResponse({'detail': site.maintenance_message, 'code': 'maintenance'}, status=503)

        return self.get_response(request)


# ---------------------------------------------------------------
# AUDIT LOG: write down every CHANGE an admin makes in the dashboard.
# GETs only look, so they're skipped.
# ---------------------------------------------------------------
CHANGE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
VERBS = {'POST': 'Created', 'PUT': 'Updated', 'PATCH': 'Updated', 'DELETE': 'Deleted'}

# Never store these, even though they were sent.
SECRET_WORDS = ('password', 'token', 'secret', 'api_key')


# "/api/dashboard/users/5/ban/" + "POST"  ->  "Created users #5 (ban)"
# Not perfect English, but readable - and it works for every page,
# including ones we add later, without extra code.
def describe(method, path):
    parts = [part for part in path.split('/') if part][2:]   # drop 'api', 'dashboard'
    if not parts:
        return f'{method} {path}'
    words = [VERBS.get(method, method), parts[0].replace('-', ' ')]
    rest = parts[1:]
    if rest and rest[0].isdigit():
        words.append(f'#{rest[0]}')
        rest = rest[1:]
    if rest:
        words.append('(' + ' '.join(rest).replace('-', ' ') + ')')
    # A POST to an action URL (".../ban/", ".../merge/") isn't a
    # "create" - say "Ran" instead.
    if method == 'POST' and rest:
        words[0] = 'Ran'
    return ' '.join(words)


# The JSON that was sent, minus passwords. Uploads (images etc.)
# aren't JSON - we only note that there was a file.
def safe_details(request, raw_body):
    if not request.content_type == 'application/json':
        return {'note': 'form / file upload'} if request.method != 'DELETE' else {}
    try:
        data = json.loads(raw_body or b'{}')
    except ValueError:
        return {}
    if not isinstance(data, dict):
        return {'value': data}
    return {
        key: '***' if any(word in key.lower() for word in SECRET_WORDS) else value
        for key, value in data.items()
    }


class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        should_log = request.method in CHANGE_METHODS and request.path.startswith('/api/dashboard/')

        # Read the body BEFORE the view. Django keeps a copy, so the
        # view can still read it afterwards. (After the view it may be
        # too late - DRF has already "used up" the stream.)
        raw_body = request.body if should_log and request.content_type == 'application/json' else b''

        response = self.get_response(request)

        user = request.user
        if should_log and user.is_authenticated and user.is_staff:
            AuditEntry.objects.create(
                user=user,
                username=user.username,
                action=describe(request.method, request.path)[:200],
                method=request.method,
                path=request.path[:300],
                details=safe_details(request, raw_body),
                status_code=response.status_code,
                ip_address=client_ip(request),
            )
        return response

