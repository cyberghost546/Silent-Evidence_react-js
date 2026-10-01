from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase

from accounts.badges import badge_report
from stories.models import SprintResult


# Tests for Writing Sprints. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class SprintTests(TestCase):
    def setUp(self):
        cache.clear()   # the throttle counts in the cache
        self.raven = User.objects.create_user('raven', password=PASSWORD)
        self.moth = User.objects.create_user('moth', password=PASSWORD)

    def save(self, user, words, minutes=20):
        self.client.force_login(user)
        return self.client.post('/api/sprints/', {'words': words, 'minutes': minutes}, content_type='application/json')

    def test_leaderboard_adds_up_this_weeks_words(self):
        self.save(self.raven, 300)
        self.save(self.raven, 200)
        self.save(self.moth, 400)
        data = self.client.get('/api/sprints/').json()   # moth is logged in
        self.assertEqual([(row['username'], row['words']) for row in data['leaderboard']], [('raven', 500), ('moth', 400)])
        self.assertEqual(data['me'], {'sprints': 1, 'best': 400, 'week_words': 400})

    def test_bad_sprints_are_refused_or_capped(self):
        self.assertEqual(self.save(self.raven, 100, minutes=7).status_code, 400)   # not 10/20/30
        self.assertEqual(self.save(self.raven, 0).status_code, 400)                # nothing written
        self.assertEqual(self.save(self.raven, 'lots').status_code, 400)
        # 10 minutes * 150 words a minute = 1500 at most.
        self.assertEqual(self.save(self.raven, 99999, minutes=10).json()['words'], 1500)

    def test_visitors_can_look_but_not_save(self):
        self.assertIsNone(self.client.get('/api/sprints/').json()['me'])
        response = self.client.post('/api/sprints/', {'words': 50, 'minutes': 10}, content_type='application/json')
        self.assertEqual(response.status_code, 403)

    def test_sprinter_badge_after_five(self):
        for _ in range(5):
            SprintResult.objects.create(user=self.raven, words=100, minutes=10)
        sprinter = next(b for b in badge_report(self.raven)['badges'] if b['key'] == 'sprinter')
        self.assertTrue(sprinter['earned'])
