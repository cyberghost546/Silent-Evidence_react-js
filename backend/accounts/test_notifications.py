from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import Block, Notification, get_profile
from stories.models import Story


# Tests for notifications (the bell). Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class NotificationTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.fan = User.objects.create_user('fan', password=PASSWORD)
        self.story = Story.objects.create(title='Fog', body='x', author=self.writer, is_published=True)

    def test_like_comment_and_follow_notify_the_author(self):
        self.client.force_login(self.fan)
        self.client.post(f'/api/stories/{self.story.id}/like/')
        self.client.post(f'/api/stories/{self.story.id}/comments/', {'body': 'Great!'}, content_type='application/json')
        self.client.post('/api/accounts/authors/writer/follow/')

        kinds = list(Notification.objects.filter(recipient=self.writer).values_list('kind', flat=True))
        self.assertEqual(sorted(kinds), ['comment', 'follow', 'like'])

        self.client.force_login(self.writer)
        data = self.client.get('/api/accounts/notifications/').json()
        self.assertEqual(data['unread'], 3)
        self.assertIn('fan liked your story "Fog"', [item['text'] for item in data['items']])

    def test_no_notification_for_yourself_or_twice(self):
        self.client.force_login(self.writer)
        self.client.post(f'/api/stories/{self.story.id}/like/')      # own story
        self.assertFalse(Notification.objects.exists())

        self.client.force_login(self.fan)
        for _ in range(3):   # like, unlike, like
            self.client.post(f'/api/stories/{self.story.id}/like/')
        self.assertEqual(Notification.objects.filter(kind='like').count(), 1)

    def test_blocked_people_cant_notify_you(self):
        Block.objects.create(blocker=self.writer, blocked=self.fan)
        self.client.force_login(self.fan)
        self.client.post('/api/accounts/authors/writer/follow/')
        self.assertFalse(Notification.objects.exists())

    def test_mark_read_only_touches_your_own(self):
        mine = Notification.objects.create(recipient=self.writer, kind='like', text='a', link='/')
        theirs = Notification.objects.create(recipient=self.fan, kind='like', text='b', link='/')

        self.client.force_login(self.writer)
        answer = self.client.post('/api/accounts/notifications/read/', {'ids': [mine.id, theirs.id]}, content_type='application/json').json()
        self.assertEqual(answer['unread'], 0)
        theirs.refresh_from_db()
        self.assertFalse(theirs.is_read)      # not yours -> untouched

    def test_switched_off_kinds_are_not_sent(self):
        profile = get_profile(self.writer)
        profile.notify_likes = False
        profile.save()

        self.client.force_login(self.fan)
        self.client.post(f'/api/stories/{self.story.id}/like/')                 # switched off
        self.client.post('/api/accounts/authors/writer/follow/')              # still on
        kinds = list(Notification.objects.filter(recipient=self.writer).values_list('kind', flat=True))
        self.assertEqual(kinds, ['follow'])

    def test_logged_out_gets_403(self):
        self.assertEqual(self.client.get('/api/accounts/notifications/').status_code, 403)
