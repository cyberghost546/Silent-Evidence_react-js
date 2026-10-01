from django.contrib.auth.models import User
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from accounts.models import get_profile
from forums.models import Board, Thread, Post


# ---------------------------------------------------------------
# SPEED GUARD - the "N+1 problem": a page that asks the database
# once PER reply gets slower with every reply. 100 replies were
# ~400 queries before get_profile() learned to reuse profiles that
# select_related() already loaded (accounts/models.py).
#
# This test counts queries for a thread with 3 replies and with 15.
# The number must be the SAME - otherwise something loops over the
# database again.
# ---------------------------------------------------------------
class ThreadSpeedTests(TestCase):
    def queries_for_thread_with(self, replies):
        board = Board.objects.first() or Board.objects.create(name='General', slug='general-test')
        starter = User.objects.create_user(f'starter{replies}', password='x')
        thread = Thread.objects.create(board=board, author=starter, title='Speed', body='hello')
        for i in range(replies):
            writer = User.objects.create_user(f'writer{replies}_{i}', password='x')
            get_profile(writer)   # real members already have a profile row
            Post.objects.create(thread=thread, author=writer, body=f'reply {i}')
        get_profile(starter)

        # A first visit does one-time setup (site settings, the session...).
        # Warm up, THEN count - so both runs are measured the same way.
        self.client.get(f'/api/forums/threads/{thread.id}/')
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(f'/api/forums/threads/{thread.id}/')
        self.assertEqual(len(response.json()['posts']), replies)
        return len(queries)

    def test_more_replies_do_not_mean_more_queries(self):
        self.assertEqual(self.queries_for_thread_with(3), self.queries_for_thread_with(15))
