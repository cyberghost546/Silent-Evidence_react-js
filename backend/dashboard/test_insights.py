from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from moderation.models import LoginEvent
from stories.models import Story, Comment


# Tests for the Login Map and Analytics pages. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class InsightsTestCase(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.client.force_login(self.admin)


class LoginMapTests(InsightsTestCase):
    def test_groups_by_ip_and_flags_many_accounts(self):
        for name in ('ann', 'bob', 'cat'):
            LoginEvent.objects.create(username=name, success=False, ip_address='203.0.113.5')
        LoginEvent.objects.create(username='boss', user=self.admin, success=True, ip_address='127.0.0.1')

        data = self.client.get('/api/dashboard/login-map/').json()
        rows = {row['ip_address']: row for row in data['ips']}
        self.assertEqual(rows['203.0.113.5']['failed'], 3)
        self.assertTrue(rows['203.0.113.5']['suspicious'])        # 3 different accounts
        self.assertEqual(rows['127.0.0.1']['country'], 'This computer')
        self.assertFalse(rows['127.0.0.1']['suspicious'])


class AnalyticsTests(InsightsTestCase):
    def test_daily_counts_and_previous_period(self):
        writer = User.objects.create_user('writer', password=PASSWORD)
        story = Story.objects.create(title='S', body='x', author=writer, is_published=True, views=40)
        Comment.objects.create(story=story, author=writer, body='now')
        old = Comment.objects.create(story=story, author=writer, body='last week')
        Comment.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=10))

        data = self.client.get('/api/dashboard/analytics/?days=7').json()
        comments = next(tile for tile in data['tiles'] if tile['key'] == 'comments')
        self.assertEqual(comments['total'], 1)
        self.assertEqual(comments['previous'], 1)       # the one from 10 days ago
        self.assertEqual(len(data['series']['comments']), 7)
        self.assertEqual(data['series']['comments'][-1]['count'], 1)   # today
        self.assertEqual(data['top_stories'][0]['views'], 40)
