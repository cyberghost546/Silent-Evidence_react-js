from datetime import timedelta

from django.contrib.auth.models import User
from django.core import mail
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from accounts.models import get_profile
from mailings.models import Newsletter
from sitecontent.models import VillainNomination, VillainVote, week_start
from stories.models import SprintResult, Story, StoryViewDay


# Tests for the "Top of the week" email. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


def member(username, digest=True):
    user = User.objects.create_user(username, f'{username}@example.com', PASSWORD)
    profile = get_profile(user)
    profile.email_verified = True
    profile.weekly_digest = digest
    profile.save()
    return user


class WeeklyTopTests(TestCase):
    def setUp(self):
        self.writer = member('keeper')
        self.reader = member('raven')
        member('quiet', digest=False)     # switched the digest off
        today = timezone.localdate()
        popular = Story.objects.create(title='Wren Street', body='x', author=self.writer, is_published=True)
        other = Story.objects.create(title='Static', body='x', author=self.writer, is_published=True)
        adult = Story.objects.create(title='Too Much', body='x', author=self.writer, is_published=True, content_rating='mature')
        StoryViewDay.objects.create(story=popular, date=today, count=40)
        StoryViewDay.objects.create(story=other, date=today - timedelta(days=2), count=10)
        StoryViewDay.objects.create(story=adult, date=today, count=99)

        last_monday = week_start() - timedelta(weeks=1)
        villain = VillainNomination.objects.create(name='The Tall Man', nominated_by=self.reader, week=last_monday)
        VillainVote.objects.create(user=self.writer, nomination=villain, week=last_monday)
        sprint = SprintResult.objects.create(user=self.reader, words=1800, minutes=20)
        SprintResult.objects.filter(pk=sprint.pk).update(created_at=timezone.now() - timedelta(days=7))
        # (last week, whatever day today is: 7 days ago is always in the previous Monday-Sunday week)

    def test_the_command_emails_members_with_the_digest_on(self):
        call_command('send_weekly_top')
        self.assertEqual(sorted(m.to[0] for m in mail.outbox), ['keeper@example.com', 'raven@example.com'])
        body = mail.outbox[0].body
        self.assertLess(body.index('Wren Street'), body.index('Static'))   # most-read first
        self.assertNotIn('Too Much', body)                                  # 18+ stays out of emails
        self.assertIn('The Tall Man (1 votes)', body)
        self.assertIn('raven - 1800 words', body)
        self.assertEqual(Newsletter.objects.get().recipient_count, 2)      # shows in the history

    def test_a_quiet_week_sends_nothing(self):
        StoryViewDay.objects.all().delete()
        call_command('send_weekly_top')
        self.assertEqual(mail.outbox, [])

    def test_admins_can_preview_it(self):
        admin = member('boss')
        admin.is_staff = True
        admin.save()
        self.client.force_login(admin)
        preview = self.client.get('/api/dashboard/weekly-top/').json()
        self.assertEqual(preview['subject'], 'This week on Silent Evidence')
        self.assertIn('Wren Street', preview['body'])
        self.assertEqual(mail.outbox, [])   # a preview sends nothing
