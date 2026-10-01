from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification


# ---------------------------------------------------------------
# NOTIFICATIONS API (logged-in members, only their own)
#
#   GET  /api/accounts/notifications/?limit=10
#        -> { unread: 3, items: [ {id, kind, text, link, is_read, created_at, actor}, ... ] }
#   POST /api/accounts/notifications/read/  { ids: [4, 5] }  -> mark those read
#   POST /api/accounts/notifications/read/  {}               -> mark ALL read
# ---------------------------------------------------------------

def notification_data(item):
    return {
        'id': item.id,
        'kind': item.kind,
        'text': item.text,
        'link': item.link,
        'is_read': item.is_read,
        'created_at': item.created_at,
        'actor': item.actor.username if item.actor else None,
    }


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # min(..., 100): nobody can ask for a million rows.
            limit = min(int(request.query_params.get('limit', 20)), 100)
        except ValueError:
            limit = 20
        mine = request.user.notifications.select_related('actor')
        return Response({
            'unread': mine.filter(is_read=False).count(),
            'items': [notification_data(item) for item in mine[:limit]],
        })


class MarkNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # ALWAYS start from request.user.notifications - so nobody can
        # mark someone else's notifications by sending their ids.
        mine = Notification.objects.filter(recipient=request.user, is_read=False)
        ids = request.data.get('ids')
        if isinstance(ids, list):
            mine = mine.filter(id__in=[i for i in ids if isinstance(i, int)])
        mine.update(is_read=True)
        return Response({'unread': request.user.notifications.filter(is_read=False).count()})
