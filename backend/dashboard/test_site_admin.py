from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase

from dashboard.models import SiteSettings, BlockedIP, AuditEntry
from stories.models import Story


# Tests for Site Settings, Rate Limits, IP Blocklist and Audit Log.
# Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'
# The test client always connects from this address.
TEST_IP = '127.0.0.1'


class SiteAdminTestCase(TestCase):
    def setUp(self):
        # Rate limits (sign-up, contact) count in the cache - start clean,
        # so another test's requests can't use up this test's limit.
        cache.clear()
        self.admin = User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.member = User.objects.create_user('reader', password=PASSWORD)

    def set(self, **fields):
        SiteSettings.objects.update_or_create(pk=1, defaults=fields)


class MaintenanceTests(SiteAdminTestCase):
    def test_members_get_503_but_admins_get_in(self):
        self.set(maintenance_mode=True, maintenance_message='Back at 5')

        self.client.force_login(self.member)
        response = self.client.get('/api/stories/')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()['detail'], 'Back at 5')
        # ...but they can still ask what's going on, and log in/out.
        self.assertEqual(self.client.get('/api/site-status/').json()['maintenance_mode'], True)

        self.client.force_login(self.admin)
        self.assertEqual(self.client.get('/api/stories/').status_code, 200)


class SignupTests(SiteAdminTestCase):
    def test_closed_signups(self):
        self.set(signups_open=False)
        response = self.client.post('/api/accounts/signup/', {
            'username': 'newbie', 'email': 'newbie@example.com', 'password': PASSWORD, 'password2': PASSWORD,
        }, content_type='application/json')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(username='newbie').exists())


class RateLimitTests(SiteAdminTestCase):
    def test_comment_limit(self):
        self.set(comments_per_hour=2)
        story = Story.objects.create(title='S', body='x', author=self.admin, is_published=True)
        self.client.force_login(self.member)
        url = f'/api/stories/{story.id}/comments/'
        for _ in range(2):
            self.assertEqual(self.client.post(url, {'body': 'hi'}, content_type='application/json').status_code, 201)
        self.assertEqual(self.client.post(url, {'body': 'hi'}, content_type='application/json').status_code, 429)

    def test_message_limit(self):
        self.set(messages_per_hour=1)
        self.client.force_login(self.member)
        url = '/api/messages/boss/'
        self.assertEqual(self.client.post(url, {'body': 'hi'}, content_type='application/json').status_code, 201)
        self.assertEqual(self.client.post(url, {'body': 'again'}, content_type='application/json').status_code, 429)

    def test_login_lock_uses_the_setting(self):
        self.set(login_max_per_username=2)
        for _ in range(2):
            self.client.post('/api/accounts/login/', {'username': 'reader', 'password': 'wrong'}, content_type='application/json')
        response = self.client.post('/api/accounts/login/', {'username': 'reader', 'password': PASSWORD}, content_type='application/json')
        self.assertEqual(response.status_code, 429)

    def test_admin_can_change_limits_but_not_to_zero(self):
        self.client.force_login(self.admin)
        response = self.client.patch('/api/dashboard/rate-limits/', {'comments_per_hour': 0}, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        response = self.client.patch('/api/dashboard/rate-limits/', {'comments_per_hour': 7}, content_type='application/json')
        self.assertEqual(response.json()['comments_per_hour'], 7)


class BlocklistTests(SiteAdminTestCase):
    def test_blocked_ip_gets_403_everywhere(self):
        BlockedIP.objects.create(ip_address=TEST_IP)
        response = self.client.get('/api/stories/')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['code'], 'ip_blocked')

    def test_cant_block_yourself(self):
        self.client.force_login(self.admin)
        response = self.client.post('/api/dashboard/blocked-ips/', {'ip_address': TEST_IP}, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        response = self.client.post('/api/dashboard/blocked-ips/', {'ip_address': '203.0.113.9', 'reason': 'spam'}, content_type='application/json')
        self.assertEqual(response.status_code, 201)


class AuditLogTests(SiteAdminTestCase):
    def test_admin_changes_are_logged_without_passwords(self):
        self.client.force_login(self.admin)
        self.client.patch('/api/dashboard/site-settings/', {'signups_open': False}, content_type='application/json')
        self.client.post('/api/dashboard/blocked-ips/', {'ip_address': '203.0.113.9', 'password': 'hunter2'}, content_type='application/json')
        self.client.get('/api/dashboard/audit-log/')   # just looking: not logged

        entries = list(AuditEntry.objects.order_by('id'))
        self.assertEqual([e.action for e in entries], ['Updated site settings', 'Created blocked ips'])
        self.assertEqual(entries[0].details, {'signups_open': False})
        self.assertEqual(entries[1].details['password'], '***')
        self.assertEqual(entries[1].username, 'boss')

    def test_members_are_not_logged(self):
        self.client.force_login(self.member)
        self.client.post('/api/dashboard/blocked-ips/', {'ip_address': '203.0.113.9'}, content_type='application/json')
        self.assertFalse(AuditEntry.objects.exists())
