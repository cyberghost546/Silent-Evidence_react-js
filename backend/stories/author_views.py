from datetime import datetime, time, timedelta

from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Follow, get_profile
from .models import Story, Like, Comment, ReadingHistory, published_stories


# ---------------------------------------------------------------
# THE AUTHOR DASHBOARD numbers (/author) - /api/author/stats/.
# (Moved out of views.py, which had grown to 900 lines.)
# ---------------------------------------------------------------
# ---------------------------------------------------------------
# AUTHOR DASHBOARD
# ---------------------------------------------------------------

# How many rows of `queryset` were created on each day since `since`.
# Answers a dict: { date(2026, 9, 24): 3, date(2026, 9, 26): 1 }
# Days with nothing simply aren't in it.
#
# TruncDate('created_at') cuts the time off ("2026-09-24 21:17" ->
# "2026-09-24"), then .values('day').annotate(Count) groups the rows
# by that day and counts each group - all in ONE database query.
def count_per_day(queryset, since):
    rows = (
        queryset.filter(created_at__gte=since)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(total=Count('id'))
    )
    return {row['day']: row['total'] for row in rows}


# GET /api/author/stats/?days=30   (or ?days=7)
#
# Everything the Author Dashboard shows, for the logged-in user:
#   totals        - all-time numbers
#   period        - the same things, but only the last 7/30 days
#   status        - how many stories are published / drafts / scheduled
#   daily         - one row per day, for the charts
#   top_stories   - your 5 most-read stories
#   recent_comments - the 5 newest comments readers left you
class AuthorStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        me = request.user

        # Only 7 or 30 allowed - anything else becomes 30.
        days = 7 if request.query_params.get('days') == '7' else 30

        # The first day of the period, at midnight. With days=7 and
        # today = the 26th: 26 - 6 = the 20th, so 7 days INCLUDING today.
        today = timezone.localdate()
        first_day = today - timedelta(days=days - 1)
        since = timezone.make_aware(datetime.combine(first_day, time.min))

        # --- The building blocks (nothing is fetched yet - Django
        # only runs a query when we count, sum or loop over it) ---
        my_stories = Story.objects.filter(author=me)
        visible = published_stories().filter(author=me)
        likes = Like.objects.filter(story__author=me)
        followers = Follow.objects.filter(following=me)

        # Comments from OTHER people. story__author = "the comment's
        # story's author" - two hops through the relations.
        comments = Comment.objects.filter(story__author=me).exclude(author=me)

        # --- The charts: one entry per day, zeros included ---
        likes_by_day = count_per_day(likes, since)
        followers_by_day = count_per_day(followers, since)
        comments_by_day = count_per_day(comments, since)

        daily = []
        for i in range(days):
            day = first_day + timedelta(days=i)
            daily.append({
                'date': day.isoformat(),                   # "2026-09-24"
                'likes': likes_by_day.get(day, 0),         # .get(key, 0) = 0 if that day is missing
                'followers': followers_by_day.get(day, 0),
                'comments': comments_by_day.get(day, 0),
            })

        # --- Top 5 stories by views (drafts too, so you see them all) ---
        # distinct=True is needed when counting TWO relations at once,
        # or the database multiplies them together (3 likes x 2 comments
        # would count as 6 of each).
        top = (
            my_stories
            .annotate(
                like_count=Count('likes', distinct=True),
                # ~Q(...) = NOT. Your own replies don't count, same as
                # the `comments` total above.
                comment_count=Count('comments', filter=~Q(comments__author=me), distinct=True),
            )
            .order_by('-views', '-created_at')[:5]
        )
        now = timezone.now()
        top_stories = []
        for story in top:
            if not story.is_published:
                status = 'draft'
            elif story.publish_at and story.publish_at > now:
                status = 'scheduled'
            else:
                status = 'published'

            top_stories.append({
                'id': story.id,
                'title': story.title,
                'views': story.views,
                'likes': story.like_count,
                'comments': story.comment_count,
                'status': status,
            })

        recent_comments = [
            {
                'id': comment.id,
                'author': comment.author.username,
                'body': comment.body,
                'story_id': comment.story_id,
                'story_title': comment.story.title,
                'created_at': comment.created_at,
            }
            for comment in comments.select_related('author', 'story').order_by('-created_at')[:5]
        ]

        return Response({
            'days': days,
            'totals': {
                # Sum gives None when there are no stories -> "or 0".
                'views': visible.aggregate(total=Sum('views'))['total'] or 0,
                'likes': likes.count(),
                'followers': followers.count(),
                'comments': comments.count(),
            },
            'period': {
                'likes': likes.filter(created_at__gte=since).count(),
                'followers': followers.filter(created_at__gte=since).count(),
                'comments': comments.filter(created_at__gte=since).count(),
                'stories': visible.filter(created_at__gte=since).count(),
            },
            'status': {
                'published': visible.count(),
                'drafts': my_stories.filter(is_published=False).count(),
                'scheduled': my_stories.filter(is_published=True, publish_at__gt=now).count(),
            },
            'daily': daily,
            'top_stories': top_stories,
            'recent_comments': recent_comments,
        })


# ---------------------------------------------------------------
# WHERE READERS STOP (Pro writers) - /api/author/readers-stop/
#
# The story page saves how far each reader got, 0-100 %
# (ReadingHistory.progress). From that we can say, for each 10%
# mark: "how many of your readers got at least this far?"
#
#   10% ████████████ 100%
#   50% ███████       60%   <- 40% gave up before the middle
#  100% ███           25%   <- a quarter finished it
#
# A big drop between two marks = that part loses people.
#
#   GET /api/author/readers-stop/           -> { stories: [{ id, title, readers }] }
#   GET /api/author/readers-stop/?story=5   -> { story, readers, marks: [{ mark, reached, percent }] }
#
# Pro only (and admins). Everyone else gets 403 with pro_required,
# so the dashboard can show "this is a Pro feature" instead.
# ---------------------------------------------------------------
MARKS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]


class ReadersStopView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        me = request.user
        if not (me.is_staff or get_profile(me).is_premium):
            return Response({'detail': 'This is a Pro feature.', 'pro_required': True}, status=403)

        # The readers of MY published stories - not counting myself
        # (a writer re-reading their own story isn't a reader).
        my_stories = published_stories().filter(author=me)
        readers = ReadingHistory.objects.filter(story__in=my_stories).exclude(user=me)

        story_id = request.query_params.get('story')
        if not story_id:
            # The list for the drop-down: each story with its number of readers.
            rows = (
                my_stories
                .annotate(reader_count=Count('readers', filter=~Q(readers__user=me)))
                .order_by('-reader_count', '-created_at')
            )
            return Response({
                'stories': [{'id': story.id, 'title': story.title, 'readers': story.reader_count} for story in rows],
            })

        story = my_stories.filter(pk=story_id).first()
        if story is None:
            return Response({'detail': 'Not one of your published stories.'}, status=404)

        progress = list(readers.filter(story=story).values_list('progress', flat=True))
        total = len(progress)
        marks = []
        for mark in MARKS:
            # sum(1 for ...) = count how many readers got this far.
            reached = sum(1 for value in progress if value >= mark)
            marks.append({
                'mark': mark,
                'reached': reached,
                # round(..) = a whole percent; no readers -> 0, not a crash.
                'percent': round(reached * 100 / total) if total else 0,
            })

        return Response({
            'story': {'id': story.id, 'title': story.title},
            'readers': total,
            'marks': marks,
        })
