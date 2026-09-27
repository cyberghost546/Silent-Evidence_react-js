from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase

from accounts.age import age_on
from accounts.models import get_profile
from stories.models import Story, ReadingHistory


# Tests for 18+ stories and "confirm your age". Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


def years_ago(years):
    today = date.today()
    # Feb 29 doesn't exist every year - use the 28th to be safe.
    return today.replace(year=today.year - years, day=min(today.day, 28))


class AgeOnTests(TestCase):
    def test_birthday_not_yet_this_year(self):
        self.assertEqual(age_on(date(2008, 12, 31), today=date(2026, 9, 27)), 17)
        self.assertEqual(age_on(date(2008, 1, 1), today=date(2026, 9, 27)), 18)


class MatureStoryTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.reader = User.objects.create_user('reader', password=PASSWORD)
        self.mature = Story.objects.create(title='The Red Room', body='Very scary text.', author=self.writer,
                                           is_published=True, content_rating='mature')
        self.teen = Story.objects.create(title='Fog', body='A bit scary.', author=self.writer,
                                         is_published=True, content_rating='teen')

    def open_story(self, story):
        return self.client.get(f'/api/stories/{story.id}/').json()

    def confirm_age(self, birth_date):
        return self.client.post('/api/accounts/age/', {'birth_date': birth_date.isoformat()}, content_type='application/json')

    def test_visitors_see_the_title_but_not_the_text(self):
        data = self.open_story(self.mature)
        self.assertEqual(data['lock'], 'login')
        self.assertEqual(data['title'], 'The Red Room')
        self.assertEqual(data['body'], '')

    def test_18_plus_stories_still_show_in_lists(self):
        titles = [story['title'] for story in self.client.get('/api/stories/').json()]
        self.assertIn('The Red Room', titles)

    def test_teen_stories_are_open_to_everyone(self):
        self.assertIsNone(self.open_story(self.teen)['lock'])
        self.assertEqual(self.open_story(self.teen)['body'], 'A bit scary.')

    def test_member_confirms_age_once_then_reads(self):
        self.client.force_login(self.reader)
        self.assertEqual(self.open_story(self.mature)['lock'], 'age')
        # Not read yet -> not in Reading History.
        self.assertFalse(ReadingHistory.objects.filter(user=self.reader).exists())

        self.assertEqual(self.confirm_age(years_ago(25)).json(), {'age_confirmed': True, 'is_adult': True})
        data = self.open_story(self.mature)
        self.assertIsNone(data['lock'])
        self.assertEqual(data['body'], 'Very scary text.')

    def test_under_18_no_longer_sees_18_plus_stories_and_cant_try_again(self):
        self.client.force_login(self.reader)
        self.assertFalse(self.confirm_age(years_ago(15)).json()['is_adult'])

        # Full Access in Settings was switched down for them...
        self.assertEqual(get_profile(self.reader).content_access, 'teen')
        # ...so 18+ stories are hidden completely: not in lists, and
        # "not found" on a direct link.
        titles = [story['title'] for story in self.client.get('/api/stories/').json()]
        self.assertNotIn('The Red Room', titles)
        self.assertEqual(self.client.get(f'/api/stories/{self.mature.id}/').status_code, 404)

        # A second try with an older date is refused.
        self.assertEqual(self.confirm_age(years_ago(30)).status_code, 400)

    def test_full_access_setting_needs_a_confirmed_adult(self):
        self.client.force_login(self.reader)
        response = self.client.patch('/api/accounts/settings/', {'content_access': 'mature'}, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_writers_always_read_their_own_story(self):
        self.client.force_login(self.writer)
        self.assertIsNone(self.open_story(self.mature)['lock'])

    def test_future_or_silly_dates_are_refused(self):
        self.client.force_login(self.reader)
        self.assertEqual(self.confirm_age(date(2999, 1, 1)).status_code, 400)
        self.assertEqual(self.client.post('/api/accounts/age/', {'birth_date': 'soon'}, content_type='application/json').status_code, 400)

    def test_admin_can_reset_a_typo(self):
        profile = get_profile(self.reader)
        profile.birth_date = years_ago(15)
        profile.save()
        boss = User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.client.force_login(boss)
        row = self.client.patch(f'/api/dashboard/users/{self.reader.id}/', {'reset_birth_date': 'true'}, content_type='application/json').json()
        self.assertIsNone(row['age'])
        self.assertIsNone(get_profile(self.reader).birth_date)
