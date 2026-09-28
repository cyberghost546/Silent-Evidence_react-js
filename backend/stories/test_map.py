from django.contrib.auth.models import User
from django.test import TestCase

from stories.models import Story, Tag, TrueStorySubmission


# Tests for the Haunted Map. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'
BODY = 'It was late and the house was quiet when I heard it. ' * 6


class HauntedMapTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)

    def test_the_map_lists_stories_with_a_place(self):
        pinned = Story.objects.create(title='Lighthouse', body='x', author=self.writer, is_published=True, latitude=51.5, longitude=-0.12, location='London')
        Story.objects.create(title='Nowhere', body='x', author=self.writer, is_published=True)
        Story.objects.create(title='Draft', body='x', author=self.writer, is_published=False, latitude=1, longitude=1)
        pinned.tags.add(Tag.objects.create(name='true-story'))
        pins = self.client.get('/api/stories/map/').json()
        self.assertEqual(pins, [{'id': pinned.id, 'title': 'Lighthouse', 'author': 'writer', 'location': 'London', 'lat': 51.5, 'lng': -0.12, 'is_true': True}])

    def test_a_true_story_pin_is_blurred_to_about_a_kilometre(self):
        self.client.force_login(self.writer)
        self.client.post('/api/true-stories/', {
            'title': 'The Knock', 'body': BODY, 'confirm_true': True,
            'latitude': 40.712776, 'longitude': -74.005974,   # a precise spot
        }, content_type='application/json')
        item = TrueStorySubmission.objects.get()
        self.assertEqual((str(item.latitude), str(item.longitude)), ('40.710000', '-74.010000'))

    def test_nonsense_places_are_ignored(self):
        self.client.force_login(self.writer)
        self.client.post('/api/true-stories/', {'title': 'X', 'body': BODY, 'confirm_true': True, 'latitude': 999, 'longitude': 'abc'}, content_type='application/json')
        self.assertIsNone(TrueStorySubmission.objects.get().latitude)
