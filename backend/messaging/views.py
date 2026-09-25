from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Block
from .models import Message


# ---------------------------------------------------------------
# PRIVATE MESSAGES (the Messages page in React).
# Everything here is logged-in only.
# ---------------------------------------------------------------

# What React gets for one message. Kept in one function so both
# views send the same shape.
def message_data(message, me):
    return {
        'id': message.id,
        'body': message.body,
        'created_at': message.created_at,
        # True = I sent it (drawn on the right, in red).
        'is_mine': message.sender_id == me.id,
    }


def avatar_of(user):
    has_avatar = hasattr(user, 'profile') and user.profile.avatar
    return user.profile.avatar.url if has_avatar else ''


# "Did either of these two block the other?" - then no messages.
def is_blocked(user_a, user_b):
    return Block.objects.filter(
        Q(blocker=user_a, blocked=user_b) | Q(blocker=user_b, blocked=user_a)
    ).exists()


# GET /api/messages/
#
# Your conversations, the most recent one first:
#   [ { "username": "night_owl", "avatar": "",
#       "last_message": { ... }, "unread": 2 }, ... ]
class ConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        me = request.user

        # Every message I sent or received, NEWEST first.
        messages = (
            Message.objects
            .filter(Q(sender=me) | Q(recipient=me))
            .select_related('sender__profile', 'recipient__profile')
            .order_by('-created_at')
        )

        # Walk through them and keep the FIRST (= newest) message per
        # other person. A dictionary remembers who we've seen already.
        # (Fine for a small site. With millions of messages you'd let
        # the database do this grouping instead.)
        conversations = {}
        for message in messages:
            # The "other person" is whoever isn't me.
            other = message.recipient if message.sender_id == me.id else message.sender

            if other.id not in conversations:
                conversations[other.id] = {
                    'username': other.username,
                    'avatar': avatar_of(other),
                    'last_message': message_data(message, me),
                    'unread': 0,
                }

            # Count messages TO me that I haven't read yet.
            if message.recipient_id == me.id and not message.is_read:
                conversations[other.id]['unread'] += 1

        # .values() = just the conversation dicts, already in
        # newest-first order (dictionaries keep the order you added).
        return Response(list(conversations.values()))


# GET  /api/messages/night_owl/  -> the whole conversation (and marks
#                                   their messages to you as read)
# POST /api/messages/night_owl/  { body }  -> send a message
class ConversationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        me = request.user
        other = get_object_or_404(get_user_model(), username=username)

        messages = Message.objects.filter(
            Q(sender=me, recipient=other) | Q(sender=other, recipient=me)
        )

        # Opening the conversation = you've now read their messages.
        # .update() changes all matching rows in ONE query.
        messages.filter(recipient=me, is_read=False).update(is_read=True)

        return Response({
            'username': other.username,
            'avatar': avatar_of(other),
            'blocked': is_blocked(me, other),
            'messages': [message_data(message, me) for message in messages],
        })

    def post(self, request, username):
        me = request.user
        other = get_object_or_404(get_user_model(), username=username)
        body = (request.data.get('body') or '').strip()

        if other == me:
            return Response({'detail': "You can't message yourself."}, status=400)
        if is_blocked(me, other):
            return Response({'detail': "You can't message this user."}, status=400)
        if not body:
            return Response({'detail': 'Write a message first.'}, status=400)
        if len(body) > 2000:
            return Response({'detail': 'Messages can be up to 2000 characters.'}, status=400)

        message = Message.objects.create(sender=me, recipient=other, body=body)
        return Response(message_data(message, me), status=201)


# GET /api/messages/unread/  -> { "unread": 3 }
# For the little red number on the Messages icon in the header.
class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Message.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread': count})
