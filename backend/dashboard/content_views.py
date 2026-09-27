from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from stories.models import Story, Tag
from stories.serializers import StoryWriteSerializer


# ---------------------------------------------------------------
# SCHEDULED STORIES and TAG MANAGER (Admin Dashboard). Admins only.
# ---------------------------------------------------------------

def scheduled_data(story):
    return {
        'id': story.id,
        'title': story.title,
        'author': story.author.username,
        'category': story.category.name if story.category else None,
        'publish_at': story.publish_at,
    }


# GET /api/dashboard/scheduled/  -> stories waiting for their date,
# the soonest first. "Scheduled" = published, not archived, and the
# publish date is still in the future.
class ScheduledStoriesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        stories = (
            Story.objects
            .filter(is_published=True, is_archived=False, publish_at__gt=timezone.now())
            .select_related('author', 'category')
            .order_by('publish_at')
        )
        return Response([scheduled_data(story) for story in stories])


# POST /api/dashboard/scheduled/5/
#   { action: 'now' }                        -> publish right away
#   { action: 'move', publish_at: '...' }    -> another date/time
#   { action: 'cancel' }                     -> back to a draft
class ScheduledStoryActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        story = get_object_or_404(Story, pk=pk)
        action = request.data.get('action')

        if action == 'now':
            story.publish_at = None
        elif action == 'cancel':
            story.is_published = False
            story.publish_at = None
        elif action == 'move':
            # parse_datetime turns "2026-10-31T21:00:00Z" into a real
            # date-time (or None if it's nonsense).
            when = parse_datetime(request.data.get('publish_at') or '')
            if when is None or when <= timezone.now():
                return Response({'detail': 'Pick a date and time in the future.'}, status=400)
            story.publish_at = when
        else:
            return Response({'detail': 'Unknown action.'}, status=400)

        story.save()
        return Response({'id': story.id, 'publish_at': story.publish_at, 'is_published': story.is_published})


# ---------------------------------------------------------------
# TAGS
# ---------------------------------------------------------------

# GET /api/tags/?q=ha  -> the most used tags (for suggestions on
# the Write page). Anyone.
class TagSuggestionsView(APIView):
    def get(self, request):
        tags = Tag.objects.annotate(story_count=Count('stories')).order_by('-story_count', 'name')
        query = (request.query_params.get('q') or '').strip().lower()
        if query:
            tags = tags.filter(name__startswith=query)
        return Response([{'name': tag.name, 'story_count': tag.story_count} for tag in tags[:20]])


# GET /api/dashboard/tags/  -> every tag with how many stories use it
class AdminTagListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        tags = Tag.objects.annotate(story_count=Count('stories')).order_by('name')
        return Response([{'id': tag.id, 'name': tag.name, 'story_count': tag.story_count} for tag in tags])


# PATCH  /api/dashboard/tags/5/  { name }  -> rename
#        (renaming to a name that already exists = merge into it)
# DELETE /api/dashboard/tags/5/            -> remove from every story
class AdminTagDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        tag = get_object_or_404(Tag, pk=pk)
        # Same cleaning as the Write page (StoryWriteSerializer).
        new_name = StoryWriteSerializer.clean_tag(request.data.get('name') or '')
        if not new_name:
            return Response({'detail': 'Give it a name (letters, numbers, dashes).'}, status=400)

        existing = Tag.objects.filter(name=new_name).exclude(pk=tag.pk).first()
        if existing:
            merge_tags(tag, existing)
            return Response({'detail': f'Merged into "{existing.name}".'})

        tag.name = new_name
        tag.save()
        return Response({'detail': f'Renamed to "{new_name}".'})

    def delete(self, request, pk):
        get_object_or_404(Tag, pk=pk).delete()
        return Response(status=204)


# POST /api/dashboard/tags/5/merge/  { into_id }
# "spooky-house" + "haunted-house" -> every story gets the second one,
# and the first disappears.
class MergeTagView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        tag = get_object_or_404(Tag, pk=pk)
        into = get_object_or_404(Tag, pk=request.data.get('into_id'))
        if tag == into:
            return Response({'detail': "Can't merge a tag into itself."}, status=400)
        merge_tags(tag, into)
        return Response({'detail': f'"{tag.name}" merged into "{into.name}".'})


def merge_tags(old, into):
    # .add(*stories) = add every story of the old tag to the new one
    # (a story that already had both just keeps one).
    into.stories.add(*old.stories.all())
    old.delete()
