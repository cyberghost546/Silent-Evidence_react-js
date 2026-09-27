import json
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core import mail
from django.test import TestCase

from contact.models import ContactMessage
from dashboard.models import SiteSettings
from mailings.models import EmailTemplate
from moderation.models import ToxicityCheck
from stories.models import Story, Comment


# Tests for Email Templates, SEO, the Activity Heatmap and the AI
# Toxicity Queue. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class ToolsTestCase(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user('boss', email='boss@example.com', password=PASSWORD, is_staff=True)
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.client.force_login(self.admin)


class EmailTemplateTests(ToolsTestCase):
    def test_custom_wording_is_used_for_the_contact_reply(self):
        response = self.client.patch('/api/dashboard/email-templates/contact_reply/', {
            'subject': 'About: {subject}', 'body': 'Dear {name}, {reply}',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['is_custom'])

        message = ContactMessage.objects.create(name='Sam', email='sam@example.com', subject='other', message='Hi?')
        self.client.post(f'/api/dashboard/contact/{message.id}/', {'reply': 'Hello back'}, content_type='application/json')
        self.assertEqual(mail.outbox[-1].body, 'Dear Sam, Hello back')
        self.assertTrue(mail.outbox[-1].subject.startswith('About: '))

    def test_unknown_placeholder_is_refused(self):
        response = self.client.patch('/api/dashboard/email-templates/contact_reply/', {
            'subject': 'Hi', 'body': 'Dear {nmae}',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('{nmae}', response.json()['detail'])

    def test_reset_to_default(self):
        EmailTemplate.objects.create(key='support_reply', subject='x', body='y')
        response = self.client.delete('/api/dashboard/email-templates/support_reply/')
        self.assertFalse(response.json()['is_custom'])
        self.assertFalse(EmailTemplate.objects.exists())


class SeoTests(ToolsTestCase):
    def test_sitemap_lists_published_stories_only(self):
        public = Story.objects.create(title='Public story here', body='x', author=self.writer, is_published=True)
        draft = Story.objects.create(title='Draft story here', body='x', author=self.writer, is_published=False)
        xml = self.client.get('/sitemap.xml').content.decode()
        self.assertIn(f'/stories/{public.id}<', xml)
        self.assertNotIn(f'/stories/{draft.id}<', xml)

    def test_robots_follows_the_setting(self):
        self.assertIn('Allow: /', self.client.get('/robots.txt').content.decode())
        SiteSettings.objects.update_or_create(pk=1, defaults={'allow_indexing': False})
        self.assertIn('Disallow: /\n', self.client.get('/robots.txt').content.decode())

    def test_story_issues(self):
        Story.objects.create(title='Fog', body='short', author=self.writer, is_published=True)
        issues = self.client.get('/api/dashboard/seo/').json()['issues']
        self.assertEqual(issues[0]['title'], 'Fog')
        self.assertIn('Title is very short (under 10 characters)', issues[0]['problems'])


class HeatmapTests(ToolsTestCase):
    def test_counts_land_in_the_grid(self):
        story = Story.objects.create(title='S', body='x', author=self.writer, is_published=True)
        Comment.objects.create(story=story, author=self.writer, body='a')
        Comment.objects.create(story=story, author=self.writer, body='b')
        data = self.client.get('/api/dashboard/heatmap/?metric=comments&days=7').json()
        self.assertEqual(len(data['grid']), 7)
        self.assertEqual(len(data['grid'][0]), 24)
        self.assertEqual(data['total'], 2)
        self.assertEqual(data['busiest']['count'], 2)


# A pretend Claude answer, so the tests don't need an API key (or money).
def fake_claude(results):
    response = SimpleNamespace(
        stop_reason='end_turn',
        content=[SimpleNamespace(type='text', text=json.dumps({'results': results}))],
    )
    client = SimpleNamespace(beta=SimpleNamespace(messages=SimpleNamespace(create=lambda **kwargs: response)))
    return lambda: client


class ToxicityTests(ToolsTestCase):
    def setUp(self):
        super().setUp()
        story = Story.objects.create(title='S', body='x', author=self.writer, is_published=True)
        self.nice = Comment.objects.create(story=story, author=self.writer, body='Loved the ghost!')
        self.nasty = Comment.objects.create(story=story, author=self.writer, body='(something rude)')

    def test_scan_then_hide(self):
        results = [
            {'comment_id': self.nice.id, 'score': 3, 'category': 'none', 'reason': 'Friendly.'},
            {'comment_id': self.nasty.id, 'score': 88, 'category': 'harassment', 'reason': 'Insults the author.'},
            {'comment_id': 99999, 'score': 90, 'category': 'spam', 'reason': 'Not one we sent.'},
        ]
        with patch('dashboard.toxicity_views.ai_is_configured', return_value=True), \
             patch('dashboard.toxicity_views.anthropic.Anthropic', fake_claude(results)):
            answer = self.client.post('/api/dashboard/toxicity/scan/').json()
        self.assertEqual(answer, {'scanned': 2, 'flagged': 1})

        queue = self.client.get('/api/dashboard/toxicity/').json()
        self.assertEqual([item['comment_id'] for item in queue['items']], [self.nasty.id])
        self.assertEqual(queue['unscanned'], 0)

        check = ToxicityCheck.objects.get(comment=self.nasty)
        self.client.post(f'/api/dashboard/toxicity/{check.id}/', {'action': 'hide'}, content_type='application/json')
        self.nasty.refresh_from_db()
        self.assertTrue(self.nasty.is_hidden)

    def test_no_key_explains_itself(self):
        with patch('dashboard.toxicity_views.ai_is_configured', return_value=False):
            response = self.client.post('/api/dashboard/toxicity/scan/')
        self.assertEqual(response.status_code, 503)
