from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from .models import ContactMessage
from .serializers import ContactMessageSerializer


# ---------------------------------------------------------------
# SPAM PROTECTION: at most 5 messages an hour.
#
# A "throttle" counts requests. After the limit DRF answers
# 429 Too Many Requests by itself. Two classes because DRF counts
# logged-out visitors (by IP address) and logged-in users (by
# account) separately - and we want a limit on both.
# ---------------------------------------------------------------
class ContactAnonThrottle(AnonRateThrottle):
    rate = '5/hour'


class ContactUserThrottle(UserRateThrottle):
    rate = '5/hour'


# POST /api/contact/  -> saves the message, answers with it.
# CreateAPIView = POST only. Nobody can READ the messages through
# the API - only admins, in the Django admin.
class ContactMessageCreateView(generics.CreateAPIView):
    serializer_class = ContactMessageSerializer

    # Anyone may write to us - you don't need an account to ask
    # "how do I make an account?".
    permission_classes = [AllowAny]
    throttle_classes = [ContactAnonThrottle, ContactUserThrottle]
