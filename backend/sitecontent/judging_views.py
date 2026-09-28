from django.contrib.auth import get_user_model
from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.notifications import notify, short_title
from stories.serializers import StoryCardSerializer
from .models import Challenge, ChallengeEntry, ChallengeJudge, JudgeScore


# ---------------------------------------------------------------
# JUDGED CHALLENGES API (how it works: ChallengeJudge in models.py)
#
# Judges:
#   GET  /api/challenges/<id>/judging/              -> the entries + MY scores
#   POST /api/challenges/<id>/judging/<entry_id>/   { score: 1-10, note }
# Admins:
#   GET    /api/dashboard/challenges/<id>/judges/             -> judges + results
#   POST   /api/dashboard/challenges/<id>/judges/  { username } -> add a judge
#   DELETE /api/dashboard/challenges/<id>/judges/<username>/  -> remove one
#   POST   /api/dashboard/challenges/<id>/announce/ { story_id } -> set the winner + tell everyone
# ---------------------------------------------------------------

def judging_open(challenge):
    # Judges score between the deadline and the announcement.
    return not challenge.is_open() and challenge.winner_id is None


class JudgingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)
        # Not a judge of this challenge -> it "doesn't exist" for you.
        get_object_or_404(ChallengeJudge, challenge=challenge, judge=request.user)
        entries = challenge.entries.select_related('story__author', 'story__category')
        mine = {s.entry_id: s for s in JudgeScore.objects.filter(entry__challenge=challenge, judge=request.user)}
        rows = []
        for entry in entries:
            score = mine.get(entry.id)
            rows.append({
                'entry_id': entry.id,
                'story': StoryCardSerializer(entry.story, context={'request': request}).data,
                'is_mine': entry.story.author_id == request.user.id,   # you can't judge your own entry
                'score': score.score if score else None,
                'note': score.note if score else '',
            })
        return Response({
            'id': challenge.id,
            'title': challenge.title,
            'theme': challenge.theme,
            'judging_open': judging_open(challenge),
            'entries': rows,
        })


class ScoreEntryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, entry_id):
        challenge = get_object_or_404(Challenge, pk=pk)
        get_object_or_404(ChallengeJudge, challenge=challenge, judge=request.user)
        entry = get_object_or_404(ChallengeEntry, pk=entry_id, challenge=challenge)
        if not judging_open(challenge):
            return Response({'detail': 'Judging is only open after the deadline, until the winner is announced.'}, status=400)
        if entry.story.author_id == request.user.id:
            return Response({'detail': "You can't judge your own story."}, status=400)
        try:
            score = int(request.data.get('score'))
        except (TypeError, ValueError):
            score = 0
        if not 1 <= score <= 10:
            return Response({'detail': 'Give a score from 1 to 10.'}, status=400)
        JudgeScore.objects.update_or_create(
            entry=entry, judge=request.user,
            defaults={'score': score, 'note': (request.data.get('note') or '').strip()[:500]},
        )
        return Response({'entry_id': entry.id, 'score': score})


def results(challenge):
    # Entries ranked by their average score (unscored ones last).
    entries = (
        challenge.entries.select_related('story__author')
        .annotate(average=Avg('scores__score'), votes=Count('scores'))
        .order_by('-average', 'created_at')
    )
    rows = []
    for entry in entries:
        rows.append({
            'entry_id': entry.id,
            'story_id': entry.story_id,
            'title': entry.story.title,
            'author': entry.story.author.username,
            'average': round(entry.average, 2) if entry.average is not None else None,
            'votes': entry.votes,
            'scores': [
                {'judge': s.judge.username, 'score': s.score, 'note': s.note}
                for s in entry.scores.select_related('judge')
            ],
        })
    # Scored first, highest first; then the unscored ones.
    rows.sort(key=lambda row: (row['average'] is None, -(row['average'] or 0)))
    return rows


class AdminJudgesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)
        return Response({
            'judges': list(challenge.judges.values_list('judge__username', flat=True)),
            'judging_open': judging_open(challenge),
            'winner_id': challenge.winner_id,
            'results': results(challenge),
        })

    def post(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)
        user = get_user_model().objects.filter(username=(request.data.get('username') or '').strip()).first()
        if user is None:
            return Response({'detail': 'There is no member with that username.'}, status=400)
        ChallengeJudge.objects.get_or_create(challenge=challenge, judge=user)
        return Response({'added': user.username}, status=201)


class AdminRemoveJudgeView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk, username):
        ChallengeJudge.objects.filter(challenge_id=pk, judge__username=username).delete()
        return Response(status=204)


class AdminAnnounceView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)
        if challenge.is_open():
            return Response({'detail': 'The challenge is still open.'}, status=400)
        entry = get_object_or_404(ChallengeEntry, challenge=challenge, story_id=request.data.get('story_id'))
        challenge.winner = entry.story
        challenge.save()
        link = f'/challenges/{challenge.id}'
        title = short_title(challenge.title)
        # Everyone who entered hears the result; the winner gets their own message.
        for other in challenge.entries.select_related('story__author'):
            author = other.story.author
            if other.id == entry.id:
                notify(author, None, 'challenge', f'You won "{title}" with "{short_title(entry.story.title)}"!', link)
            else:
                notify(author, None, 'challenge', f'The winner of "{title}" is announced.', link)
        return Response({'winner_id': entry.story_id})
