import json
from datetime import timedelta

import anthropic
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import get_profile
from dashboard.ai import MODEL, ai_is_configured
from .models import Story, WritingFeedback


# ---------------------------------------------------------------
# PRIVATE FEEDBACK FROM CLAUDE (the Edit page, your own stories only)
#
#   GET  /api/stories/<id>/feedback/  -> { configured, remaining, period, is_pro, history: [...] }
#   POST /api/stories/<id>/feedback/  -> ask for new feedback (costs money, so
#                                        there's a limit - see LIMITS below)
#
# Claude reads the story and answers like a helpful horror editor. It
# never rewrites the story - the writing stays yours. The same Claude
# set-up as the AI Generator (dashboard/ai.py): same model, same key.
# ---------------------------------------------------------------
MAX_CHARS = 60_000   # about 10,000 words - longer stories are cut here

# HOW OFTEN you can ask. Every review costs the site money (Claude
# isn't free), so:
#   everyone - 3 in any 30 days
#   Pro      - 5 a day (a "fair use" limit - not unlimited, so one
#              person can't run up a huge bill by accident)
#   admins   - no limit
LIMITS = {
    'free': {'count': 3, 'days': 30, 'period': 'month'},
    'pro': {'count': 5, 'days': 1, 'period': 'day'},
}

SYSTEM_PROMPT = '''You are an experienced, encouraging editor of horror fiction giving PRIVATE feedback to a writer on Silent Evidence, a community horror-story site. The writer asked for it before publishing or while revising.

Read the story and give feedback that helps them make THIS story better:
- Be specific: point to moments in the story (quote a few words at most).
- Be honest but kind - the writer may be a beginner.
- Focus on what matters most for horror: tension and pacing, atmosphere, character, clarity, the ending.
- Do not rewrite the story or write new passages for them. Suggest; don't replace.
- The story may contain marks: "!!scare" (a planned jump scare) and [[section: ...]] / [[choice: ...]] lines (a choose-your-path story). Treat them as the writer's structure, not as mistakes.

Answer in English with: an overall impression (2-4 sentences), 2-4 strengths, 3-5 concrete suggestions (each with the area it is about), and one short note on how well the scares and tension land.'''

FEEDBACK_SCHEMA = {
    'type': 'object',
    'properties': {
        'overall': {'type': 'string'},
        'strengths': {'type': 'array', 'items': {'type': 'string'}},
        'suggestions': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {'area': {'type': 'string'}, 'note': {'type': 'string'}},
                'required': ['area', 'note'],
                'additionalProperties': False,
            },
        },
        'scares': {'type': 'string'},
    },
    'required': ['overall', 'strengths', 'suggestions', 'scares'],
    'additionalProperties': False,
}


def limit_for(user):
    return LIMITS['pro'] if get_profile(user).is_premium else LIMITS['free']


# How many you asked for in the last N days.
def used_in(user, days):
    since = timezone.now() - timedelta(days=days)
    return WritingFeedback.objects.filter(requested_by=user, created_at__gte=since).count()


# How many you may still ask for. None = no limit (admins).
def remaining(user):
    if user.is_staff:
        return None
    limit = limit_for(user)
    return max(0, limit['count'] - used_in(user, limit['days']))


# The numbers React shows: "2 left this month" / "4 left today".
def limit_data(user):
    return {
        'remaining': remaining(user),
        'period': limit_for(user)['period'],
        'is_pro': get_profile(user).is_premium,
    }


def history_data(story):
    return [{'id': item.id, 'created_at': item.created_at, 'feedback': item.feedback} for item in story.ai_feedback.all()[:10]]


class StoryFeedbackView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        story = get_object_or_404(Story, pk=pk, author=request.user)
        return Response({
            'configured': ai_is_configured(),
            **limit_data(request.user),
            'history': history_data(story),
        })

    def post(self, request, pk):
        story = get_object_or_404(Story, pk=pk, author=request.user)
        if not ai_is_configured():
            return Response({'detail': 'Feedback from Claude is not switched on for this site.'}, status=503)
        if remaining(request.user) == 0:
            if get_profile(request.user).is_premium:
                message = f"You've used today's {LIMITS['pro']['count']} reviews. Try again tomorrow."
            else:
                message = f"You've used your {LIMITS['free']['count']} free reviews for this month. Pro members get {LIMITS['pro']['count']} a day."
            return Response({'detail': message}, status=429)
        if len(story.body.split()) < 100:
            return Response({'detail': 'Write at least 100 words first - there needs to be a story to read.'}, status=400)

        text = f'Title: {story.title}\n\n{story.body[:MAX_CHARS]}'
        # The key comes from the environment (ANTHROPIC_API_KEY) - never the code.
        client = anthropic.Anthropic()
        try:
            response = client.beta.messages.create(
                model=MODEL,
                max_tokens=8000,
                system=SYSTEM_PROMPT,
                messages=[{'role': 'user', 'content': text}],
                output_config={'format': {'type': 'json_schema', 'schema': FEEDBACK_SCHEMA}},
                # Horror stories can trip safety checks; the API then tries a
                # suitable other Claude model instead of just stopping.
                betas=['server-side-fallback-2026-07-01'],
                fallbacks='default',
            )
        except anthropic.RateLimitError:
            return Response({'detail': 'Claude is busy right now. Try again in a minute.'}, status=503)
        except anthropic.APIStatusError as error:
            return Response({'detail': f'Claude returned an error ({error.status_code}). Try again.'}, status=502)
        except anthropic.APIConnectionError:
            return Response({'detail': 'Could not reach Claude. Try again.'}, status=502)

        if response.stop_reason == 'refusal':
            return Response({'detail': 'Claude could not give feedback on this story.'}, status=422)
        text_block = next((block.text for block in response.content if block.type == 'text'), '')
        try:
            feedback = json.loads(text_block)
        except json.JSONDecodeError:
            return Response({'detail': 'Claude sent something unexpected. Try again.'}, status=502)

        WritingFeedback.objects.create(story=story, requested_by=request.user, feedback=feedback)
        return Response({
            'feedback': feedback,
            **limit_data(request.user),
            'history': history_data(story),
        }, status=201)
