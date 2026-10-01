from datetime import timedelta

from django.contrib.auth.models import User
from django.core import mail
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from accounts.models import Block, Follow, get_profile
from stories.models import Story


# Tests for "new from writers you follow". Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


def member(username, **profile_fields):
    user = User.objects.create_user(username, f'{username}@example.com', PASSWORD)
    profile = get_profile(user)
    profile.email_verified = True
    for name, value in profile_fields.items():
        setattr(profile, name, value)
    profile.save()
    return user


class FollowDigestTests(TestCase):
    def setUp(self):
        self.writer = member('keeper')
        self.reader = member('raven')
        Follow.objects.create(follower=self.reader, following=self.writer)

    def story(self, title, **extra):
        return Story.objects.create(title=title, body='x', author=self.writer, is_published=True, **extra)

    def test_new_stories_from_followed_writers(self):
        self.story('Fresh One')
        old = self.story('Old One')
        Story.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=3))
        call_command('send_follow_digest')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['raven@example.com'])
        self.assertIn('"Fresh One" by keeper', mail.outbox[0].body)
        self.assertNotIn('Old One', mail.outbox[0].body)

    def test_a_scheduled_story_counts_when_its_time_comes(self):
        scheduled = self.story('Midnight Release', publish_at=timezone.now() - timedelta(hours=2))
        Story.objects.filter(pk=scheduled.pk).update(created_at=timezone.now() - timedelta(days=5))
        call_command('send_follow_digest')
        self.assertIn('Midnight Release', mail.outbox[0].body)

    def test_nothing_new_means_no_email_and_the_switch_works(self):
        call_command('send_follow_digest')
        self.assertEqual(mail.outbox, [])
        self.story('Fresh One')
        profile = get_profile(self.reader)
        profile.follow_digest = False
        profile.save()
        call_command('send_follow_digest')
        self.assertEqual(mail.outbox, [])

    def test_blocked_writers_and_18_plus_stay_out(self):
        self.story('Too Much', content_rating='mature')   # raven hasn't confirmed their age
        call_command('send_follow_digest')
        self.assertEqual(mail.outbox, [])
        self.story('Normal')
        Block.objects.create(blocker=self.reader, blocked=self.writer)
        call_command('send_follow_digest')
        self.assertEqual(mail.outbox, [])
