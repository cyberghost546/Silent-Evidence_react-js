from django.core.cache import cache
from django.test import TestCase
from django.urls import get_resolver
from rest_framework.permissions import AllowAny, IsAdminUser


# ---------------------------------------------------------------
# GUARD TESTS - they look at EVERY API address the site has, so a
# new page can't forget its lock by accident. Run with:
#   python manage.py test
#
# Why: DRF's default is "anyone may do anything" (AllowAny). A view
# that forgets permission_classes is wide open - and nothing would
# notice. These tests notice.
# ---------------------------------------------------------------

# Addresses where ANYONE (even logged out) may send data. Each one
# was checked on purpose - it has a rate limit or a password/token.
# Adding a new one here should be a decision, not an accident.
PUBLIC_WRITE_ALLOWED = {
    'api/accounts/signup/',                  # SignUpThrottle
    'api/accounts/login/',                   # lock-out after failed tries
    'api/accounts/logout/',
    'api/accounts/verify-email/',            # needs the token from the email
    'api/accounts/password-reset/',          # PasswordResetThrottle
    'api/accounts/password-reset/confirm/',  # needs the token from the email
    'api/contact/',                          # ContactAnonThrottle
    'api/errors/',                           # ErrorReportThrottle
    'api/cookie-consent/',                   # CookieConsentThrottle
}

WRITE_METHODS = ('post', 'put', 'patch', 'delete')


def api_views():
    # Walks the URL list (config/urls.py and every app's urls.py)
    # -> [('api/stories/', StoryListView), ...]
    def walk(patterns, prefix=''):
        for pattern in patterns:
            if hasattr(pattern, 'url_patterns'):          # an include(...)
                yield from walk(pattern.url_patterns, prefix + str(pattern.pattern))
            else:
                view = getattr(pattern.callback, 'view_class', None) or getattr(pattern.callback, 'cls', None)
                if view and (prefix + str(pattern.pattern)).startswith('api/'):
                    yield prefix + str(pattern.pattern), view
    return list(walk(get_resolver().url_patterns))


class PermissionGuardTests(TestCase):
    def test_every_dashboard_address_is_admin_only(self):
        for path, view in api_views():
            if path.startswith('api/dashboard/'):
                with self.subTest(path=path):
                    self.assertIn(IsAdminUser, view.permission_classes, f'{path} must have permission_classes = [IsAdminUser]')

    def test_open_addresses_that_accept_data_are_on_the_list(self):
        for path, view in api_views():
            accepts_data = any(hasattr(view, method) for method in WRITE_METHODS)
            wide_open = list(view.permission_classes) == [AllowAny]
            if accepts_data and wide_open:
                with self.subTest(path=path):
                    self.assertIn(path, PUBLIC_WRITE_ALLOWED, f'{path} lets anyone send data - add a permission, or add it to PUBLIC_WRITE_ALLOWED on purpose')

    def test_open_addresses_have_a_rate_limit(self):
        # Of the list above, the ones without a password or token must
        # have a throttle - or a script could flood them.
        needs_throttle = PUBLIC_WRITE_ALLOWED - {
            'api/accounts/logout/', 'api/accounts/login/', 'api/accounts/verify-email/', 'api/accounts/password-reset/confirm/',
        }
        views = dict(api_views())
        for path in needs_throttle:
            with self.subTest(path=path):
                self.assertTrue(views[path].throttle_classes, f'{path} needs throttle_classes')

    def test_cookie_consent_is_rate_limited(self):
        cache.clear()   # the throttle counts in the cache
        for _ in range(20):
            self.client.post('/api/cookie-consent/', {'choice': 'all'}, content_type='application/json')
        response = self.client.post('/api/cookie-consent/', {'choice': 'all'}, content_type='application/json')
        self.assertEqual(response.status_code, 429)
