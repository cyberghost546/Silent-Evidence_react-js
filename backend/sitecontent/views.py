import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from categories.models import Category
from stories.models import Story, stories_for
from stories.serializers import StoryCardSerializer
from .models import (
    Announcement, WritingPrompt, Challenge, ChallengeEntry, Bundle, CookieBanner, CookieConsent, MoodOfDay,
    FeaturedAuthor, Spotlight, Poll, PollOption, PollVote,
)
from .serializers import (
    AnnouncementSerializer, WritingPromptSerializer, ChallengeSerializer,
    BundleSerializer, AdminCategorySerializer, MoodOfDaySerializer,
)


# ===============================================================
# PUBLIC - anyone can read these
# ===============================================================

# GET /api/announcement/  -> the banner, or 204 (nothing) if none is on.
class CurrentAnnouncementView(APIView):
    def get(self, request):
        announcement = Announcement.objects.filter(is_active=True).first()
        if announcement is None:
            return Response(status=204)
        return Response(AnnouncementSerializer(announcement).data)


# GET /api/prompts/random/  -> { id, text } - one random active prompt
# (for "Need an idea?" on the Write a Story page), or 204 if none.
class RandomPromptView(APIView):
    def get(self, request):
        prompts = list(WritingPrompt.objects.filter(is_active=True))
        if not prompts:
            return Response(status=204)
        # random.choice = pick one item from a list.
        return Response(WritingPromptSerializer(random.choice(prompts)).data)


# GET /api/challenges/  -> every challenge, newest deadline first.
class ChallengeListView(generics.ListAPIView):
    serializer_class = ChallengeSerializer
    queryset = Challenge.objects.select_related('winner')


# GET /api/challenges/3/  -> one challenge + its entries (story cards)
class ChallengeDetailView(APIView):
    def get(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)

        # Only entries the visitor may see (stories_for: published,
        # not archived, not blocked, content level...).
        visible = stories_for(request.user)
        stories = visible.filter(challenge_entries__challenge=challenge).select_related('author', 'category')

        data = ChallengeSerializer(challenge).data
        data['entries'] = StoryCardSerializer(stories, many=True, context={'request': request}).data

        # "Your published stories that could still enter" - for the
        # Enter button. Empty for visitors who are logged out.
        data['my_eligible_stories'] = []
        if request.user.is_authenticated and challenge.is_open():
            mine = visible.filter(author=request.user).exclude(challenge_entries__challenge=challenge)
            data['my_eligible_stories'] = [{'id': story.id, 'title': story.title} for story in mine]

        return Response(data)


# POST /api/challenges/3/enter/  { story_id }
class EnterChallengeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)
        if not challenge.is_open():
            return Response({'detail': 'This challenge is closed.'}, status=400)

        # Only YOUR published stories.
        story = get_object_or_404(
            stories_for(request.user).filter(author=request.user), pk=request.data.get('story_id'),
        )
        # get_or_create: entering twice doesn't make a second row.
        ChallengeEntry.objects.get_or_create(challenge=challenge, story=story)
        return Response({'detail': f'"{story.title}" is entered. Good luck!'}, status=201)


# GET /api/bundles/  -> the published bundles
class BundleListView(generics.ListAPIView):
    serializer_class = BundleSerializer
    queryset = Bundle.objects.filter(is_published=True)


# GET /api/bundles/best-haunted-houses/  -> one bundle + its stories
class BundleDetailView(APIView):
    def get(self, request, slug):
        bundle = get_object_or_404(Bundle, slug=slug, is_published=True)
        stories = stories_for(request.user).filter(bundles=bundle).select_related('author', 'category')

        data = BundleSerializer(bundle).data
        data['stories'] = StoryCardSerializer(stories, many=True, context={'request': request}).data
        return Response(data)


# ===============================================================
# ADMIN - add / edit / delete (Admin Dashboard)
#
# Django REST Framework's generic views do nearly everything:
#   ListCreateAPIView            GET = list,  POST = add
#   RetrieveUpdateDestroyAPIView GET = one, PATCH = edit, DELETE = delete
# We only say WHICH rows (queryset), HOW to turn them into JSON
# (serializer_class) and WHO may use it (permission_classes).
# ===============================================================

# Announcements: turning one ON switches all the others OFF, so the
# site never has two banners fighting for the top of the page.
def only_this_one_active(announcement):
    if announcement.is_active:
        Announcement.objects.exclude(pk=announcement.pk).update(is_active=False)


class AdminAnnouncementListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AnnouncementSerializer
    queryset = Announcement.objects.all()

    # perform_create runs when a POST passed validation.
    def perform_create(self, serializer):
        only_this_one_active(serializer.save())


class AdminAnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AnnouncementSerializer
    queryset = Announcement.objects.all()

    def perform_update(self, serializer):
        only_this_one_active(serializer.save())


class AdminPromptListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = WritingPromptSerializer
    queryset = WritingPrompt.objects.all()


class AdminPromptDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = WritingPromptSerializer
    queryset = WritingPrompt.objects.all()


class AdminChallengeListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = ChallengeSerializer
    queryset = Challenge.objects.select_related('winner')


class AdminChallengeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = ChallengeSerializer
    queryset = Challenge.objects.all()

    # GET also sends the entries, so the admin can pick a winner.
    def retrieve(self, request, *args, **kwargs):
        challenge = self.get_object()
        data = self.get_serializer(challenge).data
        data['entries'] = [
            {'story_id': entry.story_id, 'title': entry.story.title, 'author': entry.story.author.username}
            for entry in challenge.entries.select_related('story__author')
        ]
        return Response(data)


class AdminBundleListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = BundleSerializer
    queryset = Bundle.objects.all()

    # Remember which admin made it.
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminBundleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = BundleSerializer
    queryset = Bundle.objects.all()


# Categories. Deleting one does NOT delete its stories - they just
# lose their category (on_delete=SET_NULL on Story.category).
class AdminCategoryListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.order_by('name')


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all()


# GET /api/dashboard/story-picker/  -> every published story, short
# (id, title, author) - for the "add stories" lists on the Bundles,
# Challenges and Story of Week pages.
class AdminStoryPickerView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        stories = Story.objects.filter(is_published=True, is_archived=False).select_related('author').order_by('-created_at')
        return Response([
            {
                'id': story.id,
                'title': story.title,
                'author': story.author.username,
                'views': story.views,
                'is_story_of_the_day': story.is_story_of_the_day,
                'is_story_of_the_week': story.is_story_of_the_week,
                'created_at': story.created_at,
            }
            for story in stories
        ])


# ===============================================================
# COOKIE CONSENT
# ===============================================================

# GET /api/cookie-banner/  -> { is_enabled, message }  (anyone)
class CookieBannerView(APIView):
    def get(self, request):
        banner = CookieBanner.load()
        return Response({'is_enabled': banner.is_enabled, 'message': banner.message})


# POST /api/cookie-consent/  { choice: 'all' | 'essential' }  (anyone)
# Only counts the choice - nothing about WHO chose it is stored.
class CookieConsentView(APIView):
    def post(self, request):
        choice = request.data.get('choice')
        if choice not in ('all', 'essential'):
            return Response({'detail': 'Unknown choice.'}, status=400)
        CookieConsent.objects.create(choice=choice)
        return Response(status=201)


# GET   /api/dashboard/cookie-consent/  -> the settings + the counts
# PATCH /api/dashboard/cookie-consent/  { is_enabled, message }
class AdminCookieView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        banner = CookieBanner.load()
        month_ago = timezone.now() - timedelta(days=30)
        recent = CookieConsent.objects.filter(created_at__gte=month_ago)
        return Response({
            'is_enabled': banner.is_enabled,
            'message': banner.message,
            'updated_at': banner.updated_at,
            'last_30_days': {
                'all': recent.filter(choice='all').count(),
                'essential': recent.filter(choice='essential').count(),
            },
            'all_time': {
                'all': CookieConsent.objects.filter(choice='all').count(),
                'essential': CookieConsent.objects.filter(choice='essential').count(),
            },
        })

    def patch(self, request):
        banner = CookieBanner.load()
        if 'is_enabled' in request.data:
            banner.is_enabled = request.data['is_enabled'] in (True, 'true')
        if 'message' in request.data:
            message = (request.data['message'] or '').strip()
            if not message:
                return Response({'detail': 'The banner needs a message.'}, status=400)
            banner.message = message[:1000]
        banner.save()
        return self.get(request)


# ===============================================================
# MOOD OF THE DAY
# ===============================================================

# GET /api/mood-of-the-day/
#   -> { date, mood, mood_label, note, stories: [...cards] } or 204
# The homepage section. Up to 6 stories in that mood, most viewed first.
class MoodOfTheDayView(APIView):
    def get(self, request):
        today = MoodOfDay.objects.filter(date=timezone.localdate()).first()
        if today is None:
            return Response(status=204)

        stories = (
            stories_for(request.user)
            .filter(mood=today.mood)
            .select_related('author', 'category')
            .order_by('-views')[:6]
        )
        data = MoodOfDaySerializer(today).data
        data['mood_label'] = today.get_mood_display()
        data['stories'] = StoryCardSerializer(stories, many=True, context={'request': request}).data
        return Response(data)


# Admin: plan moods ahead. GET lists them (from 7 days ago onwards).
class AdminMoodListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = MoodOfDaySerializer

    def get_queryset(self):
        return MoodOfDay.objects.filter(date__gte=timezone.localdate() - timedelta(days=7))


class AdminMoodDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = MoodOfDaySerializer
    queryset = MoodOfDay.objects.all()


# ===============================================================
# STORY SPOTLIGHT
# ===============================================================

class SpotlightSerializer(serializers.ModelSerializer):
    # Write: the story's id. Read: its title too.
    story_id = serializers.PrimaryKeyRelatedField(source='story', queryset=Story.objects.all())
    story_title = serializers.CharField(source='story.title', read_only=True)

    class Meta:
        model = Spotlight
        fields = ['id', 'story_id', 'story_title', 'headline', 'blurb', 'starts_on', 'ends_on']

    # A rule about TWO fields together -> validate().
    def validate(self, data):
        starts = data.get('starts_on', getattr(self.instance, 'starts_on', None))
        ends = data.get('ends_on', getattr(self.instance, 'ends_on', None))
        if starts and ends and ends < starts:
            raise serializers.ValidationError({'ends_on': ['The end date is before the start date.']})
        return data


# GET /api/spotlight/  -> today's spotlight + the story card, or 204.
class CurrentSpotlightView(APIView):
    def get(self, request):
        today = timezone.localdate()
        # __lte = "less than or equal", __gte = "greater than or equal".
        spotlights = Spotlight.objects.filter(starts_on__lte=today, ends_on__gte=today).select_related('story')
        visible = stories_for(request.user)
        for spotlight in spotlights:
            # The story must still be visible to THIS visitor.
            story = visible.filter(pk=spotlight.story_id).select_related('author', 'category').first()
            if story:
                data = SpotlightSerializer(spotlight).data
                data['story'] = StoryCardSerializer(story, context={'request': request}).data
                return Response(data)
        return Response(status=204)


class AdminSpotlightListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = SpotlightSerializer
    queryset = Spotlight.objects.select_related('story')


class AdminSpotlightDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = SpotlightSerializer
    queryset = Spotlight.objects.all()


# ===============================================================
# POLLS
# ===============================================================

# The poll with its results. my_vote = the option id YOU picked
# (None if you haven't voted, or are logged out).
def poll_data(poll, user):
    counts = {option.id: 0 for option in poll.options.all()}
    for option_id in poll.votes.values_list('option_id', flat=True):
        counts[option_id] = counts.get(option_id, 0) + 1
    total = sum(counts.values())

    my_vote = None
    if user.is_authenticated:
        my_vote = poll.votes.filter(user=user).values_list('option_id', flat=True).first()

    return {
        'id': poll.id,
        'question': poll.question,
        'is_active': poll.is_active,
        'created_at': poll.created_at,
        'total_votes': total,
        'my_vote': my_vote,
        'options': [
            {
                'id': option.id,
                'text': option.text,
                'votes': counts[option.id],
                # max(total, 1): no dividing by zero before the first vote.
                'percent': round(counts[option.id] * 100 / max(total, 1)),
            }
            for option in poll.options.all()
        ],
    }


# GET /api/polls/current/  -> the newest active poll, or 204
class CurrentPollView(APIView):
    def get(self, request):
        poll = Poll.objects.filter(is_active=True).prefetch_related('options').first()
        if poll is None:
            return Response(status=204)
        return Response(poll_data(poll, request.user))


# POST /api/polls/3/vote/  { option_id }  - once per member.
class VoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        poll = get_object_or_404(Poll, pk=pk, is_active=True)
        option = get_object_or_404(PollOption, pk=request.data.get('option_id'), poll=poll)
        if PollVote.objects.filter(poll=poll, user=request.user).exists():
            return Response({'detail': 'You already voted.'}, status=400)
        PollVote.objects.create(poll=poll, option=option, user=request.user)
        return Response(poll_data(poll, request.user))


# GET  /api/dashboard/polls/  -> every poll with results
# POST /api/dashboard/polls/  { question, options: ['A', 'B', ...] }
class AdminPollListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        polls = Poll.objects.prefetch_related('options')
        return Response([poll_data(poll, request.user) for poll in polls])

    def post(self, request):
        question = (request.data.get('question') or '').strip()
        # Keep only the options that aren't empty.
        options = [text.strip() for text in request.data.get('options', []) if text.strip()]
        if not question:
            return Response({'detail': 'Write the question.'}, status=400)
        if len(options) < 2:
            return Response({'detail': 'A poll needs at least 2 answers.'}, status=400)

        # Only one poll runs at a time: a new one switches the others off.
        Poll.objects.update(is_active=False)
        poll = Poll.objects.create(question=question[:200])
        for text in options[:8]:
            PollOption.objects.create(poll=poll, text=text[:100])
        return Response(poll_data(poll, request.user), status=201)


# PATCH  /api/dashboard/polls/3/  { is_active }  -> open / close it
# DELETE /api/dashboard/polls/3/
class AdminPollDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        poll = get_object_or_404(Poll, pk=pk)
        poll.is_active = request.data.get('is_active') in (True, 'true')
        if poll.is_active:
            Poll.objects.exclude(pk=poll.pk).update(is_active=False)
        poll.save()
        return Response(poll_data(poll, request.user))

    def delete(self, request, pk):
        get_object_or_404(Poll, pk=pk).delete()
        return Response(status=204)


# ===============================================================
# FEATURED AUTHORS
# ===============================================================

# GET  /api/dashboard/featured-authors/  -> the featured writers, in order
# POST /api/dashboard/featured-authors/  { username, blurb }
class AdminFeaturedListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        rows = FeaturedAuthor.objects.select_related('user')
        return Response([
            {
                'id': row.id,
                'username': row.user.username,
                'blurb': row.blurb,
                'order': row.order,
                'story_count': row.user.stories.filter(is_published=True).count(),
            }
            for row in rows
        ])

    def post(self, request):
        user = get_user_model().objects.filter(username__iexact=(request.data.get('username') or '').strip()).first()
        if user is None:
            return Response({'detail': 'No member with that username.'}, status=400)
        if FeaturedAuthor.objects.filter(user=user).exists():
            return Response({'detail': f'{user.username} is already featured.'}, status=400)

        # New ones go at the END of the row: one more than the last.
        last = FeaturedAuthor.objects.order_by('-order').first()
        FeaturedAuthor.objects.create(
            user=user,
            blurb=(request.data.get('blurb') or '').strip()[:120],
            order=(last.order + 1) if last else 0,
        )
        return self.get(request)


# PATCH  /api/dashboard/featured-authors/3/  { blurb } or { move: 'up' | 'down' }
# DELETE /api/dashboard/featured-authors/3/
class AdminFeaturedDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        row = get_object_or_404(FeaturedAuthor, pk=pk)

        if 'blurb' in request.data:
            row.blurb = (request.data.get('blurb') or '').strip()[:120]
            row.save()

        move = request.data.get('move')
        if move in ('up', 'down'):
            # Swap places with the neighbour on that side.
            rows = list(FeaturedAuthor.objects.all())
            index = rows.index(row)
            other = index - 1 if move == 'up' else index + 1
            if 0 <= other < len(rows):
                rows[index], rows[other] = rows[other], rows[index]
                # Number them again 0, 1, 2... in the new order.
                for position, item in enumerate(rows):
                    if item.order != position:
                        item.order = position
                        item.save()

        return AdminFeaturedListView().get(request)

    def delete(self, request, pk):
        get_object_or_404(FeaturedAuthor, pk=pk).delete()
        return Response(status=204)
