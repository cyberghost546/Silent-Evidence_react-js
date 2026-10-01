from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from moderation.models import LoginEvent
from stories.models import Comment, Like, ReadingHistory


# ---------------------------------------------------------------
# ACTIVITY HEATMAP  GET /api/dashboard/heatmap/?metric=comments&days=30
#
# "When is the site busy?" Counts things per weekday x hour:
#
#   {
#     "grid": [[0, 0, 3, ...24 numbers...],   <- Monday
#              ...7 rows...],                 <- Sunday
#     "total": 120, "max": 9, ...
#   }
#
# Handy for choosing WHEN to publish a story, send a newsletter or
# schedule maintenance (at the quietest hour!).
# ---------------------------------------------------------------

# metric name -> (label, function giving the date-times to count)
# Each function gets the start date and returns a list of datetimes.
METRICS = {
    'comments': ('Comments', lambda since: Comment.objects.filter(created_at__gte=since).values_list('created_at', flat=True)),
    'likes': ('Likes', lambda since: Like.objects.filter(created_at__gte=since).values_list('created_at', flat=True)),
    'logins': ('Logins', lambda since: LoginEvent.objects.filter(success=True, created_at__gte=since).values_list('created_at', flat=True)),
    'reads': ('Story reads', lambda since: ReadingHistory.objects.filter(last_read_at__gte=since).values_list('last_read_at', flat=True)),
    'signups': ('Sign-ups', lambda since: get_user_model().objects.filter(date_joined__gte=since).values_list('date_joined', flat=True)),
}

ALLOWED_DAYS = (7, 30, 90, 365)


class ActivityHeatmapView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        metric = request.query_params.get('metric', 'comments')
        if metric not in METRICS:
            return Response({'detail': 'Unknown metric.'}, status=400)
        try:
            days = int(request.query_params.get('days', 30))
        except ValueError:
            days = 30
        if days not in ALLOWED_DAYS:
            days = 30

        since = timezone.now() - timedelta(days=days)

        # 7 rows (Mon..Sun) of 24 zeros (00:00..23:00).
        grid = [[0] * 24 for _ in range(7)]
        for moment in METRICS[metric][1](since):
            # localtime(): the database stores UTC; we want the hour
            # on the site's own clock (TIME_ZONE in settings.py).
            local = timezone.localtime(moment)
            # weekday(): Monday = 0 ... Sunday = 6 - same order as the rows.
            grid[local.weekday()][local.hour] += 1

        total = sum(sum(row) for row in grid)
        biggest = max(max(row) for row in grid)

        # The busiest slot, for the sentence above the chart.
        busiest = None
        if total:
            day, hour = max(((d, h) for d in range(7) for h in range(24)), key=lambda slot: grid[slot[0]][slot[1]])
            busiest = {'day': day, 'hour': hour, 'count': grid[day][hour]}

        return Response({
            'metric': metric,
            'label': METRICS[metric][0],
            'days': days,
            'grid': grid,
            'total': total,
            'max': biggest,
            'busiest': busiest,
            'metrics': [{'value': key, 'label': label} for key, (label, _) in METRICS.items()],
            'timezone': timezone.get_current_timezone_name(),
        })
