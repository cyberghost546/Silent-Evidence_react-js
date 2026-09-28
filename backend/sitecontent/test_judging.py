from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from accounts.models import Notification
from sitecontent.models import Challenge, ChallengeEntry, ChallengeJudge, JudgeScore
from stories.models import Story


# Tests for judged challenges. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class JudgingTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.judge = User.objects.create_user('judge', password=PASSWORD)
        self.writer_a = User.objects.create_user('ann', password=PASSWORD)
        self.writer_b = User.objects.create_user('ben', password=PASSWORD)
        self.challenge = Challenge.objects.create(title='The Door', theme='A door that stays shut.', deadline=timezone.now() - timedelta(hours=1))
        self.entry_a = self.enter(self.writer_a, 'Knock Knock')
        self.entry_b = self.enter(self.writer_b, 'Hinges')
        self.judge_entry = self.enter(self.judge, "Judge's Own")
        ChallengeJudge.objects.create(challenge=self.challenge, judge=self.judge)

    def enter(self, author, title):
        story = Story.objects.create(title=title, body='x', author=author, is_published=True)
        return ChallengeEntry.objects.create(challenge=self.challenge, story=story)

    def score(self, entry, value, note=''):
        self.client.force_login(self.judge)
        return self.client.post(f'/api/challenges/{self.challenge.id}/judging/{entry.id}/', {'score': value, 'note': note}, content_type='application/json')

    def test_judges_score_and_admins_see_the_ranking(self):
        self.assertEqual(self.score(self.entry_a, 6).status_code, 200)
        self.score(self.entry_b, 9, 'Chilling ending.')
        self.score(self.entry_b, 8)   # changing your mind updates, doesn't add
        self.assertEqual(JudgeScore.objects.count(), 2)

        self.client.force_login(self.admin)
        results = self.client.get(f'/api/dashboard/challenges/{self.challenge.id}/judges/').json()['results']
        self.assertEqual([(r['title'], r['average']) for r in results[:2]], [('Hinges', 8), ('Knock Knock', 6)])

    def test_the_rules(self):
        # not your own story
        self.assertEqual(self.score(self.judge_entry, 10).status_code, 400)
        # 1-10 only
        self.assertEqual(self.score(self.entry_a, 11).status_code, 400)
        # not before the deadline
        self.challenge.deadline = timezone.now() + timedelta(days=1)
        self.challenge.save()
        self.assertEqual(self.score(self.entry_a, 5).status_code, 400)

    def test_only_judges_see_the_judging_page(self):
        self.client.force_login(self.writer_a)
        self.assertEqual(self.client.get(f'/api/challenges/{self.challenge.id}/judging/').status_code, 404)
        self.client.force_login(self.judge)
        page = self.client.get(f'/api/challenges/{self.challenge.id}/judging/').json()
        self.assertTrue(page['judging_open'])
        self.assertEqual([row['is_mine'] for row in page['entries']], [False, False, True])

    def test_the_public_page_says_who_judges_but_not_the_scores(self):
        self.score(self.entry_a, 7, 'secret note')
        self.client.logout()
        page = self.client.get(f'/api/challenges/{self.challenge.id}/')
        data = page.json()
        self.assertEqual((data['judges'], data['judging_now'], data['i_am_judge']), (['judge'], True, False))
        self.assertNotIn(b'secret note', page.content)

    def test_announcing_the_winner_tells_everyone(self):
        self.client.force_login(self.admin)
        self.client.post(f'/api/dashboard/challenges/{self.challenge.id}/announce/', {'story_id': self.entry_b.story_id}, content_type='application/json')
        self.challenge.refresh_from_db()
        self.assertEqual(self.challenge.winner_id, self.entry_b.story_id)
        self.assertIn('You won', Notification.objects.get(recipient=self.writer_b).text)
        self.assertIn('is announced', Notification.objects.get(recipient=self.writer_a).text)
        # judging closes once there's a winner
        self.assertEqual(self.score(self.entry_a, 5).status_code, 400)

    def test_admin_only(self):
        self.client.force_login(self.judge)
        self.assertEqual(self.client.get(f'/api/dashboard/challenges/{self.challenge.id}/judges/').status_code, 403)
