from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Block
from accounts.notifications import notify, short_title
from .models import Story, CoAuthorInvite
from .serializers import CoAuthorInviteSerializer


# ---------------------------------------------------------------
# CO-AUTHOR INVITES - asking another member to be named as co-author.
# (Moved out of views.py, which had grown to 900 lines.)
# ---------------------------------------------------------------
# ---------------------------------------------------------------
# CO-AUTHOR INVITES
# ---------------------------------------------------------------

# GET  /api/invites/  -> { "received": [...], "sent": [...] }
# POST /api/invites/  { story_id, username }  -> invite someone
class InviteListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        received = CoAuthorInvite.objects.filter(to_user=request.user).select_related('story', 'from_user', 'to_user')
        sent = CoAuthorInvite.objects.filter(from_user=request.user).select_related('story', 'from_user', 'to_user')
        return Response({
            'received': CoAuthorInviteSerializer(received, many=True).data,
            'sent': CoAuthorInviteSerializer(sent, many=True).data,
        })

    def post(self, request):
        # Only YOUR stories can get co-authors.
        story = get_object_or_404(Story, pk=request.data.get('story_id'), author=request.user)

        username = (request.data.get('username') or '').strip()
        person = get_user_model().objects.filter(username__iexact=username).first()

        if person is None:
            return Response({'detail': 'No user with that username.'}, status=400)
        if person == request.user:
            return Response({'detail': "You can't invite yourself."}, status=400)
        if CoAuthorInvite.objects.filter(story=story, to_user=person).exists():
            return Response({'detail': f'{person.username} was already invited to this story.'}, status=400)
        # Respect blocks in both directions.
        if Block.objects.filter(Q(blocker=person, blocked=request.user) | Q(blocker=request.user, blocked=person)).exists():
            return Response({'detail': "You can't invite this user."}, status=400)

        invite = CoAuthorInvite.objects.create(story=story, from_user=request.user, to_user=person)
        notify(person, request.user, 'invite',
               f'{request.user.username} invited you to co-author "{short_title(story.title)}"', '/invites')
        return Response(CoAuthorInviteSerializer(invite).data, status=201)


# POST   /api/invites/3/accept/    (the person who was invited)
# POST   /api/invites/3/decline/   (the person who was invited)
# DELETE /api/invites/3/           (the person who sent it: cancel)
class InviteActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, action):
        # to_user=request.user: you can only answer invites sent TO you.
        invite = get_object_or_404(CoAuthorInvite, pk=pk, to_user=request.user)

        if invite.status != 'pending':
            return Response({'detail': 'This invite was already answered.'}, status=400)

        # Anything else in the URL (/invites/3/banana/) -> 404.
        if action not in ('accept', 'decline'):
            return Response({'detail': 'Not found.'}, status=404)

        invite.status = 'accepted' if action == 'accept' else 'declined'
        invite.save()
        return Response(CoAuthorInviteSerializer(invite).data)

    # action=None: this view has two URLs, and only one has an action.
    def delete(self, request, pk, action=None):
        invite = get_object_or_404(CoAuthorInvite, pk=pk, from_user=request.user)
        invite.delete()
        return Response(status=204)
