from django.contrib.auth.models import User
from django.core import mail
from django.test import TestCase, override_settings

from mailings.models import EmailLog
from stories.models import Story


# Tests for Admin Search, Email Log and Site Health.

PASSWORD = 'Str0ng-pass-123'


class AdminToolsTests(TestCase):
    def setUp(self):
        User.objects.create_user('boss', 'boss@example.com', PASSWORD, is_staff=True)
        writer = User.objects.create_user('lighthouse_fan', 'fan@example.com', PASSWORD)
        Story.objects.create(title='The Lighthouse', body='x', author=writer)
        self.client.login(username='boss', password=PASSWORD)

    def test_search_finds_users_and_stories(self):
        data = self.client.get('/api/dashboard/search/?q=lighthouse').json()
        self.assertEqual([u['title'] for u in data['users']], ['lighthouse_fan'])
        self.assertEqual([s['title'] for s in data['stories']], ['The Lighthouse'])

    # Tests normally swap emails for an in-memory list (mail.outbox).
    # Here we switch OUR backend back on for this one test, so the
    # log really gets written.
    @override_settings(MAILERS={'default': {'BACKEND': 'mailings.backends.LoggingConsoleBackend'}})
    def test_every_email_is_logged(self):
        mail.send_mail('Hello', 'Body text', 'site@example.com', ['someone@example.com'])
        log = EmailLog.objects.get()
        self.assertEqual((log.to, log.subject, log.success), ('someone@example.com', 'Hello', True))

    def test_health_page_runs_every_check(self):
        data = self.client.get('/api/dashboard/health/').json()
        names = [item['name'] for item in data['checks']]
        self.assertIn('Database', names)
        self.assertIn('Migrations', names)
        self.assertEqual(next(i for i in data['checks'] if i['name'] == 'Migrations')['status'], 'ok')
