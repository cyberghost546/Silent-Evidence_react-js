from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from moderation.content_filter import check_text, BLOCKED_MESSAGE
from .models import Story, StoryVersion
from .views import flag_if_needed


# ---------------------------------------------------------------
# EDITING YOUR STORY + ITS VERSION HISTORY (only your own stories).
#
#   GET   /api/stories/<id>/edit/                      -> title, excerpt, body to edit
#   PATCH /api/stories/<id>/edit/  { title, excerpt, body }
#           -> saves; the OLD text goes into the history first
#   GET   /api/stories/<id>/versions/                  -> the history, newest first
#   POST  /api/stories/<id>/versions/<vid>/restore/    -> put an old version back
#           (the current text is kept in the history too - so a
#            restore can be undone as well)
#
# Other people's stories: 404, like everywhere else.
# ---------------------------------------------------------------
KEEP_VERSIONS = 30
MAX_BODY = 100_000   # the same limit as the Write page (StoryCreateSerializer)


def keep_old_version(story):
    StoryVersion.objects.create(story=story, title=story.title, excerpt=story.excerpt, body=story.body)
    # Only the newest KEEP_VERSIONS: delete everything after them.
    old_ids = story.versions.values_list('id', flat=True)[KEEP_VERSIONS:]
    StoryVersion.objects.filter(id__in=list(old_ids)).delete()


def edit_data(story):
    return {'id': story.id, 'title': story.title, 'excerpt': story.excerpt, 'body': story.body, 'is_published': story.is_published}


class StoryEditView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        return Response(edit_data(get_object_or_404(Story, pk=pk, author=request.user)))

    def patch(self, request, pk):
        story = get_object_or_404(Story, pk=pk, author=request.user)
        title = (request.data.get('title', story.title) or '').strip()
        excerpt = (request.data.get('excerpt', story.excerpt) or '').strip()
        body = (request.data.get('body', story.body) or '').strip()

        if not title or not body:
            return Response({'detail': 'A story needs a title and some text.'}, status=400)
        if len(title) > 200 or len(excerpt) > 300 or len(body) > MAX_BODY:
            return Response({'detail': 'That is too long (title 200, excerpt 300, story 100,000 characters).'}, status=400)
        text = ' '.join([title, excerpt, body])
        if check_text(text)[0] == 'block':
            return Response({'detail': BLOCKED_MESSAGE}, status=400)
        if (title, excerpt, body) == (story.title, story.excerpt, story.body):
            return Response(edit_data(story))   # nothing changed - no new version

        keep_old_version(story)
        story.title, story.excerpt, story.body = title, excerpt, body
        story.save()
        # A "flag" word: saved, but reported to the admins (same as new stories).
        flag_if_needed(text, story=story)
        return Response(edit_data(story))


class StoryVersionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        story = get_object_or_404(Story, pk=pk, author=request.user)
        return Response([
            {
                'id': version.id,
                'title': version.title,
                'excerpt': version.excerpt,
                'body': version.body,
                'saved_at': version.saved_at,
                'words': len(version.body.split()),
            }
            for version in story.versions.all()
        ])


class RestoreVersionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, version_id):
        story = get_object_or_404(Story, pk=pk, author=request.user)
        version = get_object_or_404(StoryVersion, pk=version_id, story=story)
        keep_old_version(story)
        story.title, story.excerpt, story.body = version.title, version.excerpt, version.body
        story.save()
        return Response(edit_data(story))
