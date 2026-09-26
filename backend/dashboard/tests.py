from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import get_profile
from categories.models import Category
from stories.models import Story


# ---------------------------------------------------------------
# "Only admins can use the Admin Dashboard" - checked for every
# dashboard URL, for three kinds of visitor.
# Run with:  python manage.py test
# ---------------------------------------------------------------

PASSWORD = 'Str0ng-pass-123'

# Every URL the Admin Dashboard uses.
DASHBOARD_URLS = [
    '/api/dashboard/reports/',
    '/api/dashboard/moderation/',
    '/api/dashboard/appeals/',
    '/api/dashboard/login-logs/',
    '/api/dashboard/security/',
    '/api/dashboard/ai/status/',
    '/api/dashboard/stories/',
    '/api/dashboard/users/',
    '/api/dashboard/stats/',
    '/api/dashboard/slides/',
]


class AdminOnlyTests(TestCase):
    def setUp(self):
        User.objects.create_user('normal', password=PASSWORD)
        # is_staff=True = an admin (the "Staff status" tick in /admin).
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)

    def test_logged_out_visitors_are_refused(self):
        for url in DASHBOARD_URLS:
            # subTest: if one URL fails, the message says WHICH one.
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 403)

    def test_normal_users_are_refused(self):
        self.client.login(username='normal', password=PASSWORD)
        for url in DASHBOARD_URLS:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 403)

    def test_admins_are_allowed(self):
        self.client.login(username='boss', password=PASSWORD)
        for url in DASHBOARD_URLS:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 200)


# ---------------------------------------------------------------
# The Users page (list, change, delete).
# ---------------------------------------------------------------

class AdminUsersTests(TestCase):
    def setUp(self):
        self.boss = User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        Story.objects.create(title='A', body='x', author=self.writer, is_published=True)
        profile = get_profile(self.writer)
        profile.role = 'author'
        profile.save()
        self.client.login(username='boss', password=PASSWORD)

    def patch(self, user, body):
        return self.client.patch(f'/api/dashboard/users/{user.id}/', body, content_type='application/x-www-form-urlencoded')

    def test_list_has_counts_and_roles(self):
        data = self.client.get('/api/dashboard/users/').json()
        self.assertEqual(data['counts'], {'total': 2, 'admins': 1, 'authors': 1, 'premium': 0})
        writer_row = [u for u in data['users'] if u['username'] == 'writer'][0]
        self.assertEqual(writer_row['role'], 'author')
        self.assertEqual(writer_row['story_count'], 1)

    def test_make_admin_verified_premium(self):
        response = self.patch(self.writer, 'role=admin&is_verified=true&is_premium=true')
        row = response.json()
        self.assertEqual((row['role'], row['is_verified'], row['is_premium']), ('admin', True, True))
        self.writer.refresh_from_db()
        self.assertTrue(self.writer.is_staff)

    def test_cannot_demote_or_delete_yourself(self):
        self.assertEqual(self.patch(self.boss, 'role=user').status_code, 400)
        self.assertEqual(self.client.delete(f'/api/dashboard/users/{self.boss.id}/').status_code, 400)

    def test_delete_someone_else(self):
        self.client.delete(f'/api/dashboard/users/{self.writer.id}/')
        self.assertFalse(User.objects.filter(username='writer').exists())

    def test_writing_a_story_makes_you_an_author(self):
        newbie = User.objects.create_user('newbie', password=PASSWORD)
        self.client.login(username='newbie', password=PASSWORD)
        category = Category.objects.create(name='Test', slug='test')
        self.client.post('/api/stories/new/', {'title': 'First', 'body': 'Once upon a time', 'category': category.id})
        self.assertEqual(get_profile(newbie).role, 'author')


# ---------------------------------------------------------------
# The Stories page.
# ---------------------------------------------------------------
class AdminStoriesTests(TestCase):
    def setUp(self):
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        writer = User.objects.create_user('writer', password=PASSWORD)
        self.live = Story.objects.create(title='Live', body='x', author=writer, is_published=True)
        self.draft = Story.objects.create(title='Draft', body='x', author=writer)
        self.client.login(username='boss', password=PASSWORD)

    def patch(self, story, body):
        return self.client.patch(f'/api/dashboard/stories/{story.id}/', body, content_type='application/x-www-form-urlencoded')

    def test_list_counts(self):
        data = self.client.get('/api/dashboard/stories/').json()
        self.assertEqual(data['counts'], {'total': 2, 'draft': 1, 'published': 1, 'archived': 0})

    def test_archive_hides_it_and_can_come_back(self):
        self.patch(self.live, 'status=archived')
        self.assertEqual(self.client.get('/api/stories/').json(), [])       # gone from the site

        self.patch(self.live, 'status=published')
        self.assertEqual(len(self.client.get('/api/stories/').json()), 1)   # back again

    def test_publish_a_draft_and_star_it(self):
        row = self.patch(self.draft, 'status=published&is_story_of_the_day=true').json()
        self.assertEqual((row['status'], row['is_story_of_the_day']), ('published', True))

    def test_delete(self):
        self.client.delete(f'/api/dashboard/stories/{self.draft.id}/')
        self.assertFalse(Story.objects.filter(id=self.draft.id).exists())
