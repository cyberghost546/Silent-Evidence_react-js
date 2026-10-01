from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase

from sitecontent.models import VillainNomination, VillainVote, week_start
from stories.models import Story


# Tests for Villain of the Week. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class VillainTests(TestCase):
    def setUp(self):
        self.raven, self.moth, self.owl = (User.objects.create_user(name, password=PASSWORD) for name in ('raven', 'moth', 'owl'))

    def nominate(self, user, name, **extra):
        self.client.force_login(user)
        return self.client.post('/api/villains/', {'name': name, **extra}, content_type='application/json')

    def vote(self, user, nomination_id):
        self.client.force_login(user)
        return self.client.post(f'/api/villains/{nomination_id}/vote/')

    def test_nominate_vote_and_ranking(self):
        keeper = self.nominate(self.raven, 'The Keeper').json()['id']
        tall_man = self.nominate(self.moth, 'The Tall Man').json()['id']
        self.vote(self.owl, tall_man)

        data = self.client.get('/api/villains/').json()
        # The Tall Man: moth's own vote + owl's = 2; The Keeper: 1.
        self.assertEqual([(n['name'], n['votes']) for n in data['nominations']], [('The Tall Man', 2), ('The Keeper', 1)])
        self.assertTrue(data['nominations'][0]['is_my_vote'])   # owl is logged in last

    def test_one_nomination_and_one_vote_per_week(self):
        keeper = self.nominate(self.raven, 'The Keeper').json()['id']
        self.assertEqual(self.nominate(self.raven, 'Another one').status_code, 400)

        tall_man = self.nominate(self.moth, 'The Tall Man').json()['id']
        self.vote(self.owl, keeper)
        self.vote(self.owl, tall_man)   # changing your mind MOVES the vote
        self.assertEqual(VillainVote.objects.filter(user=self.owl).count(), 1)
        self.assertEqual(VillainVote.objects.get(user=self.owl).nomination_id, tall_man)

    def test_last_weeks_winner_is_remembered(self):
        last_week = week_start() - timedelta(weeks=1)
        old = VillainNomination.objects.create(name='The Drowned Man', nominated_by=self.raven, week=last_week)
        VillainVote.objects.create(user=self.moth, nomination=old, week=last_week)

        data = self.client.get('/api/villains/').json()
        self.assertEqual(data['nominations'], [])            # this week is empty again
        self.assertEqual(data['past_winners'][0]['name'], 'The Drowned Man')

        # And old nominations can't get new votes.
        self.assertEqual(self.vote(self.owl, old.id).status_code, 404)

    def test_story_link_and_visitors(self):
        story = Story.objects.create(title='The Lighthouse', body='x', author=self.owl, is_published=True)
        self.nominate(self.raven, 'The Keeper', story_id=story.id, reason='He never blinks.')
        self.client.logout()
        nomination = self.client.get('/api/villains/').json()['nominations'][0]
        self.assertEqual(nomination['story']['title'], 'The Lighthouse')
        self.assertEqual(self.client.post('/api/villains/', {'name': 'x'}, content_type='application/json').status_code, 403)
