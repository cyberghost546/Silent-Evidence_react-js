from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from stories.models import Story, Comment, LastWord, stories_for
from .models import Report, Appeal, LoginEvent
from . import security


# ===============================================================
# FOR MEMBERS
# ===============================================================

# POST /api/reports/   { story_id OR comment_id, reason, details }
# The "Report" button on a story or a comment.
class ReportCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        story_id = request.data.get('story_id')
        comment_id = request.data.get('comment_id')
        reason = request.data.get('reason', '')
        details = (request.data.get('details') or '').strip()

        # dict(Report.REASONS) turns the list of pairs into
        # { 'spam': 'Spam or advertising', ... } - handy for checking.
        if reason not in dict(Report.REASONS):
            return Response({'detail': 'Pick a reason.'}, status=400)

        # Exactly ONE of the two. (bool(a) == bool(b) = both or neither.)
        if bool(story_id) == bool(comment_id):
            return Response({'detail': 'Report either a story or a comment.'}, status=400)

        if story_id:
            # stories_for(): you can only report what you can see.
            target = {'story': get_object_or_404(stories_for(request.user), pk=story_id)}
        else:
            target = {'comment': get_object_or_404(Comment, pk=comment_id, is_hidden=False)}

        # Reporting the same thing twice while it's still open does nothing.
        if Report.objects.filter(reporter=request.user, status='open', **target).exists():
            return Response({'detail': 'You already reported this. An admin will look at it.'}, status=400)

        Report.objects.create(reporter=request.user, reason=reason, details=details[:1000], **target)
        return Response({'detail': 'Thanks - an admin will look at it.'}, status=201)


# GET  /api/appeals/  -> your appeals
# POST /api/appeals/  { story_id, message } -> ask to get an archived story back
class MyAppealsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        appeals = Appeal.objects.filter(user=request.user).select_related('story')
        return Response([appeal_data(appeal) for appeal in appeals])

    def post(self, request):
        # Only YOUR stories, and only archived ones.
        story = get_object_or_404(Story, pk=request.data.get('story_id'), author=request.user)
        message = (request.data.get('message') or '').strip()

        if not story.is_archived:
            return Response({'detail': 'This story is not archived.'}, status=400)
        if not message:
            return Response({'detail': 'Tell the admins why it should come back.'}, status=400)
        if Appeal.objects.filter(story=story, status='pending').exists():
            return Response({'detail': 'You already appealed. Please wait for an answer.'}, status=400)

        appeal = Appeal.objects.create(user=request.user, story=story, message=message[:1000])
        return Response(appeal_data(appeal), status=201)


# ===============================================================
# FOR ADMINS (Admin Dashboard)
# ===============================================================

def appeal_data(appeal):
    return {
        'id': appeal.id,
        'user': appeal.user.username,
        'story_id': appeal.story_id,
        'story_title': appeal.story.title,
        'story_archived': appeal.story.is_archived,
        'message': appeal.message,
        'status': appeal.status,
        'admin_note': appeal.admin_note,
        'handled_by': appeal.handled_by.username if appeal.handled_by else None,
        'created_at': appeal.created_at,
    }


def report_data(report):
    # What was reported, in one shape for both kinds.
    if report.story_id:
        target = {
            'type': 'story',
            'id': report.story_id,
            'title': report.story.title,
            'text': report.story.excerpt or report.story.body[:200],
            'author': report.story.author.username,
            'removed': report.story.is_archived,
            'story_id': report.story_id,
        }
    else:
        target = {
            'type': 'comment',
            'id': report.comment_id,
            'title': f'Comment on "{report.comment.story.title}"',
            'text': report.comment.body,
            'author': report.comment.author.username,
            'removed': report.comment.is_hidden,
            'story_id': report.comment.story_id,
        }

    return {
        'id': report.id,
        'reason': report.reason,
        # get_reason_display() = Django's free helper: the label for the
        # saved value ('spam' -> 'Spam or advertising').
        'reason_label': report.get_reason_display(),
        'details': report.details,
        'status': report.status,
        'reporter': report.reporter.username if report.reporter else '(deleted user)',
        'handled_by': report.handled_by.username if report.handled_by else None,
        'created_at': report.created_at,
        'target': target,
    }


# GET /api/dashboard/reports/  -> { counts, reports }
class AdminReportListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        reports = Report.objects.select_related(
            'reporter', 'handled_by', 'story__author', 'comment__author', 'comment__story',
        )
        rows = [report_data(report) for report in reports[:300]]
        counts = {'open': 0, 'resolved': 0, 'dismissed': 0}
        for row in rows:
            counts[row['status']] += 1
        return Response({'counts': counts, 'reports': rows})


# POST /api/dashboard/reports/7/  { action: 'remove' | 'dismiss' }
#   remove  = archive the story / hide the comment, report "resolved"
#   dismiss = it's fine, report "dismissed"
# Every OPEN report about the same thing is closed together - no
# need to click through five reports about one spam comment.
class AdminReportActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        report = get_object_or_404(Report, pk=pk)
        action = request.data.get('action')

        if action == 'remove':
            if report.story_id:
                report.story.is_archived = True
                report.story.save()
            else:
                report.comment.is_hidden = True
                report.comment.save()
            new_status = 'resolved'
        elif action == 'dismiss':
            new_status = 'dismissed'
        else:
            return Response({'detail': 'Unknown action.'}, status=400)

        same_target = {'story_id': report.story_id} if report.story_id else {'comment_id': report.comment_id}
        Report.objects.filter(status='open', **same_target).update(
            status=new_status, handled_by=request.user, handled_at=timezone.now(),
        )
        return Response({'status': new_status})


# GET /api/dashboard/moderation/?type=comments   (or lastwords)
#   The newest 200 comments or Last Words, hidden ones too.
class AdminModerationListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.query_params.get('type') == 'lastwords':
            items = LastWord.objects.select_related('author')[:200]
            rows = [
                {
                    'id': item.id, 'body': item.body, 'author': item.author.username,
                    'is_hidden': item.is_hidden, 'created_at': item.created_at,
                    'story_id': None, 'story_title': None, 'open_reports': 0,
                }
                for item in items
            ]
        else:
            # open_reports: how many OPEN reports each comment has, so
            # the reported ones stand out. filter= inside Count() only
            # counts the rows that match.
            items = (
                Comment.objects.select_related('author', 'story')
                .annotate(open_reports=Count('reports', filter=Q(reports__status='open')))
                .order_by('-created_at')[:200]
            )
            rows = [
                {
                    'id': item.id, 'body': item.body, 'author': item.author.username,
                    'is_hidden': item.is_hidden, 'created_at': item.created_at,
                    'story_id': item.story_id, 'story_title': item.story.title,
                    'open_reports': item.open_reports,
                }
                for item in items
            ]
        return Response(rows)


# PATCH  /api/dashboard/moderation/comments/5/  { is_hidden: true/false }
# DELETE /api/dashboard/moderation/comments/5/
# (or lastwords instead of comments)
class AdminModerationItemView(APIView):
    permission_classes = [IsAdminUser]

    def get_item(self, kind, pk):
        model = LastWord if kind == 'lastwords' else Comment
        return get_object_or_404(model, pk=pk)

    def patch(self, request, kind, pk):
        item = self.get_item(kind, pk)
        item.is_hidden = request.data.get('is_hidden') == 'true'
        item.save()
        return Response({'id': item.id, 'is_hidden': item.is_hidden})

    def delete(self, request, kind, pk):
        self.get_item(kind, pk).delete()
        return Response(status=204)


# GET /api/dashboard/appeals/  -> { counts, appeals }
class AdminAppealListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        appeals = Appeal.objects.select_related('user', 'story', 'handled_by')[:300]
        rows = [appeal_data(appeal) for appeal in appeals]
        counts = {'pending': 0, 'accepted': 0, 'rejected': 0}
        for row in rows:
            counts[row['status']] += 1
        return Response({'counts': counts, 'appeals': rows})


# POST /api/dashboard/appeals/3/  { decision: 'accept' | 'reject', note }
#   accept = the story comes back (un-archived)
class AdminAppealDecisionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        appeal = get_object_or_404(Appeal, pk=pk)
        decision = request.data.get('decision')

        if appeal.status != 'pending':
            return Response({'detail': 'This appeal was already decided.'}, status=400)
        if decision not in ('accept', 'reject'):
            return Response({'detail': 'Unknown decision.'}, status=400)

        if decision == 'accept':
            appeal.story.is_archived = False
            appeal.story.save()

        appeal.status = 'accepted' if decision == 'accept' else 'rejected'
        appeal.admin_note = (request.data.get('note') or '').strip()[:1000]
        appeal.handled_by = request.user
        appeal.handled_at = timezone.now()
        appeal.save()
        return Response(appeal_data(appeal))


def login_event_data(event):
    return {
        'id': event.id,
        'username': event.username,
        'user_id': event.user_id,
        'success': event.success,
        'ip_address': event.ip_address,
        'user_agent': event.user_agent,
        'created_at': event.created_at,
    }


# GET /api/dashboard/login-logs/  -> the newest 500 login attempts
class AdminLoginLogView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        events = LoginEvent.objects.all()[:500]
        return Response([login_event_data(event) for event in events])


# GET  /api/dashboard/security/          -> the overview
# POST /api/dashboard/security/unlock/   { username } or { ip }
class AdminSecurityView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        day_ago = timezone.now() - timedelta(hours=24)
        last_day = LoginEvent.objects.filter(created_at__gte=day_ago)
        failed = last_day.filter(success=False)

        # "Top 5" lists: .values(field) + .annotate(Count) = GROUP BY,
        # then biggest first.
        def top(field):
            rows = failed.values(field).annotate(total=Count('id')).order_by('-total')[:5]
            return [{'value': row[field], 'failures': row['total']} for row in rows]

        admins = get_user_model().objects.filter(is_staff=True).order_by('username')

        return Response({
            'rules': {
                'max_failures_per_username': security.MAX_FAILURES_PER_USERNAME,
                'max_failures_per_ip': security.MAX_FAILURES_PER_IP,
                'lock_minutes': security.LOCK_MINUTES,
            },
            'last_24h': {
                'successful': last_day.filter(success=True).count(),
                'failed': failed.count(),
            },
            'locked': security.current_locks(),
            'top_failed_usernames': top('username'),
            'top_failed_ips': top('ip_address'),
            'admins': [
                {'username': admin.username, 'is_superuser': admin.is_superuser, 'last_login': admin.last_login}
                for admin in admins
            ],
            'recent_admin_logins': [
                login_event_data(event)
                for event in LoginEvent.objects.filter(success=True, user__is_staff=True)[:10]
            ],
        })


class AdminUnlockView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        security.unlock(
            username=(request.data.get('username') or '').strip(),
            ip=(request.data.get('ip') or '').strip(),
        )
        return Response({'detail': 'Unlocked.'})
