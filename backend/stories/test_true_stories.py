from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import Notification
from stories.models import Story, TrueStorySubmission


# Tests for anonymous true stories. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'
BODY = 'It was late and the house was quiet when I heard it. ' * 6   # 66 words


class TrueStoryTests(TestCase):
    def setUp(self):
        self.member = User.objects.create_user('witness', password=PASSWORD)
        self.admin = User.objects.create_user('boss', password=PASSWORD, is_staff=True)

    def submit(self, **extra):
        self.client.force_login(self.member)
        data = {'title': 'The Knock', 'body': BODY, 'where_when': 'Ohio, 2009', 'confirm_true': True, **extra}
        return self.client.post('/api/true-stories/', data, content_type='application/json')

    def test_approve_publishes_it_as_anonymous(self):
        item_id = self.submit().json()['id']
        self.client.force_login(self.admin)
        pending = self.client.get('/api/dashboard/true-stories/').json()
        self.assertEqual(pending[0]['submitted_by'], 'witness')   # admins can see who sent it

        self.client.post(f'/api/dashboard/true-stories/{item_id}/approve/', {'content_rating': 'teen'}, content_type='application/json')
        story = Story.objects.get(title='The Knock')
        self.assertEqual(story.author.username, 'Anonymous')
        self.assertFalse(story.author.is_active)
        self.assertEqual(story.location, 'Ohio, 2009')
        self.assertEqual(list(story.tags.values_list('name', flat=True)), ['true-story'])

        # The public story never mentions the real sender...
        self.client.logout()
        public = self.client.get(f'/api/stories/{story.id}/').content.decode()
        self.assertNotIn('witness', public)
        # ...but they get told it went live (without naming the admin).
        note = Notification.objects.get(recipient=self.member)
        self.assertIsNone(note.actor)
        self.assertEqual(note.link, f'/stories/{story.id}')

    def test_reject_with_a_reason(self):
        item_id = self.submit().json()['id']
        self.client.force_login(self.admin)
        self.client.post(f'/api/dashboard/true-stories/{item_id}/reject/', {'note': 'Too short on details.'}, content_type='application/json')
        self.client.force_login(self.member)
        mine = self.client.get('/api/true-stories/').json()
        self.assertEqual((mine[0]['status'], mine[0]['admin_note']), ('rejected', 'Too short on details.'))
        self.assertFalse(Story.objects.exists())

    def test_the_rules(self):
        self.assertEqual(self.submit(confirm_true=False).status_code, 400)
        self.assertEqual(self.submit(body='Too short.').status_code, 400)
        # Members can't use the admin pages.
        self.assertEqual(self.client.get('/api/dashboard/true-stories/').status_code, 403)
        # Take back a waiting one - but not someone else's.
        item_id = self.submit().json()['id']
        self.client.force_login(self.admin)
        self.assertEqual(self.client.delete(f'/api/true-stories/{item_id}/').status_code, 404)
        self.client.force_login(self.member)
        self.assertEqual(self.client.delete(f'/api/true-stories/{item_id}/').status_code, 204)
        self.assertFalse(TrueStorySubmission.objects.exists())

    def test_nobody_can_be_called_anonymous(self):
        response = self.client.post('/api/accounts/signup/', {'username': 'anonymous', 'email': 'a@example.com', 'password': 'Str0ng-pass-123'})
        self.assertIn('username', response.json())
