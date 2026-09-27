from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from sitecontent.models import FeaturedAuthor, Spotlight, Poll
from stories.models import Story, Like, Comment, Tag


# Tests for Featured Authors, Story Spotlight, Polls, the Content
# Calendar and Merge Stories. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class FeaturedAuthorTests(TestCase):
    def test_featured_come_first_even_with_fewer_stories(self):
        busy = User.objects.create_user('busy', password=PASSWORD)
        quiet = User.objects.create_user('quiet', password=PASSWORD)
        for _ in range(3):
            Story.objects.create(title='S', body='x', author=busy, is_published=True)
        Story.objects.create(title='S', body='x', author=quiet, is_published=True)

        FeaturedAuthor.objects.create(user=quiet, blurb='Master of fog')
        authors = self.client.get('/api/accounts/authors/').json()
        self.assertEqual([a['username'] for a in authors], ['quiet', 'busy'])
        self.assertEqual(authors[0]['featured_blurb'], 'Master of fog')


class SpotlightTests(TestCase):
    def test_only_between_its_dates(self):
        writer = User.objects.create_user('writer', password=PASSWORD)
        story = Story.objects.create(title='Big one', body='x', author=writer, is_published=True)
        today = timezone.localdate()

        Spotlight.objects.create(story=story, headline='Old', starts_on=today - timedelta(days=10), ends_on=today - timedelta(days=5))
        self.assertEqual(self.client.get('/api/spotlight/').status_code, 204)

        Spotlight.objects.create(story=story, headline='Now', starts_on=today, ends_on=today + timedelta(days=3))
        data = self.client.get('/api/spotlight/').json()
        self.assertEqual((data['headline'], data['story']['title']), ('Now', 'Big one'))


class PollTests(TestCase):
    def test_create_vote_once_and_results(self):
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        User.objects.create_user('member', password=PASSWORD)

        self.client.login(username='boss', password=PASSWORD)
        poll = self.client.post(
            '/api/dashboard/polls/', {'question': 'Scariest?', 'options': ['Ghosts', 'Clowns', ' ']},
            content_type='application/json',
        ).json()
        self.assertEqual(len(poll['options']), 2)            # the empty one was dropped

        self.client.login(username='member', password=PASSWORD)
        clowns = poll['options'][1]['id']
        result = self.client.post(f"/api/polls/{poll['id']}/vote/", {'option_id': clowns}).json()
        self.assertEqual((result['my_vote'], result['options'][1]['percent']), (clowns, 100))

        again = self.client.post(f"/api/polls/{poll['id']}/vote/", {'option_id': clowns})
        self.assertEqual(again.status_code, 400)

    def test_new_poll_closes_the_old_one(self):
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.client.login(username='boss', password=PASSWORD)
        for question in ('First?', 'Second?'):
            self.client.post('/api/dashboard/polls/', {'question': question, 'options': ['A', 'B']}, content_type='application/json')
        self.assertEqual(list(Poll.objects.filter(is_active=True).values_list('question', flat=True)), ['Second?'])


class CalendarAndMergeTests(TestCase):
    def setUp(self):
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.fan = User.objects.create_user('fan', password=PASSWORD)
        self.client.login(username='boss', password=PASSWORD)

    def test_calendar_shows_scheduled_stories(self):
        later = timezone.now() + timedelta(days=1)
        Story.objects.create(title='Soon', body='x', author=self.writer, is_published=True, publish_at=later)
        month = timezone.localtime(later).strftime('%Y-%m')
        events = self.client.get(f'/api/dashboard/calendar/?month={month}').json()['events']
        self.assertIn(('scheduled', 'Soon'), [(e['type'], e['title']) for e in events])

    def test_merge_moves_everything_to_the_original(self):
        original = Story.objects.create(title='Original', body='x', author=self.writer, is_published=True, views=10)
        copy = Story.objects.create(title='Copy', body='x', author=self.writer, is_published=True, views=5)
        Like.objects.create(user=self.fan, story=copy)
        Like.objects.create(user=self.writer, story=original)
        Like.objects.create(user=self.writer, story=copy)          # already liked the original -> dropped
        Comment.objects.create(story=copy, author=self.fan, body='Great')
        copy.tags.add(Tag.objects.create(name='fog'))

        response = self.client.post('/api/dashboard/stories/merge/', {'source_id': copy.id, 'target_id': original.id})
        self.assertEqual(response.json()['moved'], {'likes': 1, 'comments': 1, 'saves': 0})

        original.refresh_from_db()
        self.assertFalse(Story.objects.filter(id=copy.id).exists())
        self.assertEqual(original.views, 15)
        self.assertEqual(original.likes.count(), 2)
        self.assertEqual([t.name for t in original.tags.all()], ['fog'])
