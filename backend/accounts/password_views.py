from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from mailings.email_templates import render_email


# ---------------------------------------------------------------
# "FORGOT PASSWORD?"
#
# 1. POST /api/accounts/password-reset/  { email }
#    -> we email a link:  SITE_URL/reset-password/<uid>/<token>
# 2. The React page on that link asks for a new password and sends
#    POST /api/accounts/password-reset/confirm/  { uid, token, password }
#
# uid   = the user's id, written in a URL-safe way (base64).
# token = Django's default_token_generator: a code made from the user's
#         CURRENT password + last login + a secret. So it stops working
#         by itself once the password changes (the link works ONCE),
#         and after PASSWORD_RESET_TIMEOUT (3 days by default).
#         We don't have to store anything - Django can re-check it.
# ---------------------------------------------------------------

# The same answer whether the email exists or not - otherwise anyone
# could type addresses and find out who has an account here.
SENT_MESSAGE = 'If an account uses that email, we sent it a link to reset the password. Check your inbox (and spam folder).'


# Max 5 reset emails per hour from one IP - stops someone from
# flooding a person's inbox.
class PasswordResetThrottle(AnonRateThrottle):
    scope = 'password_reset'   # its own counter (see SignUpThrottle)
    rate = '5/hour'


def user_from_uid(uid):
    # Returns the user, or None if the uid is garbage / unknown.
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        return get_user_model().objects.get(pk=user_id)
    except (ValueError, TypeError, OverflowError, get_user_model().DoesNotExist):
        return None


# Used by this file AND by email verification (email_views.py):
# "uid + token" for a user, in the shape our React links use.
def uid_and_token(user):
    return urlsafe_base64_encode(force_bytes(user.pk)), default_token_generator.make_token(user)


class PasswordResetRequestView(APIView):
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        if not email:
            return Response({'email': ['Enter your email address.']}, status=400)

        user = get_user_model().objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid, token = uid_and_token(user)
            subject, body = render_email(
                'password_reset',
                username=user.username,
                link=f'{settings.SITE_URL}/reset-password/{uid}/{token}',
            )
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)

        return Response({'detail': SENT_MESSAGE})


class PasswordResetConfirmView(APIView):
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        user = user_from_uid(request.data.get('uid') or '')
        token = request.data.get('token') or ''
        if user is None or not default_token_generator.check_token(user, token):
            return Response({'detail': 'This link is not valid any more. Ask for a new one.'}, status=400)

        password = request.data.get('password') or ''
        # Same rules as sign-up: long enough, not too common, not
        # too close to the username...
        try:
            validate_password(password, user)
        except ValidationError as problem:
            return Response({'password': list(problem.messages)}, status=400)

        user.set_password(password)
        user.save()
        return Response({'detail': 'Your password was changed. You can log in now.'})
