from django.contrib.auth.models import User
from django.test import TestCase

from categories.models import Category
from stories.models import Series, Story


# Tests for story series. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class SeriesTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        self.category = Category.objects.create(name='Fog', slug='fog')
        self.client.force_login(self.writer)

    def write_story(self, title, series_id):
        return self.client.post('/api/stories/new/', {
            'title': title, 'body': 'Some text.', 'category': self.category.id,
            'series': series_id, 'is_published': 'true',
        })

    def test_parts_are_numbered_and_linked(self):
        series = self.client.post('/api/series/mine/', {'title': 'The Lighthouse Diaries'}, content_type='application/json').json()
        first = self.write_story('Night one', series['id']).json()
        second = self.write_story('Night two', series['id']).json()

        self.assertEqual(Story.objects.get(pk=second['id']).series_part, 2)

        info = self.client.get(f"/api/stories/{first['id']}/").json()['series']
        self.assertEqual((info['part'], info['total']), (1, 2))
        self.assertIsNone(info['previous'])
        self.assertEqual(info['next']['title'], 'Night two')

        page = self.client.get(f"/api/series/{series['id']}/").json()
        self.assertEqual([part['title'] for part in page['parts']], ['Night one', 'Night two'])

    def test_cant_add_to_someone_elses_series(self):
        stranger = User.objects.create_user('stranger', password=PASSWORD)
        theirs = Series.objects.create(author=stranger, title='Not yours')
        response = self.write_story('Sneaky', theirs.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn('series', response.json())

    def test_drafts_are_not_shown_as_next(self):
        series = Series.objects.create(author=self.writer, title='Tales')
        Story.objects.create(title='Out now', body='x', author=self.writer, category=self.category,
                             is_published=True, series=series, series_part=1)
        draft = Story.objects.create(title='Not yet', body='x', author=self.writer, category=self.category,
                                     is_published=False, series=series, series_part=2)
        self.client.logout()
        page = self.client.get(f'/api/series/{series.id}/').json()
        self.assertNotIn(draft.id, [part['id'] for part in page['parts']])
