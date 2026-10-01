from django.db.models import Sum, Max, Count
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from sitecontent.models import week_start
from .models import SprintResult


# ---------------------------------------------------------------
# WRITING SPRINTS API
#
#   GET  /api/sprints/                    -> leaderboard (+ your numbers)
#   POST /api/sprints/ { words, minutes } -> save a finished sprint
#
# The leaderboard = total words written in sprints THIS WEEK
# (from Monday), top 10.
# ---------------------------------------------------------------
SPRINT_LENGTHS = [10, 20, 30]

# Nobody types 150 words a minute for half an hour - anything above
# that is pasted text or a made-up number, so it's cut down.
MAX_WORDS_PER_MINUTE = 150


class SprintThrottle(UserRateThrottle):
    # A 10-minute sprint can't finish more than 6 times an hour.
    scope = 'sprints'
    rate = '10/hour'


class SprintView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_throttles(self):
        # Only saving is limited - reading the leaderboard isn't.
        return [SprintThrottle()] if self.request.method == 'POST' else []

    def get(self, request):
        this_week = SprintResult.objects.filter(created_at__date__gte=week_start())
        leaderboard = (
            this_week.values('user__username')
            .annotate(words=Sum('words'), sprints=Count('id'))
            .order_by('-words')[:10]
        )
        data = {
            'lengths': SPRINT_LENGTHS,
            'leaderboard': [
                {'username': row['user__username'], 'words': row['words'], 'sprints': row['sprints']}
                for row in leaderboard
            ],
            'me': None,
        }
        if request.user.is_authenticated:
            mine = SprintResult.objects.filter(user=request.user)
            data['me'] = {
                'sprints': mine.count(),
                'best': mine.aggregate(best=Max('words'))['best'] or 0,
                'week_words': this_week.filter(user=request.user).aggregate(total=Sum('words'))['total'] or 0,
            }
        return Response(data)

    def post(self, request):
        try:
            minutes = int(request.data.get('minutes'))
            words = int(request.data.get('words'))
        except (TypeError, ValueError):
            return Response({'detail': 'Send words and minutes as numbers.'}, status=400)
        if minutes not in SPRINT_LENGTHS:
            return Response({'detail': 'A sprint is 10, 20 or 30 minutes.'}, status=400)
        if words < 1:
            return Response({'detail': 'Nothing written - nothing saved.'}, status=400)

        words = min(words, minutes * MAX_WORDS_PER_MINUTE)
        result = SprintResult.objects.create(user=request.user, words=words, minutes=minutes)
        return Response({'id': result.id, 'words': result.words}, status=201)
