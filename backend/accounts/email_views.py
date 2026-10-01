from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from mailings.email_templates import render_email
from .models import get_profile
from .password_views import user_from_uid


# ---------------------------------------------------------------
# "CONFIRM YOUR EMAIL"
#
# After signing up we email a link: SITE_URL/verify-email/<uid>/<token>.
# Clicking it opens VerifyEmail.jsx, which sends
#   POST /api/accounts/verify-email/  { uid, token }
# and Django marks the profile as email_verified.
#
# Why our own token generator? Django's default one (used for password
# reset) changes when you log in - and sign-up logs you in straight
# away, so its link would be dead before you even opened the email.
# Ours is built from things that DON'T change on login: the user id,
# the email address, and "verified yet?" (so each link works once).
# ---------------------------------------------------------------
class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    # A different "salt" = these tokens can never be used as password
    # reset tokens, or the other way round.
    key_salt = 'silent-evidence.email-verification'

    def _make_hash_value(self, user, timestamp):
        return f'{user.pk}{user.email}{get_profile(user).email_verified}{timestamp}'


email_token_generator = EmailVerificationTokenGenerator()


def send_verification_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_token_generator.make_token(user)
    subject, body = render_email(
        'verify_email',
        username=user.username,
        link=f'{settings.SITE_URL}/verify-email/{uid}/{token}',
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)


# POST /api/accounts/verify-email/  { uid, token }  - no login needed
# (you might open the email on your phone, where you're not logged in).
class VerifyEmailView(APIView):
    def post(self, request):
        user = user_from_uid(request.data.get('uid') or '')
        token = request.data.get('token') or ''
        if user is None:
            return Response({'detail': 'This link is not valid.'}, status=400)

        profile = get_profile(user)
        if profile.email_verified:
            # Clicking the link twice is fine - same happy answer.
            # (In development React also runs the page's effect twice,
            # so the second request always lands here.)
            return Response({'detail': 'Thanks - your email address is confirmed!'})
        if not email_token_generator.check_token(user, token):
            return Response({'detail': 'This link is not valid any more. Send yourself a new one from the banner at the top of the site.'}, status=400)

        profile.email_verified = True
        profile.save(update_fields=['email_verified'])
        return Response({'detail': 'Thanks - your email address is confirmed!'})


# Max 3 "send it again" emails per hour per member.
class ResendVerificationThrottle(UserRateThrottle):
    scope = 'resend_verification'   # its own counter (see SignUpThrottle)
    rate = '3/hour'


# POST /api/accounts/verify-email/resend/  - the button in the banner.
class ResendVerificationView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ResendVerificationThrottle]

    def post(self, request):
        if get_profile(request.user).email_verified:
            return Response({'detail': 'Your email address is already confirmed.'})
        send_verification_email(request.user)
        return Response({'detail': f'Sent! Check {request.user.email} (and the spam folder).'})
