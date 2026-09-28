from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import get_profile
from stories.models import Story, Comment, LastWord, stories_for
from .bans import active_ban, ban_user, lift_ban
from .content_filter import check_text
from .models import Report, Appeal, LoginEvent, BannedWord, VerificationRequest, UserWarning, Ban
from . import security


# ===============================================================
# FOR MEMBERS
# ===============================================================

# What can be reported: the field in the request -> the field on Report.
TARGETS = {
    'story_id': 'story',
    'comment_id': 'comment',
    'chat_message_id': 'chat_message',       # a read-along chat message
    'reading_list_id': 'reading_list',       # a public reading list
}


def find_target(request, field, value):
    # You can only report what you can SEE.
    from stories.models import ReadAlongMessage, ReadingList
    if field == 'story_id':
        return get_object_or_404(stories_for(request.user), pk=value)
    if field == 'comment_id':
        return get_object_or_404(Comment, pk=value, is_hidden=False)
    if field == 'chat_message_id':
        return get_object_or_404(ReadAlongMessage, pk=value, is_hidden=False, room__story__in=stories_for(request.user))
    return get_object_or_404(ReadingList, pk=value, is_public=True)


# POST /api/reports/   { story_id OR comment_id OR chat_message_id OR reading_list_id, reason, details }
# The "Report" buttons on stories, comments, read-along chats and reading lists.
class ReportCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        reason = request.data.get('reason', '')
        details = (request.data.get('details') or '').strip()

        # dict(Report.REASONS) turns the list of pairs into
        # { 'spam': 'Spam or advertising', ... } - handy for checking.
        if reason not in dict(Report.REASONS):
            return Response({'detail': 'Pick a reason.'}, status=400)

        # Exactly ONE thing is reported.
        given = [field for field in TARGETS if request.data.get(field)]
        if len(given) != 1:
            return Response({'detail': 'Report one thing at a time.'}, status=400)
        field = given[0]
        target = {TARGETS[field]: find_target(request, field, request.data.get(field))}

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
    # What was reported, in one shape for every kind.
    # link = where an admin can see it on the site.
    if report.story_id:
        target = {
            'type': 'story',
            'id': report.story_id,
            'title': report.story.title,
            'text': report.story.excerpt or report.story.body[:200],
            'author': report.story.author.username,
            'removed': report.story.is_archived,
            'story_id': report.story_id,
            'link': f'/stories/{report.story_id}',
        }
    elif report.comment_id:
        target = {
            'type': 'comment',
            'id': report.comment_id,
            'title': f'Comment on "{report.comment.story.title}"',
            'text': report.comment.body,
            'author': report.comment.author.username,
            'removed': report.comment.is_hidden,
            'story_id': report.comment.story_id,
            'link': f'/stories/{report.comment.story_id}',
        }
    elif report.chat_message_id:
        message = report.chat_message
        target = {
            'type': 'chat',
            'id': message.id,
            'title': f'Read-along chat: "{message.room.story.title}"',
            'text': message.body,
            'author': message.author.username,
            'removed': message.is_hidden,
            'story_id': message.room.story_id,
            'link': f'/read-alongs/{message.room_id}',
        }
    else:
        reading_list = report.reading_list
        target = {
            'type': 'list',
            'id': reading_list.id,
            'title': f'Reading list: "{reading_list.title}"',
            'text': reading_list.description,
            'author': reading_list.owner.username,
            'removed': not reading_list.is_public,
            'story_id': None,
            'link': f'/reading-lists/{reading_list.id}',
        }

    return {
        'id': report.id,
        'reason': report.reason,
        # get_reason_display() = Django's free helper: the label for the
        # saved value ('spam' -> 'Spam or advertising').
        'reason_label': report.get_reason_display(),
        'details': report.details,
        'status': report.status,
        # No reporter = the Content Filter filed it (or the member
        # deleted their account).
        'reporter': report.reporter.username if report.reporter else (
            'Content filter' if report.details.startswith('Flagged by the content filter') else '(deleted user)'
        ),
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
            'chat_message__author', 'chat_message__room__story', 'reading_list__owner',
        )
        rows = [report_data(report) for report in reports[:300]]
        counts = {'open': 0, 'resolved': 0, 'dismissed': 0}
        for row in rows:
            counts[row['status']] += 1
        return Response({'counts': counts, 'reports': rows})


# POST /api/dashboard/reports/7/  { action: 'remove' | 'dismiss' }
#   remove  = archive the story / hide the comment or chat message /
#             make the reading list private; report "resolved"
#   dismiss = it's fine, report "dismissed"
# Every OPEN report about the same thing is closed together - no
# need to click through five reports about one spam comment.
class AdminReportActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        report = get_object_or_404(Report, pk=pk)
        action = request.data.get('action')

        if action == 'remove':
            # "Remove" for each kind: archive the story, hide the comment
            # or chat message, make the reading list private.
            if report.story_id:
                report.story.is_archived = True
                report.story.save()
            elif report.comment_id:
                report.comment.is_hidden = True
                report.comment.save()
            elif report.chat_message_id:
                report.chat_message.is_hidden = True
                report.chat_message.save()
            else:
                report.reading_list.is_public = False
                report.reading_list.save()
            new_status = 'resolved'
        elif action == 'dismiss':
            new_status = 'dismissed'
        else:
            return Response({'detail': 'Unknown action.'}, status=400)

        # The field that's filled in, e.g. {'chat_message_id': 12}.
        same_target = {f'{name}_id': getattr(report, f'{name}_id') for name in TARGETS.values() if getattr(report, f'{name}_id')}
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
            'rules': security.login_limits(),
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


# ===============================================================
# CONTENT FILTER (Admin Dashboard -> Content Filter)
# ===============================================================

class BannedWordSerializer(serializers.ModelSerializer):
    class Meta:
        model = BannedWord
        fields = ['id', 'word', 'action', 'created_at']


# GET/POST /api/dashboard/banned-words/        list / add
# PATCH/DELETE /api/dashboard/banned-words/5/  change block<->flag / remove
class AdminBannedWordListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = BannedWordSerializer
    queryset = BannedWord.objects.all()


class AdminBannedWordDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = BannedWordSerializer
    queryset = BannedWord.objects.all()


# POST /api/dashboard/banned-words/test/  { text }
#   -> { action: 'block' | 'flag' | null, words: [...] }
# The "try a sentence" box - see what the filter would do.
class FilterTestView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        action, words = check_text(request.data.get('text') or '')
        return Response({'action': action, 'words': words})


# ===============================================================
# VERIFICATION
# ===============================================================

def verification_data(item):
    return {
        'id': item.id,
        'user': item.user.username,
        'reason': item.reason,
        'proof_url': item.proof_url,
        'status': item.status,
        'admin_note': item.admin_note,
        'created_at': item.created_at,
        'story_count': item.user.stories.filter(is_published=True).count(),
        'date_joined': item.user.date_joined,
    }


# GET  /api/verification/  -> your requests, newest first (+ are you verified?)
# POST /api/verification/  { reason, proof_url } -> ask for the check mark
class MyVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        requests = VerificationRequest.objects.filter(user=request.user).select_related('user')
        return Response({
            'is_verified': get_profile(request.user).is_verified,
            'requests': [verification_data(item) for item in requests],
        })

    def post(self, request):
        if get_profile(request.user).is_verified:
            return Response({'detail': 'You are already verified.'}, status=400)
        if VerificationRequest.objects.filter(user=request.user, status='pending').exists():
            return Response({'detail': 'You already have a request waiting.'}, status=400)

        reason = (request.data.get('reason') or '').strip()
        if len(reason) < 10:
            return Response({'detail': 'Tell us a little more about why (at least a sentence).'}, status=400)

        item = VerificationRequest(user=request.user, reason=reason[:1000], proof_url=(request.data.get('proof_url') or '').strip())
        # full_clean() runs the model's own checks - here: is proof_url
        # a real URL? It raises an error we turn into a 400.
        try:
            item.full_clean()
        except DjangoValidationError:
            return Response({'detail': 'The link is not a valid web address.'}, status=400)
        item.save()
        return Response(verification_data(item), status=201)


# GET /api/dashboard/verification/  -> { counts, requests }
class AdminVerificationListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        items = VerificationRequest.objects.select_related('user')[:300]
        rows = [verification_data(item) for item in items]
        counts = {'pending': 0, 'approved': 0, 'rejected': 0}
        for row in rows:
            counts[row['status']] += 1
        # Everyone who has the check mark right now.
        verified = get_user_model().objects.filter(profile__is_verified=True).values_list('username', flat=True)
        return Response({'counts': counts, 'requests': rows, 'verified_users': list(verified)})


# POST /api/dashboard/verification/3/  { decision: 'approve' | 'reject', note }
class AdminVerificationDecisionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        item = get_object_or_404(VerificationRequest, pk=pk, status='pending')
        decision = request.data.get('decision')
        if decision not in ('approve', 'reject'):
            return Response({'detail': 'Unknown decision.'}, status=400)

        item.status = 'approved' if decision == 'approve' else 'rejected'
        item.admin_note = (request.data.get('note') or '').strip()[:1000]
        item.handled_by = request.user
        item.handled_at = timezone.now()
        item.save()

        if decision == 'approve':
            profile = get_profile(item.user)
            profile.is_verified = True
            profile.save()
        return Response(verification_data(item))


# ===============================================================
# WARNINGS & BANS
# ===============================================================

def warning_data(warning):
    return {
        'id': warning.id,
        'user': warning.user.username,
        'message': warning.message,
        'issued_by': warning.issued_by.username if warning.issued_by else None,
        'created_at': warning.created_at,
        'acknowledged_at': warning.acknowledged_at,
    }


def ban_data(ban):
    return {
        'id': ban.id,
        'user': ban.user.username,
        'reason': ban.reason,
        'until': ban.until,
        'is_active': ban.is_active(),
        'lifted_at': ban.lifted_at,
        'issued_by': ban.issued_by.username if ban.issued_by else None,
        'created_at': ban.created_at,
    }


# --- Members ---

# GET  /api/warnings/          -> your warnings you haven't confirmed yet
# POST /api/warnings/5/ack/    -> "I understand"
class MyWarningsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        warnings = UserWarning.objects.filter(user=request.user, acknowledged_at__isnull=True).select_related('user', 'issued_by')
        return Response([warning_data(warning) for warning in warnings])


class AcknowledgeWarningView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        warning = get_object_or_404(UserWarning, pk=pk, user=request.user)
        warning.acknowledged_at = timezone.now()
        warning.save()
        return Response(status=204)


# --- Admins ---

# GET /api/dashboard/discipline/  -> the latest warnings and bans
class AdminDisciplineView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            'warnings': [warning_data(w) for w in UserWarning.objects.select_related('user', 'issued_by')[:100]],
            'bans': [ban_data(b) for b in Ban.objects.select_related('user', 'issued_by')[:100]],
        })


def find_member(username):
    return get_user_model().objects.filter(username__iexact=(username or '').strip()).first()


# POST /api/dashboard/warnings/  { username, message }
class AdminWarnView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        member = find_member(request.data.get('username'))
        message = (request.data.get('message') or '').strip()
        if member is None:
            return Response({'detail': 'No member with that username.'}, status=400)
        if not message:
            return Response({'detail': 'Write the warning message.'}, status=400)

        warning = UserWarning.objects.create(user=member, message=message[:2000], issued_by=request.user)
        return Response(warning_data(warning), status=201)


# POST /api/dashboard/bans/  { username, reason, days }
#   days = 1, 7, 30... or 0 / empty for a PERMANENT ban
class AdminBanView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        member = find_member(request.data.get('username'))
        reason = (request.data.get('reason') or '').strip()
        if member is None:
            return Response({'detail': 'No member with that username.'}, status=400)
        if member == request.user or member.is_staff:
            # Admins can't be banned here - take away the admin role on
            # the Users page first (so nobody locks the team out).
            return Response({'detail': "Admins can't be banned. Remove their admin role first."}, status=400)
        if not reason:
            return Response({'detail': 'Write the reason for the ban.'}, status=400)
        if active_ban(member):
            return Response({'detail': f'{member.username} is already banned.'}, status=400)

        days = str(request.data.get('days') or '0')
        until = None if days in ('0', '') else timezone.now() + timedelta(days=int(days))
        ban = ban_user(member, reason[:2000], until, request.user)
        return Response(ban_data(ban), status=201)


# POST /api/dashboard/bans/3/lift/  -> end the ban now
class AdminLiftBanView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        ban = get_object_or_404(Ban, pk=pk)
        lift_ban(ban)
        return Response(ban_data(ban))
