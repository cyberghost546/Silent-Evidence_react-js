from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.notifications import notify, short_title
from moderation.content_filter import check_text, BLOCKED_MESSAGE
from .models import Story, BetaReader, BetaFeedback


# ---------------------------------------------------------------
# BETA READERS - "read my draft and tell me what you think".
#
# The WRITER (My Stories page):
#   GET    /api/stories/<id>/beta/              -> readers + all feedback
#   POST   /api/stories/<id>/beta/  {username}  -> invite someone
#   DELETE /api/stories/<id>/beta/<username>/   -> take the invite back
# The READER (on the draft's story page):
#   POST   /api/stories/<id>/beta/feedback/  {body}   -> private feedback
#
# Beta readers may open that ONE draft (StoryDetailView lets them in).
# Feedback is private: only the writer and whoever wrote it see it.
# ---------------------------------------------------------------

def feedback_data(item):
    return {'id': item.id, 'reader': item.reader.username, 'body': item.body, 'created_at': item.created_at}


class BetaReadersView(APIView):
    permission_classes = [IsAuthenticated]

    def my_story(self, request, pk):
        # Only YOUR story - anyone else gets a 404.
        return get_object_or_404(Story, pk=pk, author=request.user)

    def get(self, request, pk):
        story = self.my_story(request, pk)
        return Response({
            'readers': list(story.beta_readers.values_list('reader__username', flat=True)),
            'feedback': [feedback_data(item) for item in story.beta_feedback.select_related('reader')],
        })

    def post(self, request, pk):
        story = self.my_story(request, pk)
        username = (request.data.get('username') or '').strip()
        reader = get_user_model().objects.filter(username__iexact=username).first()
        if reader is None:
            return Response({'detail': 'No member with that username.'}, status=400)
        if reader == request.user:
            return Response({'detail': 'You can read your own draft already.'}, status=400)
        if story.beta_readers.count() >= 10:
            return Response({'detail': 'Up to 10 beta readers per story.'}, status=400)
        _, created = BetaReader.objects.get_or_create(story=story, reader=reader)
        if created:
            notify(reader, request.user, 'beta',
                   f'{request.user.username} asked you to beta-read "{short_title(story.title)}"', f'/stories/{story.id}')
        return Response({'readers': list(story.beta_readers.values_list('reader__username', flat=True))}, status=201)


class RemoveBetaReaderView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, username):
        story = get_object_or_404(Story, pk=pk, author=request.user)
        story.beta_readers.filter(reader__username__iexact=username).delete()
        return Response(status=204)


class BetaFeedbackView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        story = get_object_or_404(Story, pk=pk, beta_readers__reader=request.user)
        body = (request.data.get('body') or '').strip()
        if not body:
            return Response({'detail': 'Write your feedback first.'}, status=400)
        if len(body) > 5000:
            return Response({'detail': 'Keep it under 5000 characters.'}, status=400)
        if check_text(body)[0] == 'block':
            return Response({'detail': BLOCKED_MESSAGE}, status=400)
        item = BetaFeedback.objects.create(story=story, reader=request.user, body=body)
        notify(story.author, request.user, 'beta',
               f'{request.user.username} sent beta feedback on "{short_title(story.title)}"', '/my-stories')
        return Response(feedback_data(item), status=201)
