from django.contrib.auth.models import User
from django.test import TestCase


# ---------------------------------------------------------------
# "Only admins can use the Admin Dashboard" - checked for every
# dashboard URL, for three kinds of visitor.
# Run with:  python manage.py test
# ---------------------------------------------------------------

PASSWORD = 'Str0ng-pass-123'

# Every URL the Admin Dashboard uses.
DASHBOARD_URLS = [
    '/api/dashboard/stats/',
    '/api/dashboard/slides/',
]


class AdminOnlyTests(TestCase):
    def setUp(self):
        User.objects.create_user('normal', password=PASSWORD)
        # is_staff=True = an admin (the "Staff status" tick in /admin).
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)

    def test_logged_out_visitors_are_refused(self):
        for url in DASHBOARD_URLS:
            # subTest: if one URL fails, the message says WHICH one.
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 403)

    def test_normal_users_are_refused(self):
        self.client.login(username='normal', password=PASSWORD)
        for url in DASHBOARD_URLS:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 403)

    def test_admins_are_allowed(self):
        self.client.login(username='boss', password=PASSWORD)
        for url in DASHBOARD_URLS:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 200)
