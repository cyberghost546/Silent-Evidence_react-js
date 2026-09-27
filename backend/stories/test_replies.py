from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import Notification
from stories.models import Story, Comment


# Tests for comment replies. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class ReplyTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.fan = User.objects.create_user('fan', password=PASSWORD)
        self.other = User.objects.create_user('other', password=PASSWORD)
        self.story = Story.objects.create(title='Fog', body='x', author=self.writer, is_published=True)
        self.top = Comment.objects.create(story=self.story, author=self.fan, body='Loved it')
        self.url = f'/api/stories/{self.story.id}/comments/'

    def reply(self, parent_id, body='Me too'):
        return self.client.post(self.url, {'body': body, 'parent': parent_id}, content_type='application/json')

    def test_reply_is_saved_under_the_comment_and_notifies_its_author(self):
        self.client.force_login(self.other)
        response = self.reply(self.top.id)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['parent'], self.top.id)

        self.assertTrue(Notification.objects.filter(recipient=self.fan, kind='reply').exists())
        # The story's author hears about it too.
        self.assertTrue(Notification.objects.filter(recipient=self.writer, kind='comment').exists())

    def test_reply_to_a_reply_goes_under_the_top_comment(self):
        self.client.force_login(self.other)
        first = self.reply(self.top.id).json()
        second = self.reply(first['id'], 'Replying to the reply').json()
        self.assertEqual(second['parent'], self.top.id)

    def test_cant_reply_to_a_comment_on_another_story(self):
        elsewhere = Story.objects.create(title='Other', body='x', author=self.writer, is_published=True)
        stranger = Comment.objects.create(story=elsewhere, author=self.fan, body='hi')
        self.client.force_login(self.other)
        self.assertEqual(self.reply(stranger.id).status_code, 400)

    def test_replies_under_a_hidden_comment_are_hidden_too(self):
        Comment.objects.create(story=self.story, author=self.other, body='Reply', parent=self.top)
        self.top.is_hidden = True
        self.top.save()
        comments = self.client.get(self.url).json()
        self.assertEqual(comments, [])

    def test_author_answering_on_their_own_story_gets_no_self_notification(self):
        # The writer replies to the fan: the fan gets "reply", and the
        # writer gets nothing (it's their own comment on their own story).
        self.client.force_login(self.writer)
        self.reply(self.top.id)
        self.assertEqual(list(Notification.objects.values_list('recipient__username', 'kind')), [('fan', 'reply')])
