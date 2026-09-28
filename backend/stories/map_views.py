from rest_framework.response import Response
from rest_framework.views import APIView

from .models import TRUE_STORY_TAG, stories_for


# ---------------------------------------------------------------
# GET /api/stories/map/  - every story with a place, for the Haunted Map
#   [ { id, title, author, location, lat, lng, is_true }, ... ]
#
# Only stories THIS visitor may read (drafts, 18+, blocked... all
# filtered by stories_for). is_true = a true story (red pin).
# ---------------------------------------------------------------
MAX_PINS = 1000


class StoryMapView(APIView):
    def get(self, request):
        stories = (
            stories_for(request.user)
            .filter(latitude__isnull=False, longitude__isnull=False)
            .select_related('author')
            .prefetch_related('tags')
            .order_by('-created_at')[:MAX_PINS]
        )
        return Response([
            {
                'id': story.id,
                'title': story.title,
                'author': story.author.username,
                'location': story.location,
                'lat': float(story.latitude),
                'lng': float(story.longitude),
                'is_true': any(tag.name == TRUE_STORY_TAG for tag in story.tags.all()),
            }
            for story in stories
        ])
