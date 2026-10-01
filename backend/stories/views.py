from datetime import time

from django.db.models import F, Q, ExpressionWrapper, FloatField
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import Throttled, ValidationError

from dashboard.limits import hourly_limit_reached
from dashboard.models import SiteSettings
from accounts.models import Block, get_profile
from accounts.age import story_lock
from accounts.notifications import notify, short_title
from moderation.content_filter import check_text
from moderation.models import Report
from .models import (
    Story,
    Like,
    Bookmark,
    LastWord,
    ReadingHistory,
    ReadingDay,
    StoryViewDay,
    published_stories,
    stories_for,
)
from .serializers import (
    StoryCardSerializer,
    StoryDetailSerializer,
    StoryWriteSerializer,
    CommentSerializer,
    LastWordSerializer,
    MyStorySerializer,
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

        # ?tag=halloween - stories with that tag (the homepage's
        # seasonal banner uses it). Tags are stored in lower case.
        tag = self.request.query_params.get('tag')
        if tag:
            stories = stories.filter(tags__name=tag.strip().lower())

        # The minus sign = descending (biggest / newest first).
        # Anything we don't recognise (or nothing at all) = newest.
        sort = self.request.query_params.get('sort')
        if sort == 'oldest':
            stories = stories.order_by('created_at')
        elif sort == 'popular':
            # Most views first. Two stories with the same views ->
            # the newer one goes first (the second sort key).
            stories = stories.order_by('-views', '-created_at')
        elif sort == 'scariest':
            # Highest fear meter first. Only rated stories: the average
            # is total / votes, so 0 votes would divide by zero.
            # ExpressionWrapper + FloatField = do it as a decimal
            # number (4 / 3 = 1.33, not 1).
            average = ExpressionWrapper(F('fear_total') * 1.0 / F('fear_votes'), output_field=FloatField())
            stories = stories.filter(fear_votes__gt=0).annotate(fear_avg=average).order_by('-fear_avg', '-fear_votes')
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


# CONTENT FILTER, part 2: text with a "flag" word was allowed, but
# the admins should look at it - so we file a report ourselves.
# reporter=None = "reported by the system, not by a member".
# (Blocked words never get this far: the serializers refuse them.)
def flag_if_needed(text, story=None, comment=None):
    action, words = check_text(text)
    if action == 'flag':
        Report.objects.create(
            reporter=None, story=story, comment=comment, reason='other',
            details=f'Flagged by the content filter: {", ".join(words)}',
        )


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
        story = serializer.save(author=self.request.user)

        # Words the Content Filter marks "flag": the story is saved,
        # but the admins get a report to look at it.
        flag_if_needed(' '.join([story.title, story.excerpt, story.body]), story=story)

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
        stories = stories_for(self.request.user)
        user = self.request.user
        if user.is_authenticated:
            # Also: your OWN unpublished stories (a preview), and drafts
            # you were invited to beta-read (stories/beta_views.py).
            # | = "or": stories from either list. distinct(): the join
            # with beta_readers could list a story twice.
            drafts = Story.objects.filter(Q(author=user) | Q(beta_readers__reader=user))
            stories = (stories | drafts).distinct()
        return stories.select_related('author', 'category')

    # retrieve() is the method RetrieveAPIView runs for a GET. We take
    # over so we can count the view before answering.
    def retrieve(self, request, *args, **kwargs):
        # Finds the story from the <int:pk> in the URL, or answers 404.
        story = self.get_object()

        # A draft (preview / beta read) doesn't count as a view or a read.
        if not story.is_published:
            return Response(self.get_serializer(story).data)

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

        # ...and +1 on today's row, for the "views over time" chart
        # (Author Dashboard). Same F() trick for the adding.
        day, _ = StoryViewDay.objects.get_or_create(story=story, date=timezone.localdate())
        StoryViewDay.objects.filter(pk=day.pk).update(count=F('count') + 1)

        # Re-read the new number so the page shows it.
        story.refresh_from_db(fields=['views'])

        # Logged in? Put it in your Reading History - unless it's an
        # 18+ story they can't read yet (accounts/age.py).
        if story_lock(request.user, story) is None:
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
        if liked:
            # The bell for the author (notify() skips liking your own story).
            notify(story.author, request.user, 'like',
                   f'{request.user.username} liked your story "{short_title(story.title)}"', f'/stories/{story.id}')
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
        # is_hidden=False: leave out comments an admin hid (Moderation).
        # author__profile: their profile too (for the PRO badge), still one query.
        comments = self.get_story().comments.filter(is_hidden=False).select_related('author', 'author__profile')
        # A reply under a HIDDEN comment would float around without its
        # conversation - hide it too.
        comments = comments.exclude(parent__is_hidden=True)

        # Hide comments by people you blocked (Settings -> Blocked Users).
        if self.request.user.is_authenticated:
            blocked_ids = Block.objects.filter(blocker=self.request.user).values('blocked_id')
            comments = comments.exclude(author__in=blocked_ids)

        return comments

    # perform_create runs when a POST passed validation, right before
    # saving. We add the two things the visitor must NOT choose
    # themselves: who wrote it, and which story it's on.
    def perform_create(self, serializer):
        # Spam brake: max N comments an hour (Rate Limits page).
        # Throttled = DRF's ready-made 429 "Too Many Requests" error.
        limit = SiteSettings.load().comments_per_hour
        if hourly_limit_reached(self.request.user, self.request.user.comments.all(), limit):
            raise Throttled(detail=f'You can post up to {limit} comments an hour. Take a breather!')
        story = self.get_story()

        # A REPLY: check the comment it answers.
        parent = serializer.validated_data.get('parent')
        if parent is not None:
            # It must be on THIS story (someone could send any id).
            if parent.story_id != story.id or parent.is_hidden:
                raise ValidationError({'parent': ['You can only reply to a comment on this story.']})
            # Only one level deep: a reply to a reply goes under the
            # same top comment.
            if parent.parent_id is not None:
                parent = parent.parent

        comment = serializer.save(author=self.request.user, story=story, parent=parent)
        flag_if_needed(comment.body, comment=comment)

        link = f'/stories/{story.id}'
        if parent is not None:
            # Tell the person you answered (notify() skips replying to yourself).
            notify(parent.author, self.request.user, 'reply',
                   f'{self.request.user.username} replied to your comment on "{short_title(story.title)}"', link)
        # And the story's author, as before - unless they're the one
        # who was just answered (one notification is enough).
        if parent is None or parent.author_id != story.author_id:
            notify(story.author, self.request.user, 'comment',
                   f'{self.request.user.username} commented on "{short_title(story.title)}"', link)


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
        # is_hidden=False: leave out quotes an admin hid (Moderation).
        return LastWord.objects.filter(is_hidden=False).select_related('author')[:30]

    def perform_create(self, serializer):
        last_word = serializer.save(author=self.request.user)

        # A Last Word can't be reported (reports are for stories and
        # comments), so a "flag" word hides it instead - an admin can
        # un-hide it on the Moderation page.
        if check_text(last_word.body)[0] == 'flag':
            last_word.is_hidden = True
            last_word.save()


# ---------------------------------------------------------------
# READING HISTORY - filled in by StoryDetailView (record_reading).
# ---------------------------------------------------------------

# Called every time a logged-in user opens a story.
# update_or_create: "find the row for this user + story and save it
# again (which moves last_read_at to now), or make it".
def record_reading(user, story):
    if user.is_authenticated:
        ReadingHistory.objects.update_or_create(user=user, story=story)
        # Today counts as a reading day (streaks, accounts/badges.py).
        ReadingDay.objects.get_or_create(user=user, date=timezone.localdate())


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
