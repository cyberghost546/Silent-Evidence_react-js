import json

from django.conf import settings

from .models import PushSubscription


# ---------------------------------------------------------------
# SENDING A PHONE NOTIFICATION (web push).
#
# notify() in notifications.py calls send_push() for every bell
# notification, so a phone gets the same thing: a reply, a new
# follower, a beta read...
#
# Off until the live site has keys (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY -
# make them with:  python manage.py make_push_keys). The keys prove
# to the push services that the notifications really come from us.
# ---------------------------------------------------------------
def push_enabled():
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def send_push(user, text, link):
    if not push_enabled():
        return 0
    # Imported here: only needed when push is switched on.
    from pywebpush import webpush, WebPushException

    payload = json.dumps({'title': 'Silent Evidence', 'body': text, 'link': link})
    sent = 0
    for subscription in PushSubscription.objects.filter(user=user):
        try:
            webpush(
                subscription_info={
                    'endpoint': subscription.endpoint,
                    'keys': {'p256dh': subscription.p256dh, 'auth': subscription.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={'sub': settings.VAPID_CONTACT},
                timeout=4,   # seconds - never hold up the page for long
            )
            sent += 1
        except WebPushException as error:
            # 404 / 410 = that phone switched notifications off or the
            # app was removed: forget the subscription for good.
            status = getattr(error.response, 'status_code', None)
            if status in (404, 410):
                subscription.delete()
        except Exception:
            # A push service that's down must never break the site.
            pass
    return sent
