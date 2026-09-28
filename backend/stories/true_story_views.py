from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.notifications import notify, short_title
from categories.models import Category
from dashboard.limits import hourly_limit_reached
from moderation.content_filter import check_text, BLOCKED_MESSAGE
from .models import (
    Story, Tag, TrueStorySubmission, CONTENT_RATINGS, TRUE_STORY_TAG, anonymous_author,
)


# ---------------------------------------------------------------
# TRUE STORIES API (how it works: see TrueStorySubmission in models.py)
#
# Members:
#   GET    /api/true-stories/        -> my submissions + their status
#   POST   /api/true-stories/        -> send one { title, body, where_when, category_id, confirm_true }
#   DELETE /api/true-stories/<id>/   -> take back one that's still waiting
# Admins:
#   GET  /api/dashboard/true-stories/?status=pending
#   POST /api/dashboard/true-stories/<id>/approve/ { category_id, content_rating }
#   POST /api/dashboard/true-stories/<id>/reject/  { note }
# ---------------------------------------------------------------
RATING_KEYS = [key for key, _label in CONTENT_RATINGS]


def my_submission_data(item):
    # What the SENDER sees. (No body - they wrote it, and the list stays short.)
    return {
        'id': item.id,
        'title': item.title,
        'status': item.status,
        'admin_note': item.admin_note,
        'story_id': item.story_id,
        'created_at': item.created_at,
    }


def admin_submission_data(item):
    # What ADMINS see - including who sent it (never shown publicly).
    return {
        **my_submission_data(item),
        'body': item.body,
        'where_when': item.where_when,
        'category_id': item.category_id,
        'submitted_by': item.submitted_by.username,
        'reviewed_by': item.reviewed_by.username if item.reviewed_by else None,
    }


class TrueStoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = TrueStorySubmission.objects.filter(submitted_by=request.user)
        return Response([my_submission_data(item) for item in items])

    def post(self, request):
        title = (request.data.get('title') or '').strip()
        body = (request.data.get('body') or '').strip()
        where_when = (request.data.get('where_when') or '').strip()

        if request.data.get('confirm_true') is not True:
            return Response({'detail': 'Tick the box to confirm this really happened to you.'}, status=400)
        if not title or len(body.split()) < 50:
            return Response({'detail': 'Give it a title and tell us what happened (at least 50 words).'}, status=400)
        if check_text(f'{title} {body} {where_when}')[0] == 'block':
            return Response({'detail': BLOCKED_MESSAGE}, status=400)
        # A handful an hour is plenty for true stories.
        if hourly_limit_reached(request.user, TrueStorySubmission.objects.filter(submitted_by=request.user), 3):
            return Response({'detail': 'You sent a few already - please wait a bit before sending another.'}, status=429)

        category_id = request.data.get('category_id')
        category = Category.objects.filter(pk=category_id).first() if category_id else None
        item = TrueStorySubmission.objects.create(
            submitted_by=request.user, title=title[:200], body=body[:20000], where_when=where_when[:200], category=category,
        )
        return Response(my_submission_data(item), status=201)


class TrueStoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        # Only your own, and only while it's still waiting.
        item = get_object_or_404(TrueStorySubmission, pk=pk, submitted_by=request.user, status='pending')
        item.delete()
        return Response(status=204)


class AdminTrueStoryListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        items = TrueStorySubmission.objects.select_related('submitted_by', 'reviewed_by')
        status = request.query_params.get('status', 'pending')
        if status != 'all':
            items = items.filter(status=status)
        return Response([admin_submission_data(item) for item in items])


class AdminTrueStoryActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk, action):
        item = get_object_or_404(TrueStorySubmission, pk=pk, status='pending')

        if action == 'approve':
            rating = request.data.get('content_rating') or 'teen'
            if rating not in RATING_KEYS:
                return Response({'detail': 'Pick a content rating.'}, status=400)
            category_id = request.data.get('category_id') or item.category_id
            story = Story.objects.create(
                title=item.title,
                body=item.body,
                author=anonymous_author(),       # never the real sender
                category=Category.objects.filter(pk=category_id).first() if category_id else None,
                location=item.where_when,
                content_rating=rating,
                is_published=True,
            )
            tag, _ = Tag.objects.get_or_create(name=TRUE_STORY_TAG)
            story.tags.add(tag)
            item.story = story
            item.status = 'approved'
            message = f'Your true story "{short_title(item.title)}" was published anonymously.'
            link = f'/stories/{story.id}'
        elif action == 'reject':
            item.status = 'rejected'
            item.admin_note = (request.data.get('note') or '').strip()[:300]
            message = f'Your true story "{short_title(item.title)}" was not published.'
            if item.admin_note:
                message += f' {item.admin_note}'
            link = '/true-stories/submit'
        else:
            return Response({'detail': 'Unknown action.'}, status=404)

        item.reviewed_by = request.user
        item.reviewed_at = timezone.now()
        item.save()
        # actor=None: the notification doesn't say WHICH admin.
        notify(item.submitted_by, None, 'truestory', message, link)
        return Response(admin_submission_data(item))
