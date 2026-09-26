import json
from types import SimpleNamespace
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase

from categories.models import Category
from stories.models import Story, Comment, LastWord
from .models import Report, Appeal, LoginEvent
from . import security


# Tests for reports, moderation, appeals, login security and the
# AI Generator. Run with:  python manage.py test
# (How tests work is explained at the top of accounts/tests.py.)

PASSWORD = 'Str0ng-pass-123'


def form(data):
    # PATCH in tests needs the body written out as text.
    return '&'.join(f'{key}={value}' for key, value in data.items())


class ReportTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.reader = User.objects.create_user('reader', password=PASSWORD)
        self.story = Story.objects.create(title='Story', body='x', author=self.writer, is_published=True)
        self.comment = Comment.objects.create(story=self.story, author=self.writer, body='nasty')

    def test_report_then_admin_removes_the_comment(self):
        self.client.login(username='reader', password=PASSWORD)
        response = self.client.post('/api/reports/', {'comment_id': self.comment.id, 'reason': 'harassment'})
        self.assertEqual(response.status_code, 201)

        # Reporting the same thing again while it's open: refused.
        again = self.client.post('/api/reports/', {'comment_id': self.comment.id, 'reason': 'spam'})
        self.assertEqual(again.status_code, 400)

        self.client.login(username='boss', password=PASSWORD)
        report = Report.objects.get()
        self.client.post(f'/api/dashboard/reports/{report.id}/', {'action': 'remove'})

        report.refresh_from_db()
        self.comment.refresh_from_db()
        self.assertEqual(report.status, 'resolved')
        self.assertTrue(self.comment.is_hidden)

        # Hidden comments are gone from the story page.
        comments = self.client.get(f'/api/stories/{self.story.id}/comments/').json()
        self.assertEqual(comments, [])

    def test_removing_a_reported_story_archives_it(self):
        self.client.login(username='reader', password=PASSWORD)
        self.client.post('/api/reports/', {'story_id': self.story.id, 'reason': 'copyright'})
        self.client.login(username='boss', password=PASSWORD)
        self.client.post(f'/api/dashboard/reports/{Report.objects.get().id}/', {'action': 'remove'})
        self.story.refresh_from_db()
        self.assertTrue(self.story.is_archived)

    def test_needs_a_valid_reason_and_one_target(self):
        self.client.login(username='reader', password=PASSWORD)
        self.assertEqual(self.client.post('/api/reports/', {'story_id': self.story.id, 'reason': 'nope'}).status_code, 400)
        both = {'story_id': self.story.id, 'comment_id': self.comment.id, 'reason': 'spam'}
        self.assertEqual(self.client.post('/api/reports/', both).status_code, 400)


class ModerationTests(TestCase):
    def test_hide_and_delete_last_words(self):
        admin = User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        quote = LastWord.objects.create(author=admin, body='Boo')
        self.client.login(username='boss', password=PASSWORD)

        self.client.patch(f'/api/dashboard/moderation/lastwords/{quote.id}/', form({'is_hidden': 'true'}),
                          content_type='application/x-www-form-urlencoded')
        self.assertEqual(self.client.get('/api/last-words/').json(), [])

        self.client.delete(f'/api/dashboard/moderation/lastwords/{quote.id}/')
        self.assertFalse(LastWord.objects.exists())


class AppealTests(TestCase):
    def setUp(self):
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.story = Story.objects.create(title='Mine', body='x', author=self.writer, is_published=True, is_archived=True)

    def test_appeal_accepted_brings_the_story_back(self):
        self.client.login(username='writer', password=PASSWORD)
        response = self.client.post('/api/appeals/', {'story_id': self.story.id, 'message': 'It is fiction!'})
        self.assertEqual(response.status_code, 201)

        # Only one pending appeal per story.
        again = self.client.post('/api/appeals/', {'story_id': self.story.id, 'message': 'Please'})
        self.assertEqual(again.status_code, 400)

        self.client.login(username='boss', password=PASSWORD)
        appeal = Appeal.objects.get()
        self.client.post(f'/api/dashboard/appeals/{appeal.id}/', {'decision': 'accept', 'note': 'Fair enough'})
        self.story.refresh_from_db()
        self.assertFalse(self.story.is_archived)

    def test_only_archived_stories(self):
        self.story.is_archived = False
        self.story.save()
        self.client.login(username='writer', password=PASSWORD)
        response = self.client.post('/api/appeals/', {'story_id': self.story.id, 'message': 'Hi'})
        self.assertEqual(response.status_code, 400)


class LoginSecurityTests(TestCase):
    def setUp(self):
        User.objects.create_user('victim', password=PASSWORD)

    def login(self, password):
        return self.client.post('/api/accounts/login/', {'username': 'victim', 'password': password})

    def test_every_attempt_is_logged(self):
        self.login('wrong')
        self.login(PASSWORD)
        self.assertEqual(list(LoginEvent.objects.order_by('id').values_list('success', flat=True)), [False, True])

    def test_locked_after_too_many_failures_even_with_right_password(self):
        for _ in range(security.MAX_FAILURES_PER_USERNAME):
            self.assertEqual(self.login('wrong').status_code, 400)

        self.assertEqual(self.login(PASSWORD).status_code, 429)

        # An admin unlocks it -> the right password works again.
        security.unlock(username='victim')
        self.assertEqual(self.login(PASSWORD).status_code, 200)

    def test_security_page_shows_the_lock(self):
        for _ in range(security.MAX_FAILURES_PER_USERNAME):
            self.login('wrong')
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.client.login(username='boss', password=PASSWORD)
        data = self.client.get('/api/dashboard/security/').json()
        self.assertEqual(data['locked']['usernames'], [{'value': 'victim', 'failures': 5}])
        self.assertEqual(data['last_24h']['failed'], 5)


class AIGeneratorTests(TestCase):
    def setUp(self):
        User.objects.create_user('boss', password=PASSWORD, is_staff=True)
        self.category = Category.objects.create(name='Haunted', slug='haunted')
        self.client.login(username='boss', password=PASSWORD)

    # mock.patch.dict: pretend this environment variable is (not) set,
    # only during this test.
    @mock.patch.dict('os.environ', {'ANTHROPIC_API_KEY': '', 'ANTHROPIC_AUTH_TOKEN': ''})
    def test_without_a_key_it_explains(self):
        self.assertFalse(self.client.get('/api/dashboard/ai/status/').json()['configured'])
        response = self.client.post('/api/dashboard/ai/generate/', {'idea': 'A lighthouse that counts ships'})
        self.assertEqual(response.status_code, 503)

    # A FAKE Claude: no internet, no cost. mock.patch swaps
    # anthropic.Anthropic for a pretend client that returns our answer.
    @mock.patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'})
    @mock.patch('dashboard.ai.anthropic.Anthropic')
    def test_generate_and_save(self, fake_client_class):
        story_json = json.dumps({'title': 'The Keeper', 'excerpt': 'It counts.', 'body': 'Once...'})
        fake_client_class.return_value.beta.messages.create.return_value = SimpleNamespace(
            stop_reason='end_turn',
            content=[SimpleNamespace(type='text', text=story_json)],
        )

        response = self.client.post('/api/dashboard/ai/generate/', {'idea': 'A lighthouse that counts ships', 'length': 'short'})
        self.assertEqual(response.json()['title'], 'The Keeper')

        # We asked for the right model and the JSON shape.
        call = fake_client_class.return_value.beta.messages.create.call_args.kwargs
        self.assertEqual(call['model'], 'claude-opus-5')
        self.assertEqual(call['output_config']['format']['type'], 'json_schema')

        saved = self.client.post('/api/dashboard/ai/save/', {
            'title': 'The Keeper', 'body': 'Once...', 'category_id': self.category.id, 'mood': 'creepy',
        })
        story = Story.objects.get(id=saved.json()['id'])
        self.assertFalse(story.is_published)   # always a draft

    @mock.patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'})
    @mock.patch('dashboard.ai.anthropic.Anthropic')
    def test_refusal_is_explained(self, fake_client_class):
        fake_client_class.return_value.beta.messages.create.return_value = SimpleNamespace(stop_reason='refusal', content=[])
        response = self.client.post('/api/dashboard/ai/generate/', {'idea': 'Something it will refuse'})
        self.assertEqual(response.status_code, 422)
