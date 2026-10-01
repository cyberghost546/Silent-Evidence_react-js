import json
import os

import anthropic
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from categories.models import Category
from stories.models import Story, MOODS, CONTENT_RATINGS


# ---------------------------------------------------------------
# AI GENERATOR (Admin Dashboard -> AI Generator). Admins only.
#
# An admin describes a story; Claude (Anthropic's AI) writes a
# draft. The admin reads it, and can save it as a DRAFT story -
# nothing is ever published without a person pressing Publish.
#
# NEEDS AN API KEY. Get one at https://console.anthropic.com, then
# start Django with it (PowerShell):
#     $env:ANTHROPIC_API_KEY = "sk-ant-..."
#     python manage.py runserver
# Never put the key in the code or in git. Every story costs a
# little money on your Anthropic account.
# ---------------------------------------------------------------

# The model that writes the stories.
MODEL = 'claude-opus-5'

# Roughly how many words for each length choice on the page.
LENGTHS = {
    'short': 600,
    'medium': 1200,
    'long': 2000,
}

# The instructions Claude gets every time. The admin's idea comes
# in the user message instead (see GenerateStoryView).
SYSTEM_PROMPT = """You write original horror stories for Silent Evidence, a community site for horror fiction.

Write in English, in the first person unless the idea asks otherwise. Build dread slowly, favour atmosphere and concrete sensory detail over gore, and end with an image that lingers. Keep it fiction: no real, identifiable private people.

Formatting for the story body: separate paragraphs with a blank line. You may use "## " at the start of a line for a section heading and **double asterisks** for emphasis - nothing else.

Also write a title (at most 80 characters) and a one-sentence excerpt (at most 200 characters) that hooks the reader without spoiling the ending."""

# The exact shape we want back. "Structured outputs": the API makes
# sure the answer is valid JSON with these three fields, so we can
# json.loads() it without guessing.
STORY_SCHEMA = {
    'type': 'object',
    'properties': {
        'title': {'type': 'string'},
        'excerpt': {'type': 'string'},
        'body': {'type': 'string'},
    },
    'required': ['title', 'excerpt', 'body'],
    'additionalProperties': False,
}


# Is there a key? (The SDK reads ANTHROPIC_API_KEY itself - we only
# check it's there, so the page can explain what to do if not.)
def ai_is_configured():
    return bool(os.environ.get('ANTHROPIC_API_KEY') or os.environ.get('ANTHROPIC_AUTH_TOKEN'))


# GET /api/dashboard/ai/status/  -> { configured, model }
class AIStatusView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({'configured': ai_is_configured(), 'model': MODEL})


# POST /api/dashboard/ai/generate/
#   { idea, category_id, mood, content_rating, length }
#   -> { title, excerpt, body }
class GenerateStoryView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        idea = (request.data.get('idea') or '').strip()
        if len(idea) < 10:
            return Response({'detail': 'Describe your idea in at least a few words.'}, status=400)
        if len(idea) > 2000:
            return Response({'detail': 'Keep the idea under 2000 characters.'}, status=400)

        if not ai_is_configured():
            return Response({'detail': 'No Anthropic API key is set - see the instructions on this page.'}, status=503)

        # Put the choices into plain sentences for Claude.
        words = LENGTHS.get(request.data.get('length'), LENGTHS['medium'])
        lines = [f'Story idea: {idea}', f'Length: about {words} words.']

        category = Category.objects.filter(pk=request.data.get('category_id') or None).first()
        if category:
            lines.append(f'Category: {category.name}.')
        mood = request.data.get('mood')
        if mood:
            lines.append(f'Mood: {mood}.')
        rating = request.data.get('content_rating')
        if rating == 'all':
            lines.append('Suitable for all ages: nothing graphic.')
        elif rating == 'teen':
            lines.append('Suitable for teenagers: mild violence at most.')

        # Credentials come from the environment (ANTHROPIC_API_KEY).
        client = anthropic.Anthropic()

        try:
            # client.beta... because of the "fallbacks" feature below.
            response = client.beta.messages.create(
                model=MODEL,
                # Plenty of room: the story plus Claude's thinking. If
                # it ever runs out we say so instead of saving half a story.
                max_tokens=16000,
                system=SYSTEM_PROMPT,
                messages=[{'role': 'user', 'content': '\n'.join(lines)}],
                # The JSON shape above.
                output_config={'format': {'type': 'json_schema', 'schema': STORY_SCHEMA}},
                # If Claude's safety checks decline a request, the API
                # automatically tries a suitable other Claude model
                # instead of just stopping. (A horror site will hit
                # this now and then.)
                betas=['server-side-fallback-2026-07-01'],
                fallbacks='default',
            )
        # Most specific errors first (see the Anthropic docs).
        except anthropic.AuthenticationError:
            return Response({'detail': 'The Anthropic API key was refused. Check that it is correct.'}, status=502)
        except anthropic.RateLimitError:
            return Response({'detail': 'Too many requests to Claude right now. Try again in a minute.'}, status=503)
        except anthropic.APIStatusError as error:
            return Response({'detail': f'Claude returned an error ({error.status_code}). Try again.'}, status=502)
        except anthropic.APIConnectionError:
            return Response({'detail': 'Could not reach Claude. Check the internet connection.'}, status=502)

        # Why did it stop? Check BEFORE reading the text.
        if response.stop_reason == 'refusal':
            return Response({'detail': 'Claude declined this idea. Try describing it differently.'}, status=422)
        if response.stop_reason == 'max_tokens':
            return Response({'detail': 'The story got too long and was cut off. Try a shorter length.'}, status=502)

        # The JSON is in the text block. (There may be other blocks
        # before it, like Claude's thinking - we skip those.)
        text = next((block.text for block in response.content if block.type == 'text'), '')
        try:
            story = json.loads(text)
        except json.JSONDecodeError:
            return Response({'detail': 'Claude sent something unexpected. Try again.'}, status=502)

        return Response({
            'title': story['title'][:200],
            'excerpt': story['excerpt'][:300],
            'body': story['body'],
        })


# POST /api/dashboard/ai/save/
#   { title, excerpt, body, category_id, mood, content_rating }
#   -> { id } of the new DRAFT story (written "by" the admin)
class SaveGeneratedStoryView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        data = request.data
        title = (data.get('title') or '').strip()
        body = (data.get('body') or '').strip()
        if not title or not body:
            return Response({'detail': 'A story needs a title and a text.'}, status=400)

        category = get_object_or_404(Category, pk=data.get('category_id'))

        # Only accept values the Story model knows. dict(MOODS)
        # = { 'creepy': 'Creepy', ... } (from stories/models.py).
        mood = data.get('mood') if data.get('mood') in dict(MOODS) else ''
        rating = data.get('content_rating') if data.get('content_rating') in dict(CONTENT_RATINGS) else 'all'

        story = Story.objects.create(
            author=request.user,
            title=title[:200],
            excerpt=(data.get('excerpt') or '')[:300],
            body=body,
            category=category,
            mood=mood,
            content_rating=rating,
            is_published=False,   # always a draft first
        )
        return Response({'id': story.id}, status=201)
