import json
import os
from types import SimpleNamespace
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase

from stories.models import Story, WritingFeedback


# Tests for private feedback from Claude. Run with:  python manage.py test
#
# Claude is FAKED here - no key needed, no money spent. The fake gives
# back the same shape as the real API: stop_reason + content blocks.

PASSWORD = 'Str0ng-pass-123'
FEEDBACK = {
    'overall': 'A tense, well-paced story.',
    'strengths': ['The cellar scene', 'Short sentences at the end'],
    'suggestions': [{'area': 'Opening', 'note': 'Start closer to the knock.'}],
    'scares': 'The final line lands.',
}


def fake_claude(answer=FEEDBACK, stop_reason='end_turn'):
    response = SimpleNamespace(stop_reason=stop_reason, content=[SimpleNamespace(type='text', text=json.dumps(answer))])
    client = mock.Mock()
    client.beta.messages.create.return_value = response
    return mock.patch('stories.feedback_views.anthropic.Anthropic', return_value=client), client


@mock.patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key-not-real'})
class FeedbackTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.story = Story.objects.create(title='The Well', body='word ' * 150, author=self.writer, is_published=False)
        self.client.force_login(self.writer)

    def ask(self):
        return self.client.post(f'/api/stories/{self.story.id}/feedback/')

    def test_feedback_is_saved_and_shown(self):
        patch, client = fake_claude()
        with patch:
            response = self.ask()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['feedback']['overall'], 'A tense, well-paced story.')
        self.assertEqual(response.json()['remaining_today'], 2)
        # What Claude was sent: the story, with our instructions.
        sent = client.beta.messages.create.call_args.kwargs
        self.assertIn('The Well', sent['messages'][0]['content'])
        self.assertIn('Do not rewrite the story', sent['system'])
        self.assertEqual(WritingFeedback.objects.count(), 1)

    def test_three_a_day(self):
        patch, _ = fake_claude()
        with patch:
            for _ in range(3):
                self.assertEqual(self.ask().status_code, 201)
            self.assertEqual(self.ask().status_code, 429)

    def test_only_your_own_story(self):
        User.objects.create_user('stranger', password=PASSWORD)
        self.client.login(username='stranger', password=PASSWORD)
        patch, client = fake_claude()
        with patch:
            self.assertEqual(self.ask().status_code, 404)
        client.beta.messages.create.assert_not_called()

    def test_too_short_and_refusals(self):
        self.story.body = 'Too short.'
        self.story.save()
        self.assertEqual(self.ask().status_code, 400)
        self.story.body = 'word ' * 150
        self.story.save()
        patch, _ = fake_claude(stop_reason='refusal')
        with patch:
            self.assertEqual(self.ask().status_code, 422)
        self.assertFalse(WritingFeedback.objects.exists())   # nothing saved, nothing counted


class FeedbackSwitchedOffTests(TestCase):
    def test_without_a_key(self):
        writer = User.objects.create_user('writer', password=PASSWORD)
        story = Story.objects.create(title='X', body='word ' * 150, author=writer)
        self.client.force_login(writer)
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertFalse(self.client.get(f'/api/stories/{story.id}/feedback/').json()['configured'])
            self.assertEqual(self.client.post(f'/api/stories/{story.id}/feedback/').status_code, 503)
