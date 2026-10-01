import os
import platform
from datetime import timedelta

import django
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from contact.models import ContactMessage
from mailings.models import DigestRun, EmailLog
from moderation.models import Report, Appeal, VerificationRequest, Ban
from stories.models import Story, Comment
from support.models import SupportTicket


# ---------------------------------------------------------------
# ADMIN SEARCH, EMAIL LOG and SITE HEALTH (Admin Dashboard).
# Admins only.
# ---------------------------------------------------------------

# GET /api/dashboard/search/?q=bob
#
# One search box for (almost) everything, grouped:
#   { users: [...], stories: [...], comments: [...], reports: [...],
#     tickets: [...], contact: [...] }
# Each result has a `link` - the admin page where you can act on it.
# At most 8 per group: it's for finding, not for browsing.
class AdminSearchView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        query = (request.query_params.get('q') or '').strip()
        empty = {'users': [], 'stories': [], 'comments': [], 'reports': [], 'tickets': [], 'contact': []}
        if len(query) < 2:
            return Response(empty)

        # A number? Then also look it up as an id ("#57").
        number = int(query.lstrip('#')) if query.lstrip('#').isdigit() else None
        by_id = Q(id=number) if number is not None else Q(pk__in=[])

        users = get_user_model().objects.filter(by_id | Q(username__icontains=query) | Q(email__icontains=query))[:8]
        stories = Story.objects.filter(by_id | Q(title__icontains=query)).select_related('author')[:8]
        comments = Comment.objects.filter(body__icontains=query).select_related('author', 'story')[:8]
        reports = Report.objects.filter(by_id | Q(details__icontains=query)).select_related('story', 'comment')[:8]
        tickets = SupportTicket.objects.filter(by_id | Q(subject__icontains=query)).select_related('user')[:8]
        contact = ContactMessage.objects.filter(Q(name__icontains=query) | Q(email__icontains=query) | Q(message__icontains=query))[:8]

        return Response({
            'users': [
                {'title': u.username, 'detail': f'#{u.id} · {u.email or "no email"}' + (' · admin' if u.is_staff else ''), 'link': f'/profile/{u.username}'}
                for u in users
            ],
            'stories': [
                {'title': s.title, 'detail': f'#{s.id} · by {s.author.username} · {"archived" if s.is_archived else "published" if s.is_published else "draft"}', 'link': '/dashboard/stories'}
                for s in stories
            ],
            'comments': [
                {'title': c.body[:80], 'detail': f'by {c.author.username} on "{c.story.title}"' + (' · hidden' if c.is_hidden else ''), 'link': '/dashboard/moderation'}
                for c in comments
            ],
            'reports': [
                {'title': f'Report #{r.id}: {r.get_reason_display()}', 'detail': r.status, 'link': '/dashboard/reports'}
                for r in reports
            ],
            'tickets': [
                {'title': f'#{t.id} {t.subject}', 'detail': f'{t.user.username} · {t.get_status_display()}', 'link': '/dashboard/support'}
                for t in tickets
            ],
            'contact': [
                {'title': f'{m.name} <{m.email}>', 'detail': m.message[:80], 'link': '/dashboard/contact'}
                for m in contact
            ],
        })


# GET /api/dashboard/email-log/?q=...&failed=1  -> the newest 300 emails
class EmailLogView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        emails = EmailLog.objects.all()
        query = (request.query_params.get('q') or '').strip()
        if query:
            emails = emails.filter(Q(to__icontains=query) | Q(subject__icontains=query))
        if request.query_params.get('failed') == '1':
            emails = emails.filter(success=False)

        return Response({
            'backend': settings.MAILERS['default']['BACKEND'],
            'total': EmailLog.objects.count(),
            'last_24h': EmailLog.objects.filter(sent_at__gte=timezone.now() - timedelta(hours=24)).count(),
            'emails': [
                {'id': e.id, 'to': e.to, 'subject': e.subject, 'body': e.body, 'success': e.success, 'error': e.error, 'sent_at': e.sent_at}
                for e in emails[:300]
            ],
        })


# ---------------------------------------------------------------
# SITE HEALTH - a list of checks, each:
#   { group, name, status: 'ok' | 'warning' | 'problem' | 'info', detail }
# ---------------------------------------------------------------

def check(group, name, status, detail):
    return {'group': group, 'name': name, 'status': status, 'detail': detail}


# Size of a file or a whole folder, as "1.2 MB".
def folder_size(path):
    total = 0
    if os.path.isfile(path):
        return os.path.getsize(path)
    # os.walk visits every folder inside `path`, one by one.
    for folder, _subfolders, files in os.walk(path):
        for name in files:
            total += os.path.getsize(os.path.join(folder, name))
    return total


def readable_size(size):
    for unit in ('bytes', 'KB', 'MB', 'GB'):
        if size < 1024:
            return f'{size:.0f} {unit}' if unit == 'bytes' else f'{size:.1f} {unit}'
        size /= 1024
    return f'{size:.1f} TB'


class SiteHealthView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        checks = []

        # --- Server ---
        try:
            # The smallest possible question to the database.
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            checks.append(check('Server', 'Database', 'ok', f'Connected ({connection.vendor}).'))
        except Exception as problem:
            checks.append(check('Server', 'Database', 'problem', f'Cannot reach the database: {problem}'))

        # Migrations that exist in the code but aren't applied yet.
        executor = MigrationExecutor(connection)
        waiting = executor.migration_plan(executor.loader.graph.leaf_nodes())
        if waiting:
            names = ', '.join(f'{migration.app_label}.{migration.name}' for migration, _ in waiting[:5])
            checks.append(check('Server', 'Migrations', 'problem', f'{len(waiting)} not applied: {names}. Run "python manage.py migrate".'))
        else:
            checks.append(check('Server', 'Migrations', 'ok', 'All applied.'))

        checks.append(check('Server', 'Versions', 'info', f'Python {platform.python_version()} · Django {django.get_version()}'))

        db_path = settings.DATABASES['default'].get('NAME')
        if db_path and os.path.exists(str(db_path)):
            checks.append(check('Server', 'Database size', 'info', readable_size(folder_size(str(db_path)))))
        media = str(settings.MEDIA_ROOT)
        if os.path.isdir(media):
            writable = os.access(media, os.W_OK)
            checks.append(check('Server', 'Uploads folder', 'ok' if writable else 'problem',
                                f'{readable_size(folder_size(media))} of uploads.' + ('' if writable else ' Django cannot write here - uploads will fail.')))

        # --- Settings (things to change before going online) ---
        checks.append(check('Settings', 'Debug mode', 'warning' if settings.DEBUG else 'ok',
                            'ON - fine while developing, but must be OFF on a real server (it shows error details to everyone).' if settings.DEBUG else 'Off.'))
        insecure_key = settings.SECRET_KEY.startswith('django-insecure')
        checks.append(check('Settings', 'Secret key', 'warning' if insecure_key else 'ok',
                            'The development key - make a new secret one before going online.' if insecure_key else 'Custom key set.'))
        backend = settings.MAILERS['default']['BACKEND']
        prints_only = 'console' in backend.lower() or 'Console' in backend
        checks.append(check('Settings', 'Email', 'warning' if prints_only else 'ok',
                            'Emails are only printed in the terminal, not sent (see EMAIL in settings.py).' if prints_only else f'Sending with {backend}.'))
        has_ai_key = bool(os.environ.get('ANTHROPIC_API_KEY') or os.environ.get('ANTHROPIC_AUTH_TOKEN'))
        checks.append(check('Settings', 'AI Generator key', 'ok' if has_ai_key else 'info',
                            'Set.' if has_ai_key else 'Not set - the AI Generator page will ask for it.'))

        # --- Work waiting for admins ---
        waiting_work = [
            ('Open reports', Report.objects.filter(status='open').count(), '/dashboard/reports'),
            ('Support tickets waiting', SupportTicket.objects.filter(status='open').count(), '/dashboard/support'),
            ('New contact messages', ContactMessage.objects.filter(is_handled=False).count(), '/dashboard/contact'),
            ('Appeals waiting', Appeal.objects.filter(status='pending').count(), '/dashboard/appeals'),
            ('Verification requests', VerificationRequest.objects.filter(status='pending').count(), '/dashboard/verification'),
        ]
        for name, count, link in waiting_work:
            item = check('Waiting for you', name, 'warning' if count else 'ok', f'{count} waiting.' if count else 'Nothing waiting.')
            item['link'] = link
            checks.append(item)

        # --- Scheduled jobs ---
        last_digest = DigestRun.objects.first()
        if last_digest is None:
            checks.append(check('Jobs', 'Comment digest', 'info', 'Never sent. Send it on the Comment Digest page, or schedule "python manage.py send_comment_digests weekly".'))
        else:
            days = (timezone.now() - last_digest.sent_at).days
            checks.append(check('Jobs', 'Comment digest', 'warning' if days > 8 else 'ok',
                                f'Last sent {days} days ago ({last_digest.period}, {last_digest.emails_sent} emails).'))
        failed_emails = EmailLog.objects.filter(success=False, sent_at__gte=timezone.now() - timedelta(days=7)).count()
        checks.append(check('Jobs', 'Failed emails (7 days)', 'problem' if failed_emails else 'ok', f'{failed_emails} failed.'))
        active_bans = sum(1 for ban in Ban.objects.filter(lifted_at__isnull=True) if ban.is_active())
        checks.append(check('Jobs', 'Active bans', 'info', f'{active_bans} members banned right now.'))

        # The worst status decides the headline at the top of the page.
        statuses = [item['status'] for item in checks]
        overall = 'problem' if 'problem' in statuses else 'warning' if 'warning' in statuses else 'ok'
        return Response({'overall': overall, 'checked_at': timezone.now(), 'checks': checks})
