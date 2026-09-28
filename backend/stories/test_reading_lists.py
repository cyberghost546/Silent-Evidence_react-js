from django.contrib.auth.models import User
from django.test import TestCase

from stories.models import ReadingList, Story


# Tests for reading lists. Run with:  python manage.py test

PASSWORD = 'Str0ng-pass-123'


class ReadingListTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user('curator', password=PASSWORD)
        self.other = User.objects.create_user('stranger', password=PASSWORD)
        self.story = Story.objects.create(title='The Well', body='word ' * 50, author=self.other, is_published=True)
        self.draft = Story.objects.create(title='Secret Draft', body='word ' * 50, author=self.other, is_published=False)

    def make_list(self, **extra):
        self.client.force_login(self.owner)
        data = {'title': 'Winter reads', 'description': 'Cold ones.', 'is_public': True, **extra}
        return self.client.post('/api/reading-lists/', data, content_type='application/json').json()['id']

    def test_make_a_list_add_a_story_and_share_it(self):
        list_id = self.make_list()
        self.assertEqual(self.client.post(f'/api/reading-lists/{list_id}/stories/{self.story.id}/').status_code, 200)

        # Anyone - even logged out - can open a public list.
        self.client.logout()
        data = self.client.get(f'/api/reading-lists/{list_id}/').json()
        self.assertEqual((data['title'], data['owner'], data['story_count']), ('Winter reads', 'curator', 1))
        self.assertEqual(data['stories'][0]['title'], 'The Well')
        self.assertFalse(data['is_mine'])

    def test_private_lists_are_invisible_to_others(self):
        list_id = self.make_list(is_public=False)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(f'/api/reading-lists/{list_id}/').status_code, 404)
        self.assertEqual(self.client.get('/api/reading-lists/?user=curator').json(), [])
        # ...but the owner sees it in their own lists.
        self.client.force_login(self.owner)
        self.assertEqual(len(self.client.get('/api/reading-lists/').json()), 1)

    def test_only_the_owner_can_change_it(self):
        list_id = self.make_list()
        self.client.force_login(self.other)
        self.assertEqual(self.client.post(f'/api/reading-lists/{list_id}/stories/{self.story.id}/').status_code, 404)
        self.assertEqual(self.client.patch(f'/api/reading-lists/{list_id}/', {'title': 'Mine now'}, content_type='application/json').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/reading-lists/{list_id}/').status_code, 404)
        self.assertTrue(ReadingList.objects.filter(pk=list_id).exists())

    def test_a_list_cannot_show_or_hold_a_draft(self):
        list_id = self.make_list()
        # You can't add a story you're not allowed to read.
        self.assertEqual(self.client.post(f'/api/reading-lists/{list_id}/stories/{self.draft.id}/').status_code, 404)

    def test_the_picker_knows_which_lists_hold_the_story(self):
        with_story = self.make_list(title='Has it')
        self.make_list(title='Empty')
        self.client.post(f'/api/reading-lists/{with_story}/stories/{self.story.id}/')
        lists = self.client.get(f'/api/reading-lists/?story={self.story.id}').json()
        self.assertEqual({item['title']: item['has_story'] for item in lists}, {'Has it': True, 'Empty': False})
