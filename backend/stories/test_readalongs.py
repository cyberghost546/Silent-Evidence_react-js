from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from stories.models import FearRating, ReadAlong, Story


# Tests for read-alongs. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class ReadAlongTests(TestCase):
    def setUp(self):
        self.host = User.objects.create_user('host', password=PASSWORD)
        self.guest = User.objects.create_user('guest', password=PASSWORD)
        self.story = Story.objects.create(title='The Well', body='x', author=self.host, is_published=True)

    def room(self, starts_in):
        room = ReadAlong.objects.create(story=self.story, host=self.host, starts_at=timezone.now() + starts_in)
        room.joined.add(self.host)
        return room

    def test_host_a_read_along(self):
        self.client.force_login(self.host)
        when = (timezone.now() + timedelta(days=2)).isoformat()
        response = self.client.post('/api/read-alongs/', {'story_id': self.story.id, 'starts_at': when}, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual((response.json()['status'], response.json()['joined_count']), ('upcoming', 1))
        # not in the past
        past = (timezone.now() - timedelta(hours=1)).isoformat()
        self.assertEqual(self.client.post('/api/read-alongs/', {'story_id': self.story.id, 'starts_at': past}, content_type='application/json').status_code, 400)

    def test_join_then_chat_only_while_live(self):
        upcoming = self.room(timedelta(hours=1))
        self.client.force_login(self.guest)
        self.assertTrue(self.client.post(f'/api/read-alongs/{upcoming.id}/join/').json()['i_joined'])
        self.assertEqual(self.client.post(f'/api/read-alongs/{upcoming.id}/messages/', {'body': 'too early'}, content_type='application/json').status_code, 400)

        live = self.room(-timedelta(minutes=10))
        # not joined -> no chat
        self.assertEqual(self.client.post(f'/api/read-alongs/{live.id}/messages/', {'body': 'hi'}, content_type='application/json').status_code, 403)
        self.client.post(f'/api/read-alongs/{live.id}/join/')
        first = self.client.post(f'/api/read-alongs/{live.id}/messages/', {'body': 'The part with the well!'}, content_type='application/json').json()
        self.client.post(f'/api/read-alongs/{live.id}/messages/', {'body': 'Nope nope nope'}, content_type='application/json')
        # ?after= gives only the new messages (the page asks every few seconds)
        newer = self.client.get(f'/api/read-alongs/{live.id}/?after={first["id"]}').json()['messages']
        self.assertEqual([m['body'] for m in newer], ['Nope nope nope'])

    def test_the_reveal_after_the_end(self):
        ended = self.room(-timedelta(hours=3))
        ended.joined.add(self.guest)
        FearRating.objects.create(user=self.host, story=self.story, score=3)
        FearRating.objects.create(user=self.guest, story=self.story, score=5)
        data = self.client.get(f'/api/read-alongs/{ended.id}/').json()
        self.assertEqual(data['status'], 'ended')
        self.assertEqual(data['reveal']['average'], 4)
        # a live room keeps the ratings secret
        live = self.room(-timedelta(minutes=5))
        self.assertIsNone(self.client.get(f'/api/read-alongs/{live.id}/').json()['reveal'])

    def test_a_room_for_a_story_you_cannot_read_is_hidden(self):
        self.story.is_published = False
        self.story.save()
        room = self.room(timedelta(hours=1))
        self.client.force_login(self.guest)
        self.assertEqual(self.client.get(f'/api/read-alongs/{room.id}/').status_code, 404)
        self.assertEqual(self.client.get('/api/read-alongs/').json(), [])
