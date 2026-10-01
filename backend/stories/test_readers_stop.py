from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import get_profile
from stories.models import ReadingHistory, Story


# WHERE READERS STOP (Pro writers, Author Dashboard).
# Run with:  python manage.py test stories.test_readers_stop

PASSWORD = 'Str0ng-pass-123'


class ReadersStopTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('writer', password=PASSWORD)
        profile = get_profile(self.writer)
        profile.is_premium = True
        profile.save()
        self.story = Story.objects.create(title='The Well', body='word ' * 50, author=self.writer, is_published=True)

        # 4 readers: one stopped at 15%, one at 55%, two finished.
        for name, progress in [('a', 15), ('b', 55), ('c', 100), ('d', 100)]:
            reader = User.objects.create_user(name, password=PASSWORD)
            ReadingHistory.objects.create(user=reader, story=self.story, progress=progress)
        # The writer reading their own story doesn't count.
        ReadingHistory.objects.create(user=self.writer, story=self.story, progress=5)

        self.client.force_login(self.writer)

    def test_how_far_readers_got(self):
        data = self.client.get(f'/api/author/readers-stop/?story={self.story.id}').json()
        self.assertEqual(data['readers'], 4)
        percent = {row['mark']: row['percent'] for row in data['marks']}
        self.assertEqual(percent[10], 100)   # everyone got past 10%
        self.assertEqual(percent[20], 75)    # one stopped at 15%
        self.assertEqual(percent[60], 50)    # another at 55%
        self.assertEqual(percent[100], 50)   # two finished

    def test_the_story_list(self):
        data = self.client.get('/api/author/readers-stop/').json()
        self.assertEqual(data['stories'], [{'id': self.story.id, 'title': 'The Well', 'readers': 4}])

    def test_only_your_own_stories(self):
        other = User.objects.create_user('other', password=PASSWORD)
        theirs = Story.objects.create(title='Theirs', body='word ' * 50, author=other, is_published=True)
        self.assertEqual(self.client.get(f'/api/author/readers-stop/?story={theirs.id}').status_code, 404)

    def test_pro_only(self):
        profile = get_profile(self.writer)
        profile.is_premium = False
        profile.save()
        answer = self.client.get('/api/author/readers-stop/')
        self.assertEqual(answer.status_code, 403)
        self.assertTrue(answer.json()['pro_required'])
