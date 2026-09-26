from django.contrib.auth.models import User
from django.core import mail
from django.core.management import call_command
from django.test import TestCase

from accounts.models import get_profile
from contact.models import ContactMessage
from stories.models import Story, Comment
from support.models import SupportTicket


# Tests for the Contact Inbox, User Support, Newsletter and Comment
# Digest. Run with:  python manage.py test
#
# mail.outbox: during tests Django doesn't print or send emails - it
# collects them in the list django.core.mail.outbox, so a test can
# check what WOULD have been sent.

PASSWORD = 'Str0ng-pass-123'


class ContactInboxTests(TestCase):
    def test_reply_is_emailed_and_marks_it_handled(self):
        User.objects.create_user('boss', 'boss@example.com', PASSWORD, is_staff=True)
        message = ContactMessage.objects.create(name='Ann', email='ann@example.com', subject='bug', message='Broken!')

        self.client.login(username='boss', password=PASSWORD)
        self.assertEqual(self.client.get('/api/dashboard/contact/').json()['counts']['new'], 1)

        self.client.post(f'/api/dashboard/contact/{message.id}/', {'reply': 'Fixed, thanks!'})
        message.refresh_from_db()
        self.assertTrue(message.is_handled)
        self.assertEqual(mail.outbox[0].to, ['ann@example.com'])
        self.assertIn('Fixed, thanks!', mail.outbox[0].body)


class SupportTests(TestCase):
    def setUp(self):
        self.member = User.objects.create_user('member', 'member@example.com', PASSWORD)
        User.objects.create_user('boss', 'boss@example.com', PASSWORD, is_staff=True)
        User.objects.create_user('stranger', 'x@example.com', PASSWORD)

    def test_ticket_conversation(self):
        self.client.login(username='member', password=PASSWORD)
        ticket = self.client.post('/api/support/', {'subject': 'Avatar', 'body': 'Upload fails'}).json()
        self.assertEqual(ticket['status'], 'open')

        # An admin answers -> 'answered' + an email to the member.
        self.client.login(username='boss', password=PASSWORD)
        answered = self.client.post(f"/api/support/{ticket['id']}/", {'body': 'Try a smaller image'}).json()
        self.assertEqual(answered['status'], 'answered')
        self.assertTrue(answered['messages'][1]['from_staff'])
        self.assertEqual(mail.outbox[0].to, ['member@example.com'])

        # The member writes again -> back to 'open'.
        self.client.login(username='member', password=PASSWORD)
        again = self.client.post(f"/api/support/{ticket['id']}/", {'body': 'Still broken'}).json()
        self.assertEqual(again['status'], 'open')

    def test_strangers_cannot_see_a_ticket(self):
        ticket = SupportTicket.objects.create(user=self.member, subject='Private')
        self.client.login(username='stranger', password=PASSWORD)
        self.assertEqual(self.client.get(f'/api/support/{ticket.id}/').status_code, 404)


class NewsletterTests(TestCase):
    def test_only_to_members_who_want_it(self):
        User.objects.create_user('boss', 'boss@example.com', PASSWORD, is_staff=True)
        User.objects.create_user('fan', 'fan@example.com', PASSWORD)
        no_thanks = User.objects.create_user('quiet', 'quiet@example.com', PASSWORD)
        profile = get_profile(no_thanks)
        profile.weekly_digest = False
        profile.save()

        self.client.login(username='boss', password=PASSWORD)
        self.client.post('/api/dashboard/newsletter/', {'subject': 'October', 'body': 'New challenge!'})

        sent_to = sorted(address for email in mail.outbox for address in email.to)
        self.assertEqual(sent_to, ['boss@example.com', 'fan@example.com'])

    def test_test_email_only_goes_to_you(self):
        User.objects.create_user('boss', 'boss@example.com', PASSWORD, is_staff=True)
        User.objects.create_user('fan', 'fan@example.com', PASSWORD)
        self.client.login(username='boss', password=PASSWORD)
        self.client.post('/api/dashboard/newsletter/', {'subject': 'Hi', 'body': 'x', 'test_only': 'true'})
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['boss@example.com'])


class CommentDigestTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', 'writer@example.com', PASSWORD)
        reader = User.objects.create_user('reader', 'reader@example.com', PASSWORD)
        story = Story.objects.create(title='Mine', body='x', author=self.writer, is_published=True)
        Comment.objects.create(story=story, author=reader, body='Great story')
        Comment.objects.create(story=story, author=self.writer, body='Thanks')   # own: not counted

    def test_weekly_digest_command(self):
        call_command('send_comment_digests', 'weekly')
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('reader: Great story', mail.outbox[0].body)
        self.assertNotIn('Thanks', mail.outbox[0].body)

    def test_members_who_chose_never_get_nothing(self):
        profile = get_profile(self.writer)
        profile.comment_digest = 'never'
        profile.save()
        call_command('send_comment_digests', 'weekly')
        self.assertEqual(mail.outbox, [])
