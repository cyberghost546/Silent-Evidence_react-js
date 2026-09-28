from django.contrib.auth.models import User
from django.test import TestCase

from stories.models import Story


# Tests for the "Support the writer" link (Profile.tip_url).
# Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class SupportLinkTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('lantern', password=PASSWORD)
        self.client.force_login(self.writer)

    def set_link(self, url):
        return self.client.patch('/api/accounts/settings/', {'tip_url': url}, content_type='application/json')

    def test_known_tipping_sites_are_accepted_and_shown(self):
        self.assertEqual(self.set_link('https://ko-fi.com/lantern').status_code, 200)
        story = Story.objects.create(title='The Well', body='word ' * 50, author=self.writer, is_published=True)
        self.client.logout()
        self.assertEqual(self.client.get(f'/api/stories/{story.id}/').json()['author_tip_url'], 'https://ko-fi.com/lantern')
        self.assertEqual(self.client.get('/api/accounts/profile/lantern/').json()['tip_url'], 'https://ko-fi.com/lantern')

    def test_other_sites_are_refused(self):
        for url in [
            'https://evil-payments.example/lantern',      # not a tipping site
            'https://ko-fi.com.evil.example/lantern',     # looks like Ko-fi, isn't
            'http://ko-fi.com/lantern',                   # not https
            'https://github.com/lantern',                 # GitHub, but not a Sponsors page
            'javascript:alert(1)',
        ]:
            with self.subTest(url=url):
                response = self.set_link(url)
                self.assertEqual(response.status_code, 400)
                self.assertIn('tip_url', response.json())

    def test_github_sponsors_and_removing_the_link(self):
        self.assertEqual(self.set_link('https://github.com/sponsors/lantern').status_code, 200)
        self.assertEqual(self.set_link('').status_code, 200)   # empty = no button
