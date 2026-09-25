from datetime import datetime, time, timedelta

from django.db.models import F, Count, Sum, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Follow
from accounts.models import Block
from .models import Story, Like, Bookmark, Comment, LastWord, published_stories, stories_for
from .serializers import StoryCardSerializer, StoryDetailSerializer, StoryWriteSerializer, CommentSerializer, LastWordSerializer


# GET /api/stories/
#
# Published stories, as cards. Filters come from the "query string"
# (the part after the ? in the URL), and are all optional:
#
#   /api/stories/                           every story, newest first
#   /api/stories/?category=paranormal       only that category
#   /api/stories/?sort=oldest               oldest first
#   /api/stories/?sort=popular              most views first
#   /api/stories/?limit=4                   only the first 4
#   /api/stories/?mood=creepy               only that mood
#   /api/stories/?author=christopher        only their stories
#   /api/stories/?category=paranormal&sort=popular&limit=4   all at once
#
# One endpoint, many pages: a category page, a "latest stories" page,
# later an author page (?author=...) - just add another filter below.
class StoryListView(generics.ListAPIView):
    serializer_class = StoryCardSerializer

    # Instead of a fixed `queryset = ...`, get_queryset() runs on
    # EVERY request, so the query can depend on the URL.
    def get_queryset(self):
        # stories_for() = only what THIS visitor may see (their content
        # level, blocked users, private profiles - see stories/models.py).
        stories = stories_for(self.request.user).select_related('author', 'category')

        # request.query_params is a dict of the ?key=value pairs.
        # .get() gives None if the key isn't in the URL.
        category = self.request.query_params.get('category')
        if category:
            # category__slug = "follow the ForeignKey to the category,
            # then compare its slug". Double underscore = go through
            # a relation.
            stories = stories.filter(category__slug=category)

        # ?author=christopher - one person's stories (profile page).
        # author__username = follow the link to the user, then
        # compare their username.
        author = self.request.query_params.get('author')
        if author:
            stories = stories.filter(author__username=author)

        # ?mood=creepy - the mood picked on the Write a Story page.
        mood = self.request.query_params.get('mood')
        if mood:
            stories = stories.filter(mood=mood)

        # The minus sign = descending (biggest / newest first).
        # Anything we don't recognise (or nothing at all) = newest.
        sort = self.request.query_params.get('sort')
        if sort == 'oldest':
            stories = stories.order_by('created_at')
        elif sort == 'popular':
            # Most views first. Two stories with the same views ->
            # the newer one goes first (the second sort key).
            stories = stories.order_by('-views', '-created_at')
        else:
            stories = stories.order_by('-created_at')

        # .isdigit() = "is it a whole number?" - so ?limit=abc is
        # simply ignored instead of crashing.
        # [:4] on a queryset becomes SQL "LIMIT 4". It has to come
        # LAST - you can't filter or sort after slicing.
        limit = self.request.query_params.get('limit')
        if limit and limit.isdigit():
            stories = stories[:int(limit)]

        return stories


# POST /api/stories/new/
#
# The Write a Story page sends the form here. Logged-in users only.
# CreateAPIView does the work: check the data with the serializer,
# save it, answer with the new story (including its id).
class StoryCreateView(generics.CreateAPIView):
    serializer_class = StoryWriteSerializer
    permission_classes = [IsAuthenticated]

    # The author is whoever is logged in - never something the form
    # sends, or anyone could post a story "by" someone else.
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# GET /api/stories/5/
#
# One whole story, for the story page. Drafts answer 404, exactly
# like a story that doesn't exist - so nobody can read a draft by
# guessing its number.
class StoryDetailView(generics.RetrieveAPIView):
    serializer_class = StoryDetailSerializer

    # A method, not `queryset = ...`, so "is the publish date past?"
    # is checked on every request (see published_stories()).
    #
    # stories_for(): a story you may not see (blocked author, too
    # mature for your setting, private) answers 404 - as if it
    # doesn't exist.
    def get_queryset(self):
        return stories_for(self.request.user).select_related('author', 'category')

    # retrieve() is the method RetrieveAPIView runs for a GET. We take
    # over so we can count the view before answering.
    def retrieve(self, request, *args, **kwargs):
        # Finds the story from the <int:pk> in the URL, or answers 404.
        story = self.get_object()

        # +1 view. Two things worth knowing here:
        #
        # F('views') + 1 makes the DATABASE do the adding
        # ("SET views = views + 1"). If two people open the story at
        # the same moment, both views count. Doing it in Python
        # (story.views += 1; story.save()) could lose one.
        #
        # .update() instead of .save() also means updated_at does NOT
        # change - and the Story of the Day pick depends on updated_at,
        # so a busy story can't "steal" the pick just by being read.
        Story.objects.filter(pk=story.pk).update(views=F('views') + 1)

        # Re-read the new number so the page shows it.
        story.refresh_from_db(fields=['views'])

        return Response(self.get_serializer(story).data)


# ---------------------------------------------------------------
# LIKE / SAVE - both work exactly the same way, so the logic is
# written once in toggle() and both views call it.
# ---------------------------------------------------------------

def toggle(model, user, story):
    # get_or_create looks for the row, and creates it if it's missing.
    # It returns (the row, True/False "did I just create it?").
    row, created = model.objects.get_or_create(user=user, story=story)

    # It was already there -> this click means "undo".
    if not created:
        row.delete()

    # True = it's there now (liked / saved), False = it's gone.
    return created


# POST /api/stories/5/like/   ->  { "liked": true, "like_count": 12 }
# Click once to like, again to unlike.
class ToggleLikeView(APIView):
    # Logged-in users only. Logged out -> 403, and React sends them
    # to the Log In page instead.
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        # Like get_object(), but for an APIView: the story, or a 404.
        # Drafts count as "not found".
        story = get_object_or_404(stories_for(request.user), pk=pk)
        liked = toggle(Like, request.user, story)
        return Response({'liked': liked, 'like_count': story.likes.count()})


# POST /api/stories/5/save/   ->  { "saved": true }
class ToggleSaveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        story = get_object_or_404(stories_for(request.user), pk=pk)
        saved = toggle(Bookmark, request.user, story)
        return Response({'saved': saved})


# GET  /api/stories/5/comments/  -> the comments, newest first (anyone)
# POST /api/stories/5/comments/  -> add one (logged in only)
class CommentListView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer

    # "OrReadOnly" = anyone may READ (GET), only logged-in users may
    # WRITE (POST). Exactly what a comment section needs.
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_story(self):
        # self.kwargs holds the values from the URL - here the <int:pk>.
        return get_object_or_404(stories_for(self.request.user), pk=self.kwargs['pk'])

    def get_queryset(self):
        # story.comments = all comments pointing at this story (the
        # related_name). select_related('author') fetches the usernames
        # in the same query.
        comments = self.get_story().comments.select_related('author')

        # Hide comments by people you blocked (Settings -> Blocked Users).
        if self.request.user.is_authenticated:
            blocked_ids = Block.objects.filter(blocker=self.request.user).values('blocked_id')
            comments = comments.exclude(author__in=blocked_ids)

        return comments

    # perform_create runs when a POST passed validation, right before
    # saving. We add the two things the visitor must NOT choose
    # themselves: who wrote it, and which story it's on.
    def perform_create(self, serializer):
        serializer.save(author=self.request.user, story=self.get_story())


# GET /api/stories/random/
#
# The id of one random published story: { "id": 7 }
# React then opens /stories/7. 404 if there are no stories at all.
class RandomStoryView(APIView):
    def get(self, request):
        # order_by('?') = "shuffle the rows". Fine for a small site;
        # on a table with millions of rows it gets slow, and you'd
        # pick a random id a smarter way.
        story = stories_for(request.user).order_by('?').first()

        if story is None:
            return Response({'detail': 'There are no stories yet.'}, status=404)

        return Response({'id': story.id})


# GET /api/stories/featured/
#
# The homepage picks. Public - anyone can read it.
# Answers:
#   { "story_of_the_day": {...} or null,
#     "story_of_the_week": {...} or null }
class FeaturedStoriesView(APIView):
    def get(self, request):
        # Never feature a draft.
        # select_related = fetch the author and category in the SAME
        # database query, instead of one extra query each later.
        published = stories_for(request.user).select_related('author', 'category')

        # order_by('-updated_at') = most recently edited first, so if
        # two stories are ticked, the one you ticked last wins.
        # .first() gives None when nothing matches (instead of crashing).
        day = published.filter(is_story_of_the_day=True).order_by('-updated_at').first()
        week = published.filter(is_story_of_the_week=True).order_by('-updated_at').first()

        return Response({
            'story_of_the_day': self.card(day, request),
            'story_of_the_week': self.card(week, request),
        })

    # Small helper so we don't write the same two lines twice.
    # Passing the request lets DRF turn the image path into a full
    # URL (http://localhost:8000/media/stories/...).
    def card(self, story, request):
        if story is None:
            return None
        return StoryCardSerializer(story, context={'request': request}).data


# GET  /api/last-words/  -> the 30 newest quotes (anyone)
# POST /api/last-words/  -> add one (logged in only)
# Works just like CommentListView, minus the story.
class LastWordListView(generics.ListCreateAPIView):
    serializer_class = LastWordSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # [:30] = only the newest 30, so the wall never gets huge.
        return LastWord.objects.select_related('author')[:30]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


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
