from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import stories_for
from .search import search_stories
from .serializers import StoryCardSerializer


# ---------------------------------------------------------------
# THE SEARCH PAGE - stories (search.py does the matching) and writers.
# (Moved out of views.py, which had grown to 900 lines.)
# ---------------------------------------------------------------
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

        # Every word must match somewhere; best matches first
        # (stories/search.py - it also uses Postgres's own search online).
        stories = search_stories(stories_for(request.user), query).select_related('author', 'category')[:30]

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
