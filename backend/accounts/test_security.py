import io
import os

from PIL import Image
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from categories.models import Category


# Tests for the security fixes: sign-up spam brake, cover image size,
# story length. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class SignUpThrottleTests(TestCase):
    def setUp(self):
        # Throttles count in the cache - start every test from zero.
        cache.clear()

    def test_eleventh_signup_in_an_hour_is_refused(self):
        for n in range(10):
            response = self.client.post('/api/accounts/signup/', {
                'username': f'bot{n}', 'email': f'bot{n}@example.com', 'password': PASSWORD, 'password2': PASSWORD,
            }, content_type='application/json')
            self.assertEqual(response.status_code, 201, response.content)
            self.client.logout()
        response = self.client.post('/api/accounts/signup/', {
            'username': 'bot10', 'email': 'bot10@example.com', 'password': PASSWORD, 'password2': PASSWORD,
        }, content_type='application/json')
        self.assertEqual(response.status_code, 429)


class StoryLimitTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.client.force_login(self.writer)
        self.category = Category.objects.create(name='Fog', slug='fog')

    def post_story(self, **extra):
        data = {'title': 'A title', 'body': 'Some text.', 'category': self.category.id, **extra}
        return self.client.post('/api/stories/new/', data)   # multipart, like the Write page

    def test_huge_cover_image_is_refused(self):
        # A REAL picture that's over 5 MB: 1500x1500 random-noise pixels
        # (noise can't be compressed, so the PNG stays ~6.7 MB).
        # It must be real - otherwise Django refuses it as "not an
        # image" before our size check even runs.
        picture = Image.frombytes('RGB', (1500, 1500), os.urandom(1500 * 1500 * 3))
        buffer = io.BytesIO()
        picture.save(buffer, format='PNG')
        big = SimpleUploadedFile('big.png', buffer.getvalue(), content_type='image/png')

        response = self.post_story(cover_image=big)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['cover_image'], ['The image must be smaller than 5 MB.'])

    def test_very_long_story_is_refused(self):
        response = self.post_story(body='x' * 100_001)
        self.assertEqual(response.status_code, 400)
        self.assertIn('body', response.json())
