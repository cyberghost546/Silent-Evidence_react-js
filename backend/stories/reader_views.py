from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Follow
from accounts.age import story_lock
from .models import (
    Story,
    Like,
    Bookmark,
    ReadingHistory,
    FearRating,
    Reaction,
    REACTION_KINDS,
    stories_for,
)
from .serializers import StoryCardSerializer, fear_data, reaction_data


# ---------------------------------------------------------------
# READERS' OWN PAGES and actions: My Feed, saved stories, reading history, the fear meter, reactions, continue reading.
# (Moved out of views.py, which had grown to 900 lines.)
# ---------------------------------------------------------------
# GET /api/stories/feed/            -> newest first
# GET /api/stories/feed/?sort=popular -> most views first
#
# "My Feed": published stories by the authors YOU follow.
# Logged-in only - we need to know who "you" are.
#
#   { "following": [ { "username": "the_keeper", "avatar": "" }, ... ],
#     "stories":   [ ...story cards, same shape as /api/stories/... ] }
#
# `following` is sent too, so React can tell the two empty cases
# apart: "you follow nobody" vs "they haven't written anything yet".
class FeedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # The ids of everyone I follow. (Follow rows where I'm the
        # follower -> their `following` column.)
        followed_ids = Follow.objects.filter(follower=request.user).values_list('following_id', flat=True)

        # author__in = "the author is one of these".
        stories = stories_for(request.user).filter(author__in=followed_ids).select_related('author', 'category')

        if request.query_params.get('sort') == 'popular':
            stories = stories.order_by('-views', '-created_at')
        else:
            stories = stories.order_by('-created_at')

        # The people themselves, for the row of avatars at the top.
        # select_related('following__profile') fetches each user and
        # their profile (avatar) in the same query.
        follows = (
            Follow.objects.filter(follower=request.user)
            .select_related('following__profile')
            .order_by('following__username')
        )
        following = []
        for follow in follows:
            person = follow.following
            # Users made before Profile existed may not have one yet.
            has_avatar = hasattr(person, 'profile') and person.profile.avatar
            following.append({
                'username': person.username,
                'avatar': person.profile.avatar.url if has_avatar else '',
            })

        return Response({
            'following': following,
            # [:60] = at most 60 stories on one page.
            # many=True = "this is a LIST of stories, not one".
            'stories': StoryCardSerializer(stories[:60], many=True, context={'request': request}).data,
        })


# ---------------------------------------------------------------
# MY LISTS - the stories you saved ("Save" on a story page).
# ---------------------------------------------------------------

# GET /api/stories/saved/  -> your saved stories, last saved first.
class SavedStoriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Start from stories_for() so a story that became invisible
        # to you (blocked author, now private...) drops off the list.
        # bookmarks__user = "has a Bookmark row whose user is me".
        stories = (
            stories_for(request.user)
            .filter(bookmarks__user=request.user)
            .select_related('author', 'category')
            .order_by('-bookmarks__created_at')
        )
        return Response(StoryCardSerializer(stories, many=True, context={'request': request}).data)


# GET    /api/stories/history/  -> the stories you read, newest first
#   [ { "last_read_at": "...", "story": {...card...} }, ... ]
# DELETE /api/stories/history/  -> forget all of it
class ReadingHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only stories you may still see (same idea as Saved Stories).
        visible_ids = stories_for(request.user).values('id')
        rows = (
            ReadingHistory.objects
            .filter(user=request.user, story__in=visible_ids)
            .select_related('story__author', 'story__category')[:100]
        )

        data = [
            {
                'last_read_at': row.last_read_at,
                'story': StoryCardSerializer(row.story, context={'request': request}).data,
            }
            for row in rows
        ]
        return Response(data)

    def delete(self, request):
        ReadingHistory.objects.filter(user=request.user).delete()
        return Response(status=204)


# ---------------------------------------------------------------
# FEAR METER   POST /api/stories/5/fear/  { score: 1-5 }
# Rate (or change your rating). Not your own story, and not an 18+
# story you can't read yet.
# ---------------------------------------------------------------
class FearRatingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        story = get_object_or_404(stories_for(request.user), pk=pk)
        if story.author == request.user:
            return Response({'detail': "You can't rate your own story."}, status=400)
        if story_lock(request.user, story):
            return Response({'detail': 'Read the story first.'}, status=400)
        try:
            score = int(request.data.get('score'))
        except (TypeError, ValueError):
            score = 0
        if not 1 <= score <= 5:
            return Response({'detail': 'Pick 1 to 5 skulls.'}, status=400)

        rating, created = FearRating.objects.get_or_create(user=request.user, story=story, defaults={'score': score})
        # Keep the running total right: a new rating adds a vote;
        # a changed one only swaps the old score for the new one.
        # F() = let the database do the maths (safe for two at once).
        if created:
            Story.objects.filter(pk=story.pk).update(fear_total=F('fear_total') + score, fear_votes=F('fear_votes') + 1)
        else:
            Story.objects.filter(pk=story.pk).update(fear_total=F('fear_total') - rating.score + score)
            rating.score = score
            rating.save(update_fields=['score'])
        story.refresh_from_db(fields=['fear_total', 'fear_votes'])
        return Response(fear_data(story, request.user))


# ---------------------------------------------------------------
# REACTIONS   POST /api/stories/5/react/  { kind: 'got_me' }
# Click once = on, click again = off (like the Like button).
# ---------------------------------------------------------------
class ToggleReactionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        story = get_object_or_404(stories_for(request.user), pk=pk)
        kind = request.data.get('kind')
        if kind not in dict(REACTION_KINDS):
            return Response({'detail': 'Unknown reaction.'}, status=400)
        reaction, created = Reaction.objects.get_or_create(user=request.user, story=story, kind=kind)
        if not created:
            reaction.delete()
        return Response(reaction_data(story, request.user))


# ---------------------------------------------------------------
# CONTINUE READING
#
#   POST /api/stories/5/progress/  { percent: 43 }  - the story page
#        saves how far you got (every few seconds while you read)
#   GET  /api/stories/continue/                     - the stories you
#        started but didn't finish (for the homepage row)
# ---------------------------------------------------------------
class ReadingProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        story = get_object_or_404(stories_for(request.user), pk=pk)
        try:
            percent = int(request.data.get('percent'))
        except (TypeError, ValueError):
            return Response({'detail': 'percent must be a number.'}, status=400)
        # max/min = keep it between 0 and 100, whatever was sent.
        percent = max(0, min(100, percent))
        ReadingHistory.objects.update_or_create(user=request.user, story=story, defaults={'progress': percent})
        return Response({'progress': percent})


# "Started" = past the first 5%; "not finished" = under 95%.
CONTINUE_FROM, CONTINUE_UNTIL = 5, 95


class ContinueReadingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        visible_ids = stories_for(request.user).values('id')
        rows = (
            ReadingHistory.objects
            .filter(user=request.user, story__in=visible_ids, progress__gte=CONTINUE_FROM, progress__lt=CONTINUE_UNTIL)
            .select_related('story__author', 'story__category')[:6]
        )
        return Response([
            {
                'progress': row.progress,
                'story': StoryCardSerializer(row.story, context={'request': request}).data,
            }
            for row in rows
        ])
