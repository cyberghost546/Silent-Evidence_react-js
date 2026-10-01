from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from accounts.badges import streaks
from stories.models import Story, ReadingDay


# Tests for badges and reading streaks. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class StreakTests(TestCase):
    def days_ago(self, *numbers):
        today = timezone.localdate()
        return [today - timedelta(days=n) for n in numbers]

    def test_current_and_longest(self):
        # Read today, yesterday, the day before (3 in a row), then a gap,
        # then 4 days in a row a while ago.
        days = self.days_ago(0, 1, 2, 10, 11, 12, 13)
        self.assertEqual(streaks(days), (3, 4))

    def test_yesterday_still_counts_as_current(self):
        self.assertEqual(streaks(self.days_ago(1, 2)), (2, 2))

    def test_a_missed_day_ends_the_current_streak(self):
        self.assertEqual(streaks(self.days_ago(2, 3)), (0, 2))

    def test_no_days(self):
        self.assertEqual(streaks([]), (0, 0))


class BadgeTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)

    def profile(self, username='writer'):
        return self.client.get(f'/api/accounts/profile/{username}/').json()

    def test_first_story_badge_and_what_others_see(self):
        Story.objects.create(title='T', body='x', author=self.writer, is_published=True)
        # A visitor sees only EARNED badges.
        keys = [badge['key'] for badge in self.profile()['badges']]
        self.assertEqual(keys, ['first_story'])

        # The writer sees everything, with progress.
        self.client.force_login(self.writer)
        badges = {badge['key']: badge for badge in self.profile()['badges']}
        self.assertEqual(len(badges), 14)
        self.assertEqual((badges['storyteller']['progress'], badges['storyteller']['target']), (1, 10))
        self.assertFalse(badges['storyteller']['earned'])

    def test_reading_a_story_counts_as_a_reading_day(self):
        story = Story.objects.create(title='T', body='x', author=self.writer, is_published=True)
        reader = User.objects.create_user('reader', password=PASSWORD)
        self.client.force_login(reader)
        self.client.get(f'/api/stories/{story.id}/')
        self.client.get(f'/api/stories/{story.id}/')   # twice on one day = still one day
        self.assertEqual(ReadingDay.objects.filter(user=reader).count(), 1)
        self.assertEqual(self.profile('reader')['streak'], {'current': 1, 'longest': 1})

    def test_night_owl_after_7_days_in_a_row(self):
        today = timezone.localdate()
        for n in range(7):
            ReadingDay.objects.create(user=self.writer, date=today - timedelta(days=n))
        keys = [badge['key'] for badge in self.profile()['badges']]
        self.assertIn('night_owl', keys)


class NewBadgeTests(TestCase):
    def test_path_maker_champion_and_curator(self):
        from accounts.badges import badge_report
        from sitecontent.models import Challenge
        from stories.models import ReadingList

        writer = User.objects.create_user('pathfinder', password='Str0ng-pass-123')
        story = Story.objects.create(title='Doors', body='Hi.\n[[choice: Go -> a]]\n\n[[section: a]]\nEnd.', author=writer, is_published=True)
        Challenge.objects.create(title='C', theme='t', deadline=timezone.now() - timedelta(days=1), winner=story)
        for number in range(3):
            ReadingList.objects.create(owner=writer, title=f'List {number}')

        earned = {badge['key'] for badge in badge_report(writer)['badges'] if badge['earned']}
        self.assertTrue({'path_maker', 'champion', 'curator'} <= earned)
        self.assertNotIn('fellow_reader', earned)
