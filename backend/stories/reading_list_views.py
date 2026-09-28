from django.contrib.auth import get_user_model
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from moderation.content_filter import check_text, BLOCKED_MESSAGE
from .models import ReadingList, ReadingListItem, stories_for
from .serializers import StoryCardSerializer


# ---------------------------------------------------------------
# READING LISTS API (see ReadingList in models.py)
#
#   GET    /api/reading-lists/                       -> my lists (logged in)
#   GET    /api/reading-lists/?user=raven            -> raven's PUBLIC lists
#   POST   /api/reading-lists/  { title, description, is_public }
#   GET    /api/reading-lists/<id>/                  -> one list + its stories
#   PATCH  /api/reading-lists/<id>/                  -> owner: change it
#   DELETE /api/reading-lists/<id>/                  -> owner: delete it
#   POST   /api/reading-lists/<id>/stories/<story>/  -> owner: add a story
#   DELETE /api/reading-lists/<id>/stories/<story>/  -> owner: take it out
# ---------------------------------------------------------------
MAX_LISTS = 50
MAX_STORIES = 100


def list_data(reading_list, story_count, contains=None):
    data = {
        'id': reading_list.id,
        'title': reading_list.title,
        'description': reading_list.description,
        'is_public': reading_list.is_public,
        'owner': reading_list.owner.username,
        'story_count': story_count,
        'updated_at': reading_list.updated_at,
    }
    # For the "Add to list" picker: is THIS story in the list already?
    if contains is not None:
        data['has_story'] = contains
    return data


def clean_fields(request):
    # -> (fields, problem). The same checks for making and changing a list.
    fields = {}
    if 'title' in request.data:
        fields['title'] = (request.data.get('title') or '').strip()[:100]
        if not fields['title']:
            return None, 'Give your list a name.'
    if 'description' in request.data:
        fields['description'] = (request.data.get('description') or '').strip()[:300]
    if 'is_public' in request.data:
        fields['is_public'] = bool(request.data.get('is_public'))
    text = f"{fields.get('title', '')} {fields.get('description', '')}"
    if check_text(text)[0] == 'block':
        return None, BLOCKED_MESSAGE
    return fields, None


def visible_list(request, pk):
    # A private list is 404 for everyone but its owner - same answer
    # as "doesn't exist", so nobody can find out it's there.
    reading_list = get_object_or_404(ReadingList.objects.select_related('owner'), pk=pk)
    if not reading_list.is_public and reading_list.owner != request.user:
        return None
    return reading_list


class ReadingListsView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        username = request.query_params.get('user')
        if username:
            owner = get_object_or_404(get_user_model(), username=username)
            lists = ReadingList.objects.filter(owner=owner)
            if owner != request.user:
                lists = lists.filter(is_public=True)
        elif request.user.is_authenticated:
            lists = ReadingList.objects.filter(owner=request.user)
        else:
            return Response([])

        lists = lists.select_related('owner').annotate(count=Count('items'))
        # ?story=5 -> also say, per list, whether story 5 is in it.
        story_id = request.query_params.get('story')
        with_story = set()
        if story_id and story_id.isdigit():
            with_story = set(ReadingListItem.objects.filter(reading_list__in=lists, story_id=story_id).values_list('reading_list_id', flat=True))
        return Response([
            list_data(item, item.count, (item.id in with_story) if story_id else None) for item in lists
        ])

    def post(self, request):
        if ReadingList.objects.filter(owner=request.user).count() >= MAX_LISTS:
            return Response({'detail': f'You can have up to {MAX_LISTS} lists.'}, status=400)
        fields, problem = clean_fields(request)
        if problem or 'title' not in fields:
            return Response({'detail': problem or 'Give your list a name.'}, status=400)
        reading_list = ReadingList.objects.create(owner=request.user, **fields)
        return Response(list_data(reading_list, 0), status=201)


class ReadingListDetailView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        reading_list = visible_list(request, pk)
        if reading_list is None:
            return Response({'detail': 'Not found.'}, status=404)
        # Only stories THIS visitor may read (drafts, 18+ settings,
        # blocked authors...) - a list can't be a back door.
        story_ids = reading_list.items.values_list('story_id', flat=True)
        stories = stories_for(request.user).filter(id__in=story_ids).select_related('author', 'category')
        # Keep the list's own order (the order stories were added).
        order = {story_id: position for position, story_id in enumerate(story_ids)}
        stories = sorted(stories, key=lambda story: order[story.id])
        data = list_data(reading_list, len(stories))
        data['stories'] = StoryCardSerializer(stories, many=True, context={'request': request}).data
        data['is_mine'] = reading_list.owner == request.user
        return Response(data)

    def patch(self, request, pk):
        reading_list = get_object_or_404(ReadingList, pk=pk, owner=request.user)
        fields, problem = clean_fields(request)
        if problem:
            return Response({'detail': problem}, status=400)
        for name, value in fields.items():
            setattr(reading_list, name, value)
        reading_list.save()
        return Response(list_data(reading_list, reading_list.items.count()))

    def delete(self, request, pk):
        get_object_or_404(ReadingList, pk=pk, owner=request.user).delete()
        return Response(status=204)


class ReadingListStoryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, story_id):
        reading_list = get_object_or_404(ReadingList, pk=pk, owner=request.user)
        # You can only add stories you can actually read.
        story = get_object_or_404(stories_for(request.user), pk=story_id)
        if reading_list.items.count() >= MAX_STORIES:
            return Response({'detail': f'A list can hold up to {MAX_STORIES} stories.'}, status=400)
        ReadingListItem.objects.get_or_create(reading_list=reading_list, story=story)
        reading_list.save()   # bumps updated_at, so it moves to the top
        return Response({'added': True})

    def delete(self, request, pk, story_id):
        reading_list = get_object_or_404(ReadingList, pk=pk, owner=request.user)
        reading_list.items.filter(story_id=story_id).delete()
        return Response(status=204)
