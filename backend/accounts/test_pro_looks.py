from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import get_profile
from stories.models import Comment, Story


# THE PRO LOOKS: the PRO badge, a name colour and the Gold Crown border.
# Run with:  python manage.py test accounts.test_pro_looks

PASSWORD = 'Str0ng-pass-123'


class ProLooksTests(TestCase):
    def setUp(self):
        self.pro = User.objects.create_user('pro', password=PASSWORD)
        self.set_pro(self.pro, True)
        self.free = User.objects.create_user('free', password=PASSWORD)

    def set_pro(self, user, on):
        profile = get_profile(user)
        profile.is_premium = on
        profile.save()

    def save_settings(self, user, **values):
        self.client.force_login(user)
        return self.client.patch('/api/accounts/settings/', values, content_type='application/json')

    def test_pro_can_pick_a_colour_and_the_gold_border(self):
        answer = self.save_settings(self.pro, name_color='ember', avatar_border='gold')
        self.assertEqual(answer.status_code, 200, answer.content)
        profile = self.client.get('/api/accounts/profile/pro/').json()
        self.assertEqual((profile['is_pro'], profile['name_color'], profile['avatar_border']), (True, 'ember', 'gold'))

    def test_free_members_cannot_pick_them(self):
        self.assertEqual(self.save_settings(self.free, name_color='ember').status_code, 400)
        self.assertEqual(self.save_settings(self.free, avatar_border='gold').status_code, 400)
        # The free borders still work for everyone.
        self.assertEqual(self.save_settings(self.free, avatar_border='pulse').status_code, 200)
        profile = self.client.get('/api/accounts/profile/free/').json()
        self.assertEqual((profile['is_pro'], profile['avatar_border']), (False, 'pulse'))

    def test_the_looks_hide_when_pro_runs_out_and_come_back(self):
        self.save_settings(self.pro, name_color='toxic', avatar_border='gold')
        self.set_pro(self.pro, False)
        profile = self.client.get('/api/accounts/profile/pro/').json()
        self.assertEqual((profile['name_color'], profile['avatar_border']), ('', 'none'))

        self.set_pro(self.pro, True)
        profile = self.client.get('/api/accounts/profile/pro/').json()
        self.assertEqual((profile['name_color'], profile['avatar_border']), ('toxic', 'gold'))

    def test_comments_and_stories_carry_the_look(self):
        self.save_settings(self.pro, name_color='void')
        story = Story.objects.create(title='Hush', body='word ' * 50, author=self.pro, is_published=True)
        Comment.objects.create(story=story, author=self.pro, body='Thanks for reading!')
        Comment.objects.create(story=story, author=self.free, body='Scary.')

        comments = self.client.get(f'/api/stories/{story.id}/comments/').json()
        # The list might be paginated or not - take the rows either way.
        rows = comments['results'] if isinstance(comments, dict) else comments
        looks = {row['author']: row['author_look'] for row in rows}
        self.assertEqual(looks['pro'], {'is_pro': True, 'name_color': 'void'})
        self.assertEqual(looks['free'], {'is_pro': False, 'name_color': ''})

        self.assertEqual(self.client.get(f'/api/stories/{story.id}/').json()['author_look'], {'is_pro': True, 'name_color': 'void'})
