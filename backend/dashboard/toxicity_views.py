import json

import anthropic
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from moderation.models import ToxicityCheck
from stories.models import Comment
from .ai import MODEL, ai_is_configured


# ---------------------------------------------------------------
# AI TOXICITY QUEUE (Admin Dashboard -> AI Toxicity Queue).
#
# 1. "Scan comments" sends up to BATCH_SIZE comments that were never
#    checked to Claude, in ONE request (cheaper than one each).
# 2. Claude gives each a score from 0 to 100 and a category.
# 3. Score >= FLAG_SCORE -> "flagged": it shows up in the queue.
# 4. An admin decides: Hide (the comment disappears from the site)
#    or Approve (it stays). Claude never hides anything by itself.
#
# Needs ANTHROPIC_API_KEY, like the AI Generator (see dashboard/ai.py).
# ---------------------------------------------------------------

BATCH_SIZE = 20
FLAG_SCORE = 60

CATEGORIES = ['none', 'harassment', 'hate', 'threat', 'sexual', 'self_harm', 'spam', 'other']

SYSTEM_PROMPT = """You review reader comments on Silent Evidence, a community site for horror fiction.

Scary, violent or disturbing talk ABOUT a story is normal here and is not toxic - readers discuss monsters, murders and ghosts all day. Judge how the commenter treats real people: other readers, the author, groups of people.

For every comment give:
- score: 0 (friendly or neutral) to 100 (clearly abusive). Use 60 or more only when a moderator should look at it.
- category: the main problem, or "none".
- reason: one short sentence a moderator can read quickly. For "none", just say why it is fine."""

# The exact JSON shape we want back (structured outputs).
RESULT_SCHEMA = {
    'type': 'object',
    'properties': {
        'results': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'comment_id': {'type': 'integer'},
                    'score': {'type': 'integer'},
                    'category': {'type': 'string', 'enum': CATEGORIES},
                    'reason': {'type': 'string'},
                },
                'required': ['comment_id', 'score', 'category', 'reason'],
                'additionalProperties': False,
            },
        },
    },
    'required': ['results'],
    'additionalProperties': False,
}


def unscanned_comments():
    # toxicity__isnull=True = "has no ToxicityCheck row yet".
    return Comment.objects.filter(toxicity__isnull=True, is_hidden=False)


def check_data(check):
    comment = check.comment
    return {
        'id': check.id,
        'comment_id': comment.id,
        'body': comment.body,
        'author': comment.author.username,
        'story_id': comment.story_id,
        'story_title': comment.story.title,
        'commented_at': comment.created_at,
        'score': check.score,
        'category': check.category,
        'reason': check.reason,
        'status': check.status,
        'checked_at': check.checked_at,
        'reviewed_by': check.reviewed_by.username if check.reviewed_by else None,
    }


# GET /api/dashboard/toxicity/?status=flagged
class ToxicityQueueView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        status = request.query_params.get('status', 'flagged')
        checks = ToxicityCheck.objects.select_related('comment__author', 'comment__story', 'reviewed_by')
        if status != 'all':
            checks = checks.filter(status=status)

        return Response({
            'configured': ai_is_configured(),
            'model': MODEL,
            'flag_score': FLAG_SCORE,
            'batch_size': BATCH_SIZE,
            'unscanned': unscanned_comments().count(),
            # { 'flagged': 3, 'hidden': 1, ... } for the filter buttons.
            'counts': {key: ToxicityCheck.objects.filter(status=key).count() for key, _ in ToxicityCheck.STATUSES},
            'items': [check_data(check) for check in checks[:100]],
        })


# POST /api/dashboard/toxicity/scan/  -> { scanned, flagged }
class ToxicityScanView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        if not ai_is_configured():
            return Response({'detail': 'No Anthropic API key is set - see the AI Generator page for how.'}, status=503)

        # Oldest first, so the backlog gets worked through in order.
        comments = list(unscanned_comments().order_by('created_at')[:BATCH_SIZE])
        if not comments:
            return Response({'scanned': 0, 'flagged': 0, 'detail': 'Every comment has been checked already.'})

        # The comments as JSON, so Claude can't mix up where one ends
        # and the next begins (and a comment can't pretend to be an
        # instruction - it's clearly just data).
        payload = json.dumps([{'comment_id': c.id, 'text': c.body[:2000]} for c in comments], ensure_ascii=False)

        client = anthropic.Anthropic()
        try:
            response = client.beta.messages.create(
                model=MODEL,
                max_tokens=16000,
                system=SYSTEM_PROMPT,
                messages=[{'role': 'user', 'content': f'Review these comments:\n\n{payload}'}],
                output_config={'format': {'type': 'json_schema', 'schema': RESULT_SCHEMA}},
                # Same as the AI Generator: if a request is declined,
                # the API retries with another suitable Claude model.
                betas=['server-side-fallback-2026-07-01'],
                fallbacks='default',
            )
        except anthropic.AuthenticationError:
            return Response({'detail': 'The Anthropic API key was refused. Check that it is correct.'}, status=502)
        except anthropic.RateLimitError:
            return Response({'detail': 'Too many requests to Claude right now. Try again in a minute.'}, status=503)
        except anthropic.APIStatusError as error:
            return Response({'detail': f'Claude returned an error ({error.status_code}). Try again.'}, status=502)
        except anthropic.APIConnectionError:
            return Response({'detail': 'Could not reach Claude. Check the internet connection.'}, status=502)

        if response.stop_reason == 'refusal':
            return Response({'detail': 'Claude declined to review this batch.'}, status=422)
        if response.stop_reason == 'max_tokens':
            return Response({'detail': 'The answer was cut off. Try again.'}, status=502)

        text = next((block.text for block in response.content if block.type == 'text'), '')
        try:
            results = json.loads(text)['results']
        except (json.JSONDecodeError, KeyError):
            return Response({'detail': 'Claude sent something unexpected. Try again.'}, status=502)

        # Only accept answers about comments we actually sent.
        by_id = {c.id: c for c in comments}
        flagged = 0
        for result in results:
            comment = by_id.pop(result['comment_id'], None)
            if comment is None:
                continue
            score = max(0, min(100, result['score']))   # keep it 0-100
            is_flagged = score >= FLAG_SCORE
            flagged += is_flagged
            ToxicityCheck.objects.create(
                comment=comment,
                score=score,
                category=result['category'],
                reason=result['reason'][:300],
                status='flagged' if is_flagged else 'clean',
            )

        return Response({'scanned': len(comments) - len(by_id), 'flagged': flagged})


# POST /api/dashboard/toxicity/<id>/  { action: 'hide' | 'approve' }
class ToxicityReviewView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        check = get_object_or_404(ToxicityCheck.objects.select_related('comment'), pk=pk)
        action = request.data.get('action')
        if action not in ('hide', 'approve'):
            return Response({'detail': 'action must be "hide" or "approve".'}, status=400)

        # Hide = the same "hidden" flag the Moderation page uses, so
        # the comment disappears from the story for everyone.
        check.comment.is_hidden = action == 'hide'
        check.comment.save(update_fields=['is_hidden'])

        check.status = 'hidden' if action == 'hide' else 'approved'
        check.reviewed_by = request.user
        check.reviewed_at = timezone.now()
        check.save()
        return Response(check_data(check))
