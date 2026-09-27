from django.conf import settings
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from dashboard.models import SiteSettings
from .models import ContactMessage, SUBJECTS
from .serializers import ContactMessageSerializer


# ---------------------------------------------------------------
# SPAM PROTECTION: at most N messages an hour.
#
# A "throttle" counts requests. After the limit DRF answers
# 429 Too Many Requests by itself. Two classes because DRF counts
# logged-out visitors (by IP address) and logged-in users (by
# account) separately - and we want a limit on both.
# ---------------------------------------------------------------
#
# The number comes from the Rate Limits page (SiteSettings).
# get_rate() is what DRF calls to ask "what's the limit?" - normally
# it reads the `rate` text; we build that text from the database.
class ContactAnonThrottle(AnonRateThrottle):
    def get_rate(self):
        return f'{SiteSettings.load().contact_per_hour}/hour'


class ContactUserThrottle(UserRateThrottle):
    def get_rate(self):
        return f'{SiteSettings.load().contact_per_hour}/hour'


# POST /api/contact/  -> saves the message, answers with it.
# CreateAPIView = POST only. Nobody can READ the messages through
# the API - only admins, in the Django admin.
class ContactMessageCreateView(generics.CreateAPIView):
    serializer_class = ContactMessageSerializer

    # Anyone may write to us - you don't need an account to ask
    # "how do I make an account?".
    permission_classes = [AllowAny]
    throttle_classes = [ContactAnonThrottle, ContactUserThrottle]


# ---------------------------------------------------------------
# ADMIN DASHBOARD -> CONTACT INBOX. Admins only.
# ---------------------------------------------------------------


def message_data(message):
    return {
        'id': message.id,
        'name': message.name,
        'email': message.email,
        'subject': message.subject,
        # dict(SUBJECTS) = { 'bug': 'Something is broken', ... }
        'subject_label': dict(SUBJECTS).get(message.subject, message.subject),
        'message': message.message,
        'is_handled': message.is_handled,
        'created_at': message.created_at,
        'reply': message.reply,
        'replied_at': message.replied_at,
        'replied_by': message.replied_by.username if message.replied_by else None,
    }


# GET /api/dashboard/contact/  -> { counts, messages }
class AdminContactListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        messages = ContactMessage.objects.select_related('replied_by')[:300]
        rows = [message_data(message) for message in messages]
        return Response({
            'counts': {
                'new': sum(1 for row in rows if not row['is_handled']),
                'handled': sum(1 for row in rows if row['is_handled']),
            },
            'messages': rows,
        })


# PATCH  /api/dashboard/contact/5/  { is_handled }   -> mark done / not done
# POST   /api/dashboard/contact/5/  { reply }        -> email an answer
# DELETE /api/dashboard/contact/5/
class AdminContactDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        message = get_object_or_404(ContactMessage, pk=pk)
        message.is_handled = request.data.get('is_handled') in (True, 'true')
        message.save()
        return Response(message_data(message))

    def post(self, request, pk):
        message = get_object_or_404(ContactMessage, pk=pk)
        reply = (request.data.get('reply') or '').strip()
        if not reply:
            return Response({'detail': 'Write a reply first.'}, status=400)

        # send_mail(subject, text, from, [to]) - Django's email helper.
        # With the console backend (settings.py) it's printed in the
        # runserver terminal instead of sent.
        send_mail(
            subject=f'Re: {dict(SUBJECTS).get(message.subject, "Your message")}',
            message=f'Hi {message.name},\n\n{reply}\n\n- The Silent Evidence team\n\n'
                    f'--- You wrote: ---\n{message.message}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[message.email],
        )

        message.reply = reply
        message.replied_at = timezone.now()
        message.replied_by = request.user
        message.is_handled = True
        message.save()
        return Response(message_data(message))

    def delete(self, request, pk):
        get_object_or_404(ContactMessage, pk=pk).delete()
        return Response(status=204)
