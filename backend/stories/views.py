from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.db.models import F, Count, Sum, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Follow, Block, get_profile
from .models import (
    Story, Like, Bookmark, Comment, LastWord, ReadingHistory, CoAuthorInvite,
    published_stories, stories_for,
)
from .serializers import (
    StoryCardSerializer, StoryDetailSerializer, StoryWriteSerializer, CommentSerializer, LastWordSerializer,
    MyStorySerializer, CoAuthorInviteSerializer,
)


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

        # Your first story makes you an Author (the role shown on the
        # Admin Dashboard -> Users page).
        profile = get_profile(self.request.user)
        if profile.role == 'user':
            profile.role = 'author'
            profile.save()


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

        # Logged in? Put it in your Reading History.
        record_reading(request.user, story)

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


# ---------------------------------------------------------------
# READING HISTORY - filled in by StoryDetailView (record_reading).
# ---------------------------------------------------------------

# Called every time a logged-in user opens a story.
# update_or_create: "find the row for this user + story and save it
# again (which moves last_read_at to now), or make it".
def record_reading(user, story):
    if user.is_authenticated:
        ReadingHistory.objects.update_or_create(user=user, story=story)


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
# MY STORIES - everything YOU wrote, drafts included.
# ---------------------------------------------------------------

# GET /api/stories/mine/
class MyStoriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Story.objects, NOT published_stories(): your drafts are
        # yours to see.
        stories = Story.objects.filter(author=request.user).select_related('category').order_by('-created_at')
        return Response(MyStorySerializer(stories, many=True).data)


# PATCH  /api/stories/5/manage/  { is_published: true/false }
# DELETE /api/stories/5/manage/
#
# Only for YOUR stories: get_object_or_404 with author=request.user
# answers 404 for someone else's story, so nobody can delete (or
# even find out about) a story that isn't theirs.
class ManageStoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get_my_story(self, request, pk):
        return get_object_or_404(Story, pk=pk, author=request.user)

    def patch(self, request, pk):
        story = self.get_my_story(request, pk)

        # FormData sends every value as TEXT, so true arrives as the
        # string 'true'. Turn it into a real True / False.
        story.is_published = request.data.get('is_published') == 'true'
        story.save()
        return Response(MyStorySerializer(story).data)

    def delete(self, request, pk):
        self.get_my_story(request, pk).delete()
        return Response(status=204)


# ---------------------------------------------------------------
# SEARCH
# ---------------------------------------------------------------

# GET /api/search/?q=house
#   { "stories": [...cards...], "authors": [ { username, avatar, story_count }, ... ] }
class SearchView(APIView):
    def get(self, request):
        query = request.query_params.get('q', '').strip()

        # Fewer than 2 letters would match almost everything.
        if len(query) < 2:
            return Response({'stories': [], 'authors': []})

        # icontains = "contains, ignoring upper/lower case".
        # The | between the Q()s means OR: a match in the title OR
        # the excerpt OR the body OR the author's name.
        stories = (
            stories_for(request.user)
            .filter(
                Q(title__icontains=query)
                | Q(excerpt__icontains=query)
                | Q(body__icontains=query)
                | Q(author__username__icontains=query)
            )
            .select_related('author', 'category')
            .order_by('-views')[:30]
        )

        # Writers whose name matches, with how many stories they have.
        authors = (
            get_user_model().objects
            .filter(username__icontains=query)
            .select_related('profile')
            .annotate(story_count=Count('stories', filter=Q(stories__is_published=True, stories__is_archived=False)))
            .order_by('-story_count', 'username')[:10]
        )

        return Response({
            'stories': StoryCardSerializer(stories, many=True, context={'request': request}).data,
            'authors': [
                {
                    'username': author.username,
                    'avatar': author.profile.avatar.url if hasattr(author, 'profile') and author.profile.avatar else '',
                    'story_count': author.story_count,
                }
                for author in authors
            ],
        })


# ---------------------------------------------------------------
# CO-AUTHOR INVITES
# ---------------------------------------------------------------

# GET  /api/invites/  -> { "received": [...], "sent": [...] }
# POST /api/invites/  { story_id, username }  -> invite someone
class InviteListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        received = CoAuthorInvite.objects.filter(to_user=request.user).select_related('story', 'from_user', 'to_user')
        sent = CoAuthorInvite.objects.filter(from_user=request.user).select_related('story', 'from_user', 'to_user')
        return Response({
            'received': CoAuthorInviteSerializer(received, many=True).data,
            'sent': CoAuthorInviteSerializer(sent, many=True).data,
        })

    def post(self, request):
        # Only YOUR stories can get co-authors.
        story = get_object_or_404(Story, pk=request.data.get('story_id'), author=request.user)

        username = (request.data.get('username') or '').strip()
        person = get_user_model().objects.filter(username__iexact=username).first()

        if person is None:
            return Response({'detail': 'No user with that username.'}, status=400)
        if person == request.user:
            return Response({'detail': "You can't invite yourself."}, status=400)
        if CoAuthorInvite.objects.filter(story=story, to_user=person).exists():
            return Response({'detail': f'{person.username} was already invited to this story.'}, status=400)
        # Respect blocks in both directions.
        if Block.objects.filter(Q(blocker=person, blocked=request.user) | Q(blocker=request.user, blocked=person)).exists():
            return Response({'detail': "You can't invite this user."}, status=400)

        invite = CoAuthorInvite.objects.create(story=story, from_user=request.user, to_user=person)
        return Response(CoAuthorInviteSerializer(invite).data, status=201)


# POST   /api/invites/3/accept/    (the person who was invited)
# POST   /api/invites/3/decline/   (the person who was invited)
# DELETE /api/invites/3/           (the person who sent it: cancel)
class InviteActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, action):
        # to_user=request.user: you can only answer invites sent TO you.
        invite = get_object_or_404(CoAuthorInvite, pk=pk, to_user=request.user)

        if invite.status != 'pending':
            return Response({'detail': 'This invite was already answered.'}, status=400)

        # Anything else in the URL (/invites/3/banana/) -> 404.
        if action not in ('accept', 'decline'):
            return Response({'detail': 'Not found.'}, status=404)

        invite.status = 'accepted' if action == 'accept' else 'declined'
        invite.save()
        return Response(CoAuthorInviteSerializer(invite).data)

    # action=None: this view has two URLs, and only one has an action.
    def delete(self, request, pk, action=None):
        invite = get_object_or_404(CoAuthorInvite, pk=pk, from_user=request.user)
        invite.delete()
        return Response(status=204)
