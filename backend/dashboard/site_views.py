from django.db.models import Q
from rest_framework import serializers, generics
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from moderation.security import client_ip
from .models import SiteSettings, BlockedIP, AuditEntry


# ---------------------------------------------------------------
# GET /api/site-status/  - public, everybody may ask.
# React uses it for the maintenance screen, the Sign Up page
# ("sign-ups are closed") and the Contact page (the email address).
# ---------------------------------------------------------------
class SiteStatusView(APIView):
    def get(self, request):
        site = SiteSettings.load()
        return Response({
            'maintenance_mode': site.maintenance_mode,
            'maintenance_message': site.maintenance_message,
            'signups_open': site.signups_open,
            'contact_email': site.contact_email,
            # For the browser tab and search results (SEO Dashboard).
            'site_title': site.site_title,
            'site_description': site.site_description,
        })


# ---------------------------------------------------------------
# SITE SETTINGS + RATE LIMITS - two pages, one row.
# Each page has its own serializer with only ITS fields, so the Rate
# Limits page can't accidentally switch maintenance on and back.
# ---------------------------------------------------------------
class GeneralSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ['maintenance_mode', 'maintenance_message', 'signups_open', 'contact_email', 'updated_at']
        read_only_fields = ['updated_at']


class RateLimitsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = [
            'login_max_per_username', 'login_max_per_ip', 'login_lock_minutes',
            'contact_per_hour', 'comments_per_hour', 'messages_per_hour', 'updated_at',
        ]
        read_only_fields = ['updated_at']


# RetrieveUpdateAPIView = GET + PATCH for ONE object. get_object()
# normally reads the <pk> from the URL - here it's always row 1.
class AdminSiteSettingsView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = GeneralSettingsSerializer

    def get_object(self):
        return SiteSettings.load()


class AdminRateLimitsView(AdminSiteSettingsView):
    # Same view, other fields - that's all a subclass needs.
    serializer_class = RateLimitsSerializer


# ---------------------------------------------------------------
# IP BLOCKLIST
#   GET  /api/dashboard/blocked-ips/  -> { my_ip, blocked: [...] }
#   POST /api/dashboard/blocked-ips/  { ip_address, reason }
#   DELETE /api/dashboard/blocked-ips/<id>/
# ---------------------------------------------------------------
class BlockedIPSerializer(serializers.ModelSerializer):
    blocked_by = serializers.CharField(source='blocked_by.username', default=None, read_only=True)

    class Meta:
        model = BlockedIP
        fields = ['id', 'ip_address', 'reason', 'blocked_by', 'created_at']


class AdminBlockedIPListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            # Shown on the page so you know which one NOT to block.
            'my_ip': client_ip(request),
            'blocked': BlockedIPSerializer(BlockedIP.objects.select_related('blocked_by'), many=True).data,
        })

    def post(self, request):
        serializer = BlockedIPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Blocking yourself = locked out of your own site.
        if serializer.validated_data['ip_address'] == client_ip(request):
            return Response({'detail': "That's your own IP address - you'd lock yourself out."}, status=400)
        serializer.save(blocked_by=request.user)
        return Response(serializer.data, status=201)


class AdminBlockedIPDetailView(generics.DestroyAPIView):
    permission_classes = [IsAdminUser]
    queryset = BlockedIP.objects.all()


# ---------------------------------------------------------------
# AUDIT LOG  GET /api/dashboard/audit-log/?q=ban&user=christopher
# The newest 200 matches. Read-only: a log you can edit isn't a log.
# ---------------------------------------------------------------
class AdminAuditLogView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        entries = AuditEntry.objects.all()
        q = request.query_params.get('q', '').strip()
        if q:
            entries = entries.filter(Q(action__icontains=q) | Q(path__icontains=q))
        user = request.query_params.get('user', '').strip()
        if user:
            entries = entries.filter(username__iexact=user)

        return Response({
            # The admins who appear in the log - for the filter menu.
            'admins': sorted(set(AuditEntry.objects.values_list('username', flat=True))),
            'entries': [
                {
                    'id': entry.id,
                    'username': entry.username,
                    'action': entry.action,
                    'method': entry.method,
                    'path': entry.path,
                    'details': entry.details,
                    'status_code': entry.status_code,
                    'ip_address': entry.ip_address,
                    'created_at': entry.created_at,
                }
                for entry in entries[:200]
            ],
        })
