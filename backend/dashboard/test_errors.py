from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from django.urls import include, path

from dashboard.models import ErrorReport


# Tests for the Error Log. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


# A view that crashes ON PURPOSE, to test that Django's crashes get
# written down. It only exists inside this test file: the tests below
# use THIS file's urlpatterns (override_settings(ROOT_URLCONF=...)).
def crashing_view(request):
    raise ValueError('The foghorn broke')


urlpatterns = [
    path('boom/', crashing_view),
    path('', include('config.urls')),
]


@override_settings(ROOT_URLCONF='dashboard.test_errors')
class ErrorLogTests(TestCase):
    def setUp(self):
        cache.clear()   # the report limit counts in the cache

    def test_a_django_crash_is_logged(self):
        # raise_request_exception=False: behave like a real visitor
        # (get the 500 page) instead of the test itself crashing.
        visitor = Client(raise_request_exception=False)
        self.assertEqual(visitor.get('/boom/').status_code, 500)

        report = ErrorReport.objects.get()
        self.assertEqual(report.source, 'backend')
        self.assertEqual(report.message, 'ValueError: The foghorn broke')
        self.assertIn('crashing_view', report.details)   # the stack trace says where

    def test_the_same_error_is_counted_not_repeated(self):
        for _ in range(3):
            self.client.post('/api/errors/', {'message': 'Cannot read x of undefined', 'url': '/stories/5'}, content_type='application/json')
        report = ErrorReport.objects.get()
        self.assertEqual((report.source, report.count), ('frontend', 3))

    def test_only_admins_can_read_and_clear(self):
        ErrorReport.objects.create(source='frontend', message='Oops')
        member = User.objects.create_user('member', password=PASSWORD)
        self.client.force_login(member)
        self.assertEqual(self.client.get('/api/dashboard/errors/').status_code, 403)

        boss = User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.client.force_login(boss)
        self.assertEqual(len(self.client.get('/api/dashboard/errors/').json()), 1)
        self.client.delete('/api/dashboard/errors/')
        self.assertFalse(ErrorReport.objects.exists())
