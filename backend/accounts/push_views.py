from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PushSubscription
from .push import push_enabled


# ---------------------------------------------------------------
# PHONE NOTIFICATIONS API (Settings -> Notifications)
#
#   GET  /api/accounts/push/                 -> { public_key, subscribed }
#        public_key is '' while push isn't set up on this server
#   POST /api/accounts/push/                 { endpoint, keys: { p256dh, auth } }  -> switch on for this device
#   POST /api/accounts/push/unsubscribe/     { endpoint }                           -> switch off for this device
# ---------------------------------------------------------------
class PushView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        endpoint = request.query_params.get('endpoint', '')
        subscribed = bool(endpoint) and PushSubscription.objects.filter(user=request.user, endpoint=endpoint).exists()
        return Response({'public_key': settings.VAPID_PUBLIC_KEY if push_enabled() else '', 'subscribed': subscribed})

    def post(self, request):
        if not push_enabled():
            return Response({'detail': 'Phone notifications are not set up on this site yet.'}, status=400)
        endpoint = (request.data.get('endpoint') or '').strip()
        keys = request.data.get('keys') or {}
        if not endpoint.startswith('https://') or not keys.get('p256dh') or not keys.get('auth'):
            return Response({'detail': 'That is not a valid push subscription.'}, status=400)
        # update_or_create: the same device switching on again (or a new
        # member logging in on it) replaces the old row.
        PushSubscription.objects.update_or_create(
            endpoint=endpoint[:500],
            defaults={'user': request.user, 'p256dh': keys['p256dh'][:200], 'auth': keys['auth'][:100]},
        )
        return Response({'subscribed': True}, status=201)


class PushUnsubscribeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        PushSubscription.objects.filter(user=request.user, endpoint=request.data.get('endpoint', '')).delete()
        return Response({'subscribed': False})
