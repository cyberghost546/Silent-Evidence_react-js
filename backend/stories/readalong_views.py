from datetime import datetime, timedelta

from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from dashboard.limits import hourly_limit_reached
from moderation.content_filter import check_text, BLOCKED_MESSAGE
from .models import FearRating, ReadAlong, ReadAlongMessage, stories_for
from .serializers import StoryCardSerializer


# ---------------------------------------------------------------
# READ-ALONGS API (how they work: ReadAlong in models.py)
#
#   GET  /api/read-alongs/                       -> upcoming + live rooms
#   POST /api/read-alongs/  { story_id, starts_at } -> host one (members)
#   GET  /api/read-alongs/<id>/?after=<msg id>   -> the room (+ new chat messages)
#   POST /api/read-alongs/<id>/join/             -> join / leave (before it ends)
#   POST /api/read-alongs/<id>/messages/ { body } -> chat (joined members, while live)
# ---------------------------------------------------------------
LIVE_FOR = timedelta(minutes=90)
MAX_AHEAD = timedelta(days=60)
MAX_HOSTED = 3   # upcoming rooms per member


def status_of(room, now=None):
    now = now or timezone.now()
    if now < room.starts_at:
        return 'upcoming'
    if now < room.starts_at + LIVE_FOR:
        return 'live'
    return 'ended'


def room_card(room, request):
    return {
        'id': room.id,
        'story': {'id': room.story_id, 'title': room.story.title, 'author': room.story.author.username},
        'host': room.host.username,
        'starts_at': room.starts_at,
        'ends_at': room.starts_at + LIVE_FOR,
        'status': status_of(room),
        'joined_count': room.joined_count if hasattr(room, 'joined_count') else room.joined.count(),
        'i_joined': request.user.is_authenticated and room.joined.filter(pk=request.user.pk).exists(),
    }


def message_data(message):
    return {'id': message.id, 'author': message.author.username, 'body': message.body, 'created_at': message.created_at}


def visible_room(request, pk):
    # A room for a story you may not read (18+, blocked author...) is "not found".
    return get_object_or_404(
        ReadAlong.objects.select_related('story__author', 'host').filter(story__in=stories_for(request.user)), pk=pk,
    )


class ReadAlongListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        rooms = (
            ReadAlong.objects.filter(starts_at__gte=timezone.now() - LIVE_FOR, story__in=stories_for(request.user))
            .select_related('story__author', 'host')
            .annotate(joined_count=Count('joined'))[:50]
        )
        return Response([room_card(room, request) for room in rooms])

    def post(self, request):
        story = get_object_or_404(stories_for(request.user), pk=request.data.get('story_id'))
        try:
            starts_at = datetime.fromisoformat(str(request.data.get('starts_at')).replace('Z', '+00:00'))
        except ValueError:
            return Response({'detail': 'Pick a date and time.'}, status=400)
        if timezone.is_naive(starts_at):
            starts_at = timezone.make_aware(starts_at)
        now = timezone.now()
        if not now < starts_at < now + MAX_AHEAD:
            return Response({'detail': 'Pick a time in the next 60 days.'}, status=400)
        if ReadAlong.objects.filter(host=request.user, starts_at__gt=now).count() >= MAX_HOSTED:
            return Response({'detail': f'You can host up to {MAX_HOSTED} upcoming read-alongs.'}, status=400)
        room = ReadAlong.objects.create(story=story, host=request.user, starts_at=starts_at)
        room.joined.add(request.user)   # the host is in, of course
        return Response(room_card(room, request), status=201)


class ReadAlongDetailView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        room = visible_room(request, pk)
        data = room_card(room, request)
        data['story'] = StoryCardSerializer(room.story, context={'request': request}).data
        data['members'] = list(room.joined.values_list('username', flat=True)[:100])

        # The chat: everything, or only what's new since ?after=<id>
        # (the page asks every few seconds - see ReadAlongRoom.jsx).
        messages = room.messages.select_related('author')
        after = request.query_params.get('after', '')
        if after.isdigit():
            messages = messages.filter(id__gt=int(after))
        data['messages'] = [message_data(m) for m in messages[:200]]

        # THE REVEAL: after the end, how scared was everyone?
        data['reveal'] = None
        if data['status'] == 'ended':
            ratings = FearRating.objects.filter(story=room.story, user__in=room.joined.all()).select_related('user')
            data['reveal'] = {
                'average': ratings.aggregate(avg=Avg('score'))['avg'],
                'ratings': [{'username': r.user.username, 'score': r.score} for r in ratings],
            }
        return Response(data)


class JoinReadAlongView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        room = visible_room(request, pk)
        if status_of(room) == 'ended':
            return Response({'detail': 'This read-along is over.'}, status=400)
        if room.joined.filter(pk=request.user.pk).exists():
            if room.host_id != request.user.id:   # the host stays in their own room
                room.joined.remove(request.user)
        else:
            room.joined.add(request.user)
        return Response(room_card(room, request))


class ReadAlongMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        room = visible_room(request, pk)
        if status_of(room) != 'live':
            return Response({'detail': 'The chat is only open while the read-along is live.'}, status=400)
        if not room.joined.filter(pk=request.user.pk).exists():
            return Response({'detail': 'Join the read-along to chat.'}, status=403)
        body = (request.data.get('body') or '').strip()[:500]
        if not body:
            return Response({'detail': 'Write something first.'}, status=400)
        if check_text(body)[0] == 'block':
            return Response({'detail': BLOCKED_MESSAGE}, status=400)
        if hourly_limit_reached(request.user, ReadAlongMessage.objects.filter(author=request.user), 120):
            return Response({'detail': 'Slow down a little.'}, status=429)
        message = ReadAlongMessage.objects.create(room=room, author=request.user, body=body)
        return Response(message_data(message), status=201)
