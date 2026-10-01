from datetime import datetime, time, timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Like, ReadingHistory, StoryViewDay, published_stories


# ---------------------------------------------------------------
# GET /api/author/trends/  - the Author Dashboard's "Over time" part.
#
#   weeks  - the last 12 weeks (Monday to Sunday), oldest first:
#            { week, views, likes, readers, finished, read_through }
#   stories - each published story with readers:
#            { id, title, readers, finished, read_through }
#
# READ-THROUGH = of the people who opened a story, how many got to
# the end (reading progress 90% or more - the last lines are often
# the author's note). It says more than views: 100 views and 80%
# read-through beats 1,000 views and 5%.
#
# Readers and finished come from ReadingHistory. Its last_read_at
# changes every time someone reads on, so "readers in a week" means
# "people who were reading your story that week". Your own reads
# don't count.
# ---------------------------------------------------------------
WEEKS = 12
FINISHED = 90   # progress % that counts as "read to the end"


def percent(part, whole):
    # None (not 0) when nobody read it - "no data" isn't "0%".
    return round(part * 100 / whole) if whole else None


class AuthorTrendsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        me = request.user
        today = timezone.localdate()
        this_monday = today - timedelta(days=today.weekday())
        first_monday = this_monday - timedelta(weeks=WEEKS - 1)
        since = timezone.make_aware(datetime.combine(first_monday, time.min))

        views = StoryViewDay.objects.filter(story__author=me, date__gte=first_monday)
        likes = Like.objects.filter(story__author=me, created_at__gte=since)
        reads = ReadingHistory.objects.filter(story__author=me, last_read_at__gte=since).exclude(user=me)

        # Put every row in its week. A dict per number:
        #   { date of that Monday: total }
        def monday_of(day):
            return day - timedelta(days=day.weekday())

        views_by_week, likes_by_week, readers_by_week, finished_by_week = {}, {}, {}, {}
        for row in views.values('date', 'count'):
            week = monday_of(row['date'])
            views_by_week[week] = views_by_week.get(week, 0) + row['count']
        for created in likes.values_list('created_at', flat=True):
            week = monday_of(timezone.localdate(created))
            likes_by_week[week] = likes_by_week.get(week, 0) + 1
        for last_read, progress in reads.values_list('last_read_at', 'progress'):
            week = monday_of(timezone.localdate(last_read))
            readers_by_week[week] = readers_by_week.get(week, 0) + 1
            if progress >= FINISHED:
                finished_by_week[week] = finished_by_week.get(week, 0) + 1

        weeks = []
        for i in range(WEEKS):
            week = first_monday + timedelta(weeks=i)
            readers = readers_by_week.get(week, 0)
            finished = finished_by_week.get(week, 0)
            weeks.append({
                'week': week.isoformat(),
                'views': views_by_week.get(week, 0),
                'likes': likes_by_week.get(week, 0),
                'readers': readers,
                'finished': finished,
                'read_through': percent(finished, readers),
            })

        # Per story, all time. Count(filter=...) counts only some rows.
        story_rows = (
            published_stories().filter(author=me)
            .annotate(
                reader_count=Count('readers', filter=~Q(readers__user=me)),
                finished_count=Count('readers', filter=Q(readers__progress__gte=FINISHED) & ~Q(readers__user=me)),
            )
            .filter(reader_count__gt=0)
            .order_by('-reader_count')
        )
        stories = [
            {
                'id': story.id,
                'title': story.title,
                'readers': story.reader_count,
                'finished': story.finished_count,
                'read_through': percent(story.finished_count, story.reader_count),
            }
            for story in story_rows
        ]

        return Response({
            'weeks': weeks,
            'stories': stories,
            'views_tracked_since': StoryViewDay.objects.filter(story__author=me).order_by('date').values_list('date', flat=True).first(),
            'total_views_12_weeks': views.aggregate(total=Sum('count'))['total'] or 0,
        })
