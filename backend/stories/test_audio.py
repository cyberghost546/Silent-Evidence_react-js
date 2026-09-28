import shutil
import tempfile

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from categories.models import Category
from stories.models import Story


# Tests for the writer's own narration (Story.audio_file).
# Run with:  python manage.py test
#
# override_settings(MEDIA_ROOT=...): uploads made by these tests go to
# a temporary folder that is deleted afterwards - not into media/.
TEMP_MEDIA = tempfile.mkdtemp()
PASSWORD = 'Str0ng-pass-123'


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class StoryAudioTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)

    def setUp(self):
        self.writer = User.objects.create_user('narrator', password=PASSWORD)
        self.client.force_login(self.writer)
        self.category = Category.objects.first() or Category.objects.create(name='Test', slug='test')

    def publish(self, audio, **extra):
        data = {'title': 'The Well', 'body': 'word ' * 60, 'category': self.category.id, 'is_published': 'true', 'audio_file': audio, **extra}
        return self.client.post('/api/stories/new/', data)   # multipart, like the Write page

    def test_a_recording_is_saved_and_played_on_the_story_page(self):
        sound = SimpleUploadedFile('reading.mp3', b'ID3 fake mp3 bytes', content_type='audio/mpeg')
        self.assertEqual(self.publish(sound).status_code, 201)
        story = Story.objects.get(title='The Well')
        self.assertTrue(story.audio_file.name.startswith('audio/'))
        audio = self.client.get(f'/api/stories/{story.id}/').json()['audio']
        self.assertTrue(audio.startswith('/media/audio/'))

    def test_only_sound_files(self):
        for name, content_type in [('virus.exe', 'application/octet-stream'), ('song.mp3', 'text/html'), ('page.html', 'audio/mpeg')]:
            with self.subTest(name=name):
                response = self.publish(SimpleUploadedFile(name, b'x', content_type=content_type))
                self.assertEqual(response.status_code, 400)
                self.assertIn('audio_file', response.json())

    def test_a_locked_18_plus_story_does_not_give_away_its_audio(self):
        sound = SimpleUploadedFile('reading.mp3', b'ID3 fake', content_type='audio/mpeg')
        self.publish(sound, content_rating='mature')
        story = Story.objects.get(title='The Well')
        self.client.logout()
        data = self.client.get(f'/api/stories/{story.id}/').json()
        self.assertEqual((data['lock'], data['audio']), ('login', ''))
