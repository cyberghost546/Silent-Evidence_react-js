from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .errors import save_error
from .models import ErrorReport


# ---------------------------------------------------------------
# ERROR LOG API
#
#   POST   /api/errors/                  - React sends a crash (anyone,
#                                          because visitors crash too)
#   GET    /api/dashboard/errors/        - the list (admins)
#   DELETE /api/dashboard/errors/<id>/   - "Fixed" (admins)
#   DELETE /api/dashboard/errors/        - clear all (admins)
# ---------------------------------------------------------------

# Anyone may report - so limit it, or someone could fill the table.
class ErrorReportThrottle(AnonRateThrottle):
    scope = 'error_report'   # its own counter (see SignUpThrottle)
    rate = '30/hour'


class ReportErrorView(APIView):
    throttle_classes = [ErrorReportThrottle]

    def post(self, request):
        message = str(request.data.get('message') or '').strip()
        if not message:
            return Response({'detail': 'No message.'}, status=400)
        save_error(
            'frontend',
            message,
            details=str(request.data.get('details') or ''),
            url=str(request.data.get('url') or ''),
            user=request.user,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        # 204 = "got it, nothing to send back".
        return Response(status=204)


def error_data(report):
    return {
        'id': report.id,
        'source': report.source,
        'message': report.message,
        'details': report.details,
        'url': report.url,
        'user': report.user.username if report.user else None,
        'user_agent': report.user_agent,
        'count': report.count,
        'first_seen': report.first_seen,
        'last_seen': report.last_seen,
    }


class AdminErrorListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        reports = ErrorReport.objects.select_related('user')
        source = request.query_params.get('source')
        if source in ('frontend', 'backend'):
            reports = reports.filter(source=source)
        return Response([error_data(report) for report in reports[:200]])

    def delete(self, request):
        ErrorReport.objects.all().delete()
        return Response(status=204)


class AdminErrorDetailView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        get_object_or_404(ErrorReport, pk=pk).delete()
        return Response(status=204)
