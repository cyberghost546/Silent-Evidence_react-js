from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import Follow, Block, get_profile
from .models import Story, Comment


# ---------------------------------------------------------------
# TESTS for the stories app. Run them with:  python manage.py test
# (How tests work is explained at the top of accounts/tests.py.)
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


class ContentAccessTests(TestCase):
    def setUp(self):
        writer = make_user('writer')
        make_story(writer, content_rating='all')
        make_story(writer, content_rating='teen')
        make_story(writer, content_rating='mature')

        self.reader = make_user('reader')
        self.client.login(username='reader', password=PASSWORD)

    def set_access(self, level):
        profile = get_profile(self.reader)
        profile.content_access = level
        profile.save()

    def count_stories(self):
        return len(self.client.get('/api/stories/').json())

    def test_full_access_sees_everything(self):
        self.set_access('mature')
        self.assertEqual(self.count_stories(), 3)

    def test_teen_hides_mature(self):
        self.set_access('teen')
        self.assertEqual(self.count_stories(), 2)

    def test_all_ages_only(self):
        self.set_access('all')
        self.assertEqual(self.count_stories(), 1)


class ReadingSpeedTests(TestCase):
    def test_reading_time_follows_the_setting(self):
        # 700 words: slow (150 wpm) -> 5 min, fast (350 wpm) -> 2 min.
        writer = make_user('writer')
        Story.objects.create(title='Long', body='word ' * 700, author=writer, is_published=True)

        reader = make_user('reader')
        self.client.login(username='reader', password=PASSWORD)
        profile = get_profile(reader)

        profile.reading_speed = 'slow'
        profile.save()
        self.assertEqual(self.client.get('/api/stories/').json()[0]['reading_time'], 5)

        profile.reading_speed = 'fast'
        profile.save()
        self.assertEqual(self.client.get('/api/stories/').json()[0]['reading_time'], 2)


class FeedTests(TestCase):
    def test_feed_only_has_followed_authors(self):
        me = make_user('me')
        followed = make_user('followed')
        stranger = make_user('stranger')
        make_story(followed, title='Yes')
        make_story(followed, title='Draft', is_published=False)
        make_story(stranger, title='No')
        Follow.objects.create(follower=me, following=followed)

        self.client.login(username='me', password=PASSWORD)
        data = self.client.get('/api/stories/feed/').json()

        self.assertEqual([story['title'] for story in data['stories']], ['Yes'])
        self.assertEqual(data['following'][0]['username'], 'followed')

    def test_feed_needs_login(self):
        self.assertEqual(self.client.get('/api/stories/feed/').status_code, 403)


class BlockedCommentsTests(TestCase):
    def test_comments_by_blocked_users_are_hidden(self):
        me = make_user('me')
        troll = make_user('troll')
        story = make_story(make_user('writer'))
        Comment.objects.create(story=story, author=troll, body='boo')
        Comment.objects.create(story=story, author=me, body='nice')
        Block.objects.create(blocker=me, blocked=troll)

        self.client.login(username='me', password=PASSWORD)
        bodies = [c['body'] for c in self.client.get(f'/api/stories/{story.id}/comments/').json()]
        self.assertEqual(bodies, ['nice'])


class MyListsAndHistoryTests(TestCase):
    def setUp(self):
        self.me = make_user('me')
        self.story = make_story(make_user('writer'), title='Saved one')
        self.client.login(username='me', password=PASSWORD)

    def test_saved_stories(self):
        self.client.post(f'/api/stories/{self.story.id}/save/')
        titles = [s['title'] for s in self.client.get('/api/stories/saved/').json()]
        self.assertEqual(titles, ['Saved one'])

    def test_opening_a_story_adds_it_to_history(self):
        self.client.get(f'/api/stories/{self.story.id}/')
        self.client.get(f'/api/stories/{self.story.id}/')   # twice = still one row
        history = self.client.get('/api/stories/history/').json()
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]['story']['title'], 'Saved one')

        self.client.delete('/api/stories/history/')
        self.assertEqual(self.client.get('/api/stories/history/').json(), [])


class MyStoriesTests(TestCase):
    def setUp(self):
        self.me = make_user('me')
        self.draft = make_story(self.me, title='Draft', is_published=False)
        self.client.login(username='me', password=PASSWORD)

    def test_my_stories_include_drafts(self):
        rows = self.client.get('/api/stories/mine/').json()
        self.assertEqual(rows[0]['status'], 'draft')

    def test_publish_and_delete(self):
        url = f'/api/stories/{self.draft.id}/manage/'
        self.client.patch(url, 'is_published=true', content_type='application/x-www-form-urlencoded')
        self.draft.refresh_from_db()
        self.assertTrue(self.draft.is_published)

        self.client.delete(url)
        self.assertFalse(Story.objects.filter(id=self.draft.id).exists())

    def test_cannot_touch_someone_elses_story(self):
        other = make_story(make_user('other'))
        response = self.client.delete(f'/api/stories/{other.id}/manage/')
        self.assertEqual(response.status_code, 404)
        self.assertTrue(Story.objects.filter(id=other.id).exists())


class SearchTests(TestCase):
    def test_search_stories_and_authors(self):
        writer = make_user('housekeeper')
        make_story(writer, title='The House on Birch Lane')
        make_story(writer, title='Something else')

        data = self.client.get('/api/search/?q=house').json()
        # Both stories match: one by title, one by the author's name.
        self.assertEqual(len(data['stories']), 2)
        self.assertEqual(data['authors'][0]['username'], 'housekeeper')

    def test_too_short_query(self):
        data = self.client.get('/api/search/?q=a').json()
        self.assertEqual(data, {'stories': [], 'authors': []})


class InviteTests(TestCase):
    def setUp(self):
        self.me = make_user('me')
        self.friend = make_user('friend')
        self.story = make_story(self.me)
        self.client.login(username='me', password=PASSWORD)

    def test_invite_accept_shows_coauthor(self):
        response = self.client.post('/api/invites/', {'story_id': self.story.id, 'username': 'friend'})
        self.assertEqual(response.status_code, 201)
        invite_id = response.json()['id']

        # Inviting twice is refused.
        again = self.client.post('/api/invites/', {'story_id': self.story.id, 'username': 'friend'})
        self.assertEqual(again.status_code, 400)

        self.client.login(username='friend', password=PASSWORD)
        self.assertEqual(len(self.client.get('/api/invites/').json()['received']), 1)
        self.client.post(f'/api/invites/{invite_id}/accept/')

        story = self.client.get(f'/api/stories/{self.story.id}/').json()
        self.assertEqual(story['coauthors'], ['friend'])

    def test_only_your_own_stories(self):
        other_story = make_story(self.friend)
        response = self.client.post('/api/invites/', {'story_id': other_story.id, 'username': 'friend'})
        self.assertEqual(response.status_code, 404)
