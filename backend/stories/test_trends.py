from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from stories.models import Story, Like, ReadingHistory, StoryViewDay


# Tests for the Author Dashboard's "Over time" numbers. Run with:
#   python manage.py test

PASSWORD = 'Str0ng-pass-123'


class AuthorTrendsTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user('lantern', password=PASSWORD)
        self.readers = [User.objects.create_user(f'reader{i}', password=PASSWORD) for i in range(4)]
        self.story = Story.objects.create(title='The Well', body='word ' * 50, author=self.writer, is_published=True)

    def trends(self):
        self.client.force_login(self.writer)
        return self.client.get('/api/author/trends/').json()

    def test_opening_a_story_counts_a_view_for_today(self):
        self.client.get(f'/api/stories/{self.story.id}/')
        self.client.get(f'/api/stories/{self.story.id}/')
        self.assertEqual(StoryViewDay.objects.get(story=self.story, date=timezone.localdate()).count, 2)
        self.assertEqual(self.trends()['weeks'][-1]['views'], 2)   # this week = the last one

    def test_read_through(self):
        # 4 readers: 3 finished (90%+), 1 gave up at 30%. The writer's own read doesn't count.
        for reader, progress in zip(self.readers, [100, 95, 90, 30]):
            ReadingHistory.objects.create(user=reader, story=self.story, progress=progress)
        ReadingHistory.objects.create(user=self.writer, story=self.story, progress=10)
        Like.objects.create(user=self.readers[0], story=self.story)

        data = self.trends()
        this_week = data['weeks'][-1]
        self.assertEqual((this_week['readers'], this_week['finished'], this_week['read_through']), (4, 3, 75))
        self.assertEqual(this_week['likes'], 1)
        self.assertEqual(data['stories'], [{'id': self.story.id, 'title': 'The Well', 'readers': 4, 'finished': 3, 'read_through': 75}])

    def test_twelve_weeks_oldest_first_and_empty_weeks_have_no_percentage(self):
        StoryViewDay.objects.create(story=self.story, date=timezone.localdate() - timedelta(weeks=11), count=7)
        weeks = self.trends()['weeks']
        self.assertEqual(len(weeks), 12)
        self.assertEqual(weeks[0]['views'], 7)
        self.assertIsNone(weeks[0]['read_through'])     # nobody read -> no percentage, not 0%

    def test_login_needed(self):
        self.assertEqual(self.client.get('/api/author/trends/').status_code, 403)
