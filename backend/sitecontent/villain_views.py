from datetime import timedelta

from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from moderation.content_filter import check_text, BLOCKED_MESSAGE
from stories.models import stories_for
from .models import VillainNomination, VillainVote, week_start


# ---------------------------------------------------------------
# VILLAIN OF THE WEEK API
#
#   GET  /api/villains/                                -> this week + past winners
#   POST /api/villains/  { name, reason, story_id }    -> nominate (members, once a week)
#   POST /api/villains/<id>/vote/                      -> vote (members, once a week -
#                                                         voting again MOVES your vote)
#   DELETE /api/dashboard/villains/<id>/               -> admins remove a nomination
# ---------------------------------------------------------------

def nomination_data(item, votes, my_vote_id):
    return {
        'id': item.id,
        'name': item.name,
        'reason': item.reason,
        'story': {'id': item.story.id, 'title': item.story.title} if item.story else None,
        'nominated_by': item.nominated_by.username,
        'votes': votes,
        'is_my_vote': item.id == my_vote_id,
    }


def ranked(week):
    # This week's nominations, most votes first (earliest wins a tie).
    return (
        VillainNomination.objects.filter(week=week)
        .select_related('story', 'nominated_by')
        .annotate(vote_count=Count('votes'))
        .order_by('-vote_count', 'created_at')
    )


class VillainListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        this_week = week_start()
        user = request.user
        my_vote_id = None
        my_nomination = None
        if user.is_authenticated:
            my_vote_id = VillainVote.objects.filter(user=user, week=this_week).values_list('nomination_id', flat=True).first()
            my_nomination = VillainNomination.objects.filter(nominated_by=user, week=this_week).values_list('id', flat=True).first()

        # Past winners: the top nomination of each of the last 8 weeks.
        past = []
        for weeks_back in range(1, 9):
            week = this_week - timedelta(weeks=weeks_back)
            winner = ranked(week).first()
            if winner:
                past.append({'week': week, **nomination_data(winner, winner.vote_count, None)})

        return Response({
            'week': this_week,
            'nominations': [nomination_data(n, n.vote_count, my_vote_id) for n in ranked(this_week)],
            'has_nominated': my_nomination is not None,
            'past_winners': past,
        })

    def post(self, request):
        this_week = week_start()
        if VillainNomination.objects.filter(nominated_by=request.user, week=this_week).exists():
            return Response({'detail': 'You already nominated a villain this week. Vote for one instead!'}, status=400)
        name = (request.data.get('name') or '').strip()
        reason = (request.data.get('reason') or '').strip()
        if not name:
            return Response({'detail': 'Who is the villain? Give them a name.'}, status=400)
        if check_text(f'{name} {reason}')[0] == 'block':
            return Response({'detail': BLOCKED_MESSAGE}, status=400)

        story = None
        if request.data.get('story_id'):
            # Only a story this member may actually see.
            story = stories_for(request.user).filter(pk=request.data.get('story_id')).first()

        nomination = VillainNomination.objects.create(
            name=name[:80], reason=reason[:300], story=story, nominated_by=request.user, week=this_week,
        )
        # Nominating = your vote goes to them too (you can still move it).
        VillainVote.objects.update_or_create(user=request.user, week=this_week, defaults={'nomination': nomination})
        return Response({'id': nomination.id}, status=201)


class VillainVoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        this_week = week_start()
        # Only nominations from THIS week can get votes.
        nomination = get_object_or_404(VillainNomination, pk=pk, week=this_week)
        VillainVote.objects.update_or_create(user=request.user, week=this_week, defaults={'nomination': nomination})
        return Response({'voted_for': nomination.id})


class AdminVillainView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        get_object_or_404(VillainNomination, pk=pk).delete()
        return Response(status=204)
