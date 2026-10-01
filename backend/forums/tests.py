from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import Block, Notification
from forums.models import Board, Thread, Post


# Tests for the forums. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class ForumTests(TestCase):
    def setUp(self):
        self.raven = User.objects.create_user('raven', password=PASSWORD)
        self.moth = User.objects.create_user('moth', password=PASSWORD)

    def start_thread(self, title='The 1987 lighthouse case', body='Nobody ever found the keeper.'):
        return self.client.post('/api/forums/cold-cases/', {'title': title, 'body': body}, content_type='application/json')

    def test_the_three_boards_exist(self):
        # Made by the data migration - no setup needed.
        slugs = [board['slug'] for board in self.client.get('/api/forums/').json()]
        self.assertEqual(slugs, ['general', 'cold-cases', 'theories'])

    def test_start_a_thread_and_reply(self):
        self.client.force_login(self.raven)
        thread = self.start_thread().json()

        self.client.force_login(self.moth)
        reply = self.client.post(f"/api/forums/threads/{thread['id']}/", {'body': 'I think he never left.'}, content_type='application/json')
        self.assertEqual(reply.status_code, 201)

        page = self.client.get(f"/api/forums/threads/{thread['id']}/").json()
        self.assertEqual([post['body'] for post in page['posts']], ['I think he never left.'])
        self.assertTrue(Notification.objects.filter(recipient=self.raven, kind='forum').exists())

        board = self.client.get('/api/forums/cold-cases/').json()
        self.assertEqual(board['threads'][0]['reply_count'], 1)

    def test_visitors_can_read_but_not_post(self):
        self.assertEqual(self.client.get('/api/forums/cold-cases/').status_code, 200)
        self.assertEqual(self.start_thread().status_code, 403)

    def test_locked_thread_refuses_replies(self):
        thread = Thread.objects.create(board=Board.objects.get(slug='general'), author=self.raven, title='Closed', body='x', is_locked=True)
        self.client.force_login(self.moth)
        response = self.client.post(f'/api/forums/threads/{thread.id}/', {'body': 'hi'}, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_hidden_and_blocked_posts_are_not_shown(self):
        thread = Thread.objects.create(board=Board.objects.get(slug='general'), author=self.raven, title='T', body='x')
        Post.objects.create(thread=thread, author=self.moth, body='rude', is_hidden=True)
        Post.objects.create(thread=thread, author=self.moth, body='fine')
        Block.objects.create(blocker=self.raven, blocked=self.moth)

        self.assertEqual([p['body'] for p in self.client.get(f'/api/forums/threads/{thread.id}/').json()['posts']], ['fine'])
        self.client.force_login(self.raven)
        self.assertEqual(self.client.get(f'/api/forums/threads/{thread.id}/').json()['posts'], [])

    def test_only_admins_pin_and_lock(self):
        thread = Thread.objects.create(board=Board.objects.get(slug='general'), author=self.raven, title='T', body='x')
        self.client.force_login(self.raven)
        self.assertEqual(self.client.patch(f'/api/dashboard/forums/threads/{thread.id}/', {'is_pinned': True}, content_type='application/json').status_code, 403)

        boss = User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.client.force_login(boss)
        self.client.patch(f'/api/dashboard/forums/threads/{thread.id}/', {'is_pinned': True}, content_type='application/json')
        thread.refresh_from_db()
        self.assertTrue(thread.is_pinned)
