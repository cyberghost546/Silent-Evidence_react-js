from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase

from sitecontent.video_views import youtube_id_from


# Tests for the Videos page. Run with:  python manage.py test

class YoutubeLinkTests(SimpleTestCase):
    def test_every_usual_kind_of_link(self):
        for url in [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ',
            'https://youtu.be/dQw4w9WgXcQ',
            'https://www.youtube.com/shorts/dQw4w9WgXcQ',
            'https://www.youtube.com/embed/dQw4w9WgXcQ',
        ]:
            self.assertEqual(youtube_id_from(url), 'dQw4w9WgXcQ', url)

    def test_not_youtube(self):
        self.assertIsNone(youtube_id_from('https://vimeo.com/12345'))
        self.assertIsNone(youtube_id_from(''))


class VideoApiTests(TestCase):
    def test_admin_adds_anyone_sees(self):
        boss = User.objects.create_user('boss', password='Str0ng-pass-123', is_staff=True)
        self.client.force_login(boss)
        response = self.client.post('/api/dashboard/videos/', {
            'url': 'https://youtu.be/dQw4w9WgXcQ', 'title': 'The Lighthouse Keeper - read aloud',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)

        self.client.logout()
        videos = self.client.get('/api/videos/').json()
        self.assertEqual(videos[0]['youtube_id'], 'dQw4w9WgXcQ')
        self.assertNotIn('url', videos[0])

    def test_members_cant_add(self):
        member = User.objects.create_user('member', password='Str0ng-pass-123')
        self.client.force_login(member)
        response = self.client.post('/api/dashboard/videos/', {'url': 'https://youtu.be/dQw4w9WgXcQ', 'title': 'x'}, content_type='application/json')
        self.assertEqual(response.status_code, 403)

    def test_bad_link_is_refused(self):
        boss = User.objects.create_user('boss', password='Str0ng-pass-123', is_staff=True)
        self.client.force_login(boss)
        response = self.client.post('/api/dashboard/videos/', {'url': 'https://example.com', 'title': 'x'}, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('url', response.json())
