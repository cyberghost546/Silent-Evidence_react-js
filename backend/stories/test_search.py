from django.contrib.auth.models import User
from django.test import TestCase

from stories.models import Story, Tag


# Tests for the better search (stories/search.py). Run with:  python manage.py test
# (These run on SQLite. The extra Postgres search is used on the live site.)

PASSWORD = 'Str0ng-pass-123'


class BetterSearchTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('keeper', password=PASSWORD)

    def story(self, title, body='Nothing special.', views=0, tags=()):
        story = Story.objects.create(title=title, body=body, author=self.writer, is_published=True, views=views)
        for name in tags:
            story.tags.add(Tag.objects.get_or_create(name=name)[0])
        return story

    def titles(self, query):
        return [s['title'] for s in self.client.get('/api/search/', {'q': query}).json()['stories']]

    def test_words_in_any_order_and_any_place(self):
        self.story('The Lighthouse', tags=['haunted'])
        self.story('Haunted Hotel')   # no "lighthouse" anywhere
        self.assertEqual(self.titles('haunted lighthouse'), ['The Lighthouse'])

    def test_a_title_match_beats_a_popular_body_match(self):
        self.story('Night Shift', body='The mirror was cracked.', views=5000)
        self.story('The Mirror', views=3)
        self.assertEqual(self.titles('mirror'), ['The Mirror', 'Night Shift'])

    def test_the_exact_phrase_in_the_title_comes_first(self):
        self.story('Room Under the Stairs')
        self.story('The Stairs Room')
        self.assertEqual(self.titles('under the stairs')[0], 'Room Under the Stairs')

    def test_author_names_and_punctuation(self):
        self.story('Quiet Night')
        self.assertEqual(self.titles('keeper,'), ['Quiet Night'])
        self.assertEqual(self.titles('a'), [])   # too short to mean anything
