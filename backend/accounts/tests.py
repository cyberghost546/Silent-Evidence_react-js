from django.contrib.auth.models import User
from django.test import TestCase

from stories.models import Story, Like
from .models import Follow, Block, get_profile


# ---------------------------------------------------------------
# TESTS for the accounts app. Run them with:
#
#     python manage.py test
#
# How a test works:
#   - Django makes a brand-new EMPTY database just for the tests
#     (your real db.sqlite3 is never touched), and wipes it after
#     every test method.
#   - setUp() runs before EACH test_... method, to create the users
#     and stories that test needs.
#   - self.client is a fake browser: self.client.get('/api/...')
#     calls the view without starting a server.
#   - self.assertEqual(a, b) = "a must be b, otherwise FAIL".
#
# Every method whose name starts with test_ is one test.
# ---------------------------------------------------------------

PASSWORD = 'Str0ng-pass-123'


def make_user(username):
    return User.objects.create_user(username, f'{username}@example.com', PASSWORD)


def make_story(author, **extra):
    # The normal values, then **extra on top, so a test can change
    # any of them: make_story(bob, title='Other', is_published=False)
    fields = {'title': 'A story', 'body': 'word ' * 100, 'is_published': True}
    fields.update(extra)
    return Story.objects.create(author=author, **fields)


class SettingsTests(TestCase):
    def setUp(self):
        self.me = make_user('me')
        self.client.login(username='me', password=PASSWORD)

    def test_settings_need_login(self):
        self.client.logout()
        response = self.client.get('/api/accounts/settings/')
        self.assertEqual(response.status_code, 403)

    def test_get_settings_has_defaults(self):
        data = self.client.get('/api/accounts/settings/').json()
        self.assertEqual(data['username'], 'me')
        self.assertEqual(data['reading_speed'], 'average')
        self.assertEqual(data['content_access'], 'mature')

    def test_patch_saves_only_what_was_sent(self):
        # content_type: the view reads normal form data, like React sends.
        response = self.client.patch(
            '/api/accounts/settings/',
            'bio=Hello&reading_speed=fast',
            content_type='application/x-www-form-urlencoded',
        )
        self.assertEqual(response.status_code, 200)

        profile = get_profile(self.me)
        self.assertEqual(profile.bio, 'Hello')
        self.assertEqual(profile.reading_speed, 'fast')
        self.assertEqual(profile.content_access, 'mature')  # untouched

    def test_taken_username_is_refused(self):
        make_user('taken')
        response = self.client.patch(
            '/api/accounts/settings/',
            'username=taken',
            content_type='application/x-www-form-urlencoded',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('username', response.json())

    def test_more_than_three_moods_is_refused(self):
        response = self.client.patch(
            '/api/accounts/settings/',
            'fear_moods=creepy,gore,dark,paranoid',
            content_type='application/x-www-form-urlencoded',
        )
        self.assertEqual(response.status_code, 400)

    def test_change_password(self):
        wrong = self.client.post('/api/accounts/change-password/', {'current_password': 'nope', 'new_password': 'N3w-pass-word!'})
        self.assertEqual(wrong.status_code, 400)

        right = self.client.post('/api/accounts/change-password/', {'current_password': PASSWORD, 'new_password': 'N3w-pass-word!'})
        self.assertEqual(right.status_code, 200)

        # Still logged in afterwards (update_session_auth_hash).
        self.assertEqual(self.client.get('/api/accounts/me/').status_code, 200)

    def test_delete_account_needs_the_password(self):
        self.client.post('/api/accounts/delete/', {'password': 'nope'})
        self.assertTrue(User.objects.filter(username='me').exists())

        self.client.post('/api/accounts/delete/', {'password': PASSWORD})
        self.assertFalse(User.objects.filter(username='me').exists())

    def test_block_and_unblock(self):
        make_user('troll')
        self.assertEqual(self.client.post('/api/accounts/blocks/', {'username': 'troll'}).json(), ['troll'])
        self.client.delete('/api/accounts/blocks/troll/')
        self.assertEqual(self.client.get('/api/accounts/blocks/').json(), [])


class LeaderboardTests(TestCase):
    def test_ranked_by_likes_and_drafts_ignored(self):
        popular = make_user('popular')
        busy = make_user('busy')
        fan = make_user('fan')

        liked_story = make_story(popular)
        Like.objects.create(user=fan, story=liked_story)
        for _ in range(3):
            make_story(busy)
        make_story(busy, is_published=False)  # a draft must not count

        rows = self.client.get('/api/accounts/leaderboard/').json()
        self.assertEqual([row['username'] for row in rows], ['popular', 'busy'])
        self.assertEqual(rows[0]['total_likes'], 1)
        self.assertEqual(rows[1]['story_count'], 3)

    def test_elite_tab_needs_ten_stories(self):
        writer = make_user('writer')
        for _ in range(10):
            make_story(writer)
        make_story(make_user('newbie'))

        rows = self.client.get('/api/accounts/leaderboard/?tab=elite').json()
        self.assertEqual([row['username'] for row in rows], ['writer'])


class PrivateProfileTests(TestCase):
    def setUp(self):
        self.secret = make_user('secret')
        profile = get_profile(self.secret)
        profile.is_private = True
        profile.save()
        make_story(self.secret)

        self.visitor = make_user('visitor')
        self.client.login(username='visitor', password=PASSWORD)

    def test_locked_for_strangers(self):
        data = self.client.get('/api/accounts/profile/secret/').json()
        self.assertTrue(data['is_locked'])
        self.assertNotIn('total_views', data)
        self.assertEqual(self.client.get('/api/stories/?author=secret').json(), [])

    def test_open_for_followers(self):
        Follow.objects.create(follower=self.visitor, following=self.secret)
        data = self.client.get('/api/accounts/profile/secret/').json()
        self.assertFalse(data['is_locked'])
        self.assertEqual(len(self.client.get('/api/stories/?author=secret').json()), 1)


class BlockHidesContentTests(TestCase):
    def test_blocked_authors_stories_are_hidden(self):
        me = make_user('me')
        troll = make_user('troll')
        story = make_story(troll)
        Block.objects.create(blocker=me, blocked=troll)

        self.client.login(username='me', password=PASSWORD)
        self.assertEqual(self.client.get('/api/stories/').json(), [])
        self.assertEqual(self.client.get(f'/api/stories/{story.id}/').status_code, 404)
