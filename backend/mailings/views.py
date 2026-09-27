from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mass_mail
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .digests import digest_recipients, build_digest, send_digests
from .email_templates import render_email
from .models import Newsletter, DigestRun


# ---------------------------------------------------------------
# ADMIN DASHBOARD -> NEWSLETTER and COMMENT DIGEST. Admins only.
# ---------------------------------------------------------------

# Who gets the newsletter: members with the "Weekly Horror Digest"
# switched on in Settings (members without a Profile row yet have
# the default, which is ON) and an email address.
def newsletter_recipients():
    return (
        get_user_model().objects
        .filter(is_active=True, profile__email_verified=True)   # confirmed addresses only
        .exclude(email='')
        .exclude(profile__weekly_digest=False)
    )


# GET  /api/dashboard/newsletter/  -> { recipient_count, sent: [...] }
# POST /api/dashboard/newsletter/  { subject, body, test_only }
#   test_only = true -> send it only to YOURSELF first, to check it.
class NewsletterView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        sent = [
            {
                'id': letter.id,
                'subject': letter.subject,
                'body': letter.body,
                'recipient_count': letter.recipient_count,
                'sent_at': letter.sent_at,
                'sent_by': letter.sent_by.username if letter.sent_by else None,
            }
            for letter in Newsletter.objects.select_related('sent_by')[:50]
        ]
        return Response({'recipient_count': newsletter_recipients().count(), 'sent': sent})

    def post(self, request):
        subject = (request.data.get('subject') or '').strip()
        body = (request.data.get('body') or '').strip()
        if not subject or not body:
            return Response({'detail': 'A newsletter needs a subject and a text.'}, status=400)

        # The footer text is an Email Template too.
        _, footer_text = render_email('newsletter_footer', settings_link=f'{settings.SITE_URL}/settings')
        footer = '\n\n' + footer_text

        # A test goes only to you, and isn't saved as "sent".
        if request.data.get('test_only') in (True, 'true'):
            if not request.user.email:
                return Response({'detail': 'Your account has no email address to send the test to.'}, status=400)
            send_mass_mail(
                [(f'[TEST] {subject}', body + footer, settings.DEFAULT_FROM_EMAIL, [request.user.email])],
                fail_silently=True,
            )
            return Response({'detail': f'Test sent to {request.user.email}.'})

        # send_mass_mail sends many emails over ONE connection - much
        # faster than calling send_mail in a loop. One tuple per email:
        # (subject, text, from, [to]). One email per person, so nobody
        # sees the other members' addresses.
        recipients = list(newsletter_recipients().values_list('email', flat=True))
        send_mass_mail(
            [(subject, body + footer, settings.DEFAULT_FROM_EMAIL, [email]) for email in recipients],
            fail_silently=True,
        )
        Newsletter.objects.create(subject=subject[:150], body=body, sent_by=request.user, recipient_count=len(recipients))
        return Response({'detail': f'Sent to {len(recipients)} members.'}, status=201)


# GET  /api/dashboard/digest/?period=weekly
#   -> who would get an email right now + a preview of the first one
# POST /api/dashboard/digest/  { period } -> send them now
class CommentDigestView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        period = request.query_params.get('period', 'weekly')
        if period not in ('daily', 'weekly'):
            return Response({'detail': 'Unknown period.'}, status=400)

        # Build every digest (without sending) to count and preview.
        would_get = []
        for user in digest_recipients(period):
            digest = build_digest(user, period)
            if digest:
                would_get.append({'username': user.username, 'digest': digest})

        return Response({
            'period': period,
            'subscribers': digest_recipients(period).count(),
            'would_send': len(would_get),
            'recipients': [
                {'username': row['username'], 'comment_count': row['digest']['comment_count']}
                for row in would_get[:100]
            ],
            'preview': would_get[0]['digest'] if would_get else None,
            'history': [
                {
                    'period': run.period,
                    'emails_sent': run.emails_sent,
                    'sent_at': run.sent_at,
                    'started_by': run.started_by.username if run.started_by else 'scheduled',
                }
                for run in DigestRun.objects.select_related('started_by')[:20]
            ],
        })

    def post(self, request):
        period = request.data.get('period')
        if period not in ('daily', 'weekly'):
            return Response({'detail': 'Unknown period.'}, status=400)
        run = send_digests(period, started_by=request.user)
        return Response({'detail': f'Sent {run.emails_sent} {period} digest emails.'})
