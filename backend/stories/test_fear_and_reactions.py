from django.contrib.auth.models import User
from django.test import TestCase

from stories.models import Story


# Tests for the fear meter and reactions. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class FearMeterTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.readers = [User.objects.create_user(f'reader{n}', password=PASSWORD) for n in range(3)]
        self.story = Story.objects.create(title='The Red Door', body='x', author=self.writer, is_published=True)
        self.url = f'/api/stories/{self.story.id}/fear/'

    def rate(self, user, score):
        self.client.force_login(user)
        return self.client.post(self.url, {'score': score}, content_type='application/json')

    def test_average_of_the_ratings(self):
        for reader, score in zip(self.readers, [5, 4, 3]):
            self.rate(reader, score)
        data = self.client.get(f'/api/stories/{self.story.id}/').json()['fear']
        self.assertEqual((data['average'], data['votes']), (4.0, 3))

    def test_changing_your_rating_does_not_add_a_vote(self):
        self.rate(self.readers[0], 2)
        answer = self.rate(self.readers[0], 5).json()
        self.assertEqual((answer['average'], answer['votes'], answer['mine']), (5.0, 1, 5))

    def test_no_rating_your_own_story_or_silly_scores(self):
        self.assertEqual(self.rate(self.writer, 5).status_code, 400)
        self.assertEqual(self.rate(self.readers[0], 9).status_code, 400)
        self.assertEqual(self.rate(self.readers[0], 'lots').status_code, 400)

    def test_sort_by_scariest(self):
        mild = Story.objects.create(title='Mild', body='x', author=self.writer, is_published=True)
        self.rate(self.readers[0], 5)                       # The Red Door: 5
        self.client.force_login(self.readers[1])
        self.client.post(f'/api/stories/{mild.id}/fear/', {'score': 1}, content_type='application/json')
        Story.objects.create(title='Unrated', body='x', author=self.writer, is_published=True)

        titles = [story['title'] for story in self.client.get('/api/stories/?sort=scariest').json()]
        self.assertEqual(titles, ['The Red Door', 'Mild'])   # unrated ones are left out


class ReactionTests(TestCase):
    def test_click_on_click_off(self):
        writer = User.objects.create_user('writer', password=PASSWORD)
        reader = User.objects.create_user('reader', password=PASSWORD)
        story = Story.objects.create(title='T', body='x', author=writer, is_published=True)
        self.client.force_login(reader)
        url = f'/api/stories/{story.id}/react/'

        answer = self.client.post(url, {'kind': 'got_me'}, content_type='application/json').json()
        self.assertEqual((answer['counts']['got_me'], answer['mine']), (1, ['got_me']))

        answer = self.client.post(url, {'kind': 'got_me'}, content_type='application/json').json()
        self.assertEqual((answer['counts']['got_me'], answer['mine']), (0, []))

        self.assertEqual(self.client.post(url, {'kind': 'bored'}, content_type='application/json').status_code, 400)
