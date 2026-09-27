from datetime import timedelta

from django.utils import timezone


# ---------------------------------------------------------------
# "Has this person posted too much in the last hour?"
# Used for comments and private messages (limits on the Rate
# Limits page). `recent_items` = THIS user's comments / messages.
#
#     if hourly_limit_reached(request.user, user.comments.all(), 30): ...
#
# Staff are never limited - they may need to post a lot (answers,
# announcements), and they're trusted anyway.
# ---------------------------------------------------------------
def hourly_limit_reached(user, recent_items, limit):
    if user.is_staff:
        return False
    one_hour_ago = timezone.now() - timedelta(hours=1)
    return recent_items.filter(created_at__gte=one_hour_ago).count() >= limit
