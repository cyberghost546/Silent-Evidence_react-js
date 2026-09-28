from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from moderation.models import Report
from stories.models import ReadAlong, ReadAlongMessage, ReadingList, Story


# Reports on read-along chat messages and reading lists.
# Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class NewReportTargetsTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.troll = User.objects.create_user('troll', password=PASSWORD)
        self.reader = User.objects.create_user('reader', password=PASSWORD)
        story = Story.objects.create(title='The Well', body='x', author=self.reader, is_published=True)
        self.room = ReadAlong.objects.create(story=story, host=self.reader, starts_at=timezone.now() - timedelta(minutes=5))
        self.message = ReadAlongMessage.objects.create(room=self.room, author=self.troll, body='buy cheap stuff at spam.example')
        self.reading_list = ReadingList.objects.create(owner=self.troll, title='Spam list', is_public=True)

    def report(self, **target):
        self.client.force_login(self.reader)
        return self.client.post('/api/reports/', {'reason': 'spam', **target}, content_type='application/json')

    def admin_remove(self):
        self.client.force_login(self.admin)
        report = Report.objects.get()
        return self.client.post(f'/api/dashboard/reports/{report.id}/', {'action': 'remove'}, content_type='application/json')

    def test_report_and_hide_a_chat_message(self):
        self.assertEqual(self.report(chat_message_id=self.message.id).status_code, 201)
        self.client.force_login(self.admin)
        target = self.client.get('/api/dashboard/reports/').json()['reports'][0]['target']
        self.assertEqual((target['type'], target['author'], target['link']), ('chat', 'troll', f'/read-alongs/{self.room.id}'))

        self.admin_remove()
        self.message.refresh_from_db()
        self.assertTrue(self.message.is_hidden)
        # Gone from the room for everyone.
        self.assertEqual(self.client.get(f'/api/read-alongs/{self.room.id}/').json()['messages'], [])

    def test_report_a_reading_list_and_make_it_private(self):
        self.assertEqual(self.report(reading_list_id=self.reading_list.id).status_code, 201)
        self.admin_remove()
        self.reading_list.refresh_from_db()
        self.assertFalse(self.reading_list.is_public)
        self.client.logout()
        self.assertEqual(self.client.get(f'/api/reading-lists/{self.reading_list.id}/').status_code, 404)

    def test_one_thing_at_a_time_and_only_what_you_can_see(self):
        self.assertEqual(self.report(chat_message_id=self.message.id, reading_list_id=self.reading_list.id).status_code, 400)
        self.reading_list.is_public = False
        self.reading_list.save()
        self.assertEqual(self.report(reading_list_id=self.reading_list.id).status_code, 404)
