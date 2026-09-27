import random
from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from categories.models import Category
from stories.models import Story, stories_for
from stories.serializers import StoryCardSerializer
from .models import Announcement, WritingPrompt, Challenge, ChallengeEntry, Bundle, CookieBanner, CookieConsent
from .serializers import (
    AnnouncementSerializer, WritingPromptSerializer, ChallengeSerializer,
    BundleSerializer, AdminCategorySerializer,
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
