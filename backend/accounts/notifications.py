from .models import Block, Notification, get_profile


# Which Settings switch turns off which kind. Kinds that aren't here
# (invite, support) are always sent.
SWITCH_FOR_KIND = {
    'like': 'notify_likes',
    'comment': 'notify_comments',
    'reply': 'notify_comments',
    'forum': 'notify_comments',
    'chain': 'notify_comments',
    'follow': 'notify_follows',
}


# ---------------------------------------------------------------
# notify() - send someone a notification (the bell in the header).
#
#   notify(story.author, request.user, 'like',
#          f'{request.user.username} liked your story "{story.title}"',
#          f'/stories/{story.id}')
#
# It quietly does NOTHING when:
#   - you'd be notifying yourself (liking your own story)
#   - the recipient blocked the person who did it
#   - the recipient switched this kind off (Settings -> Notifications)
#   - the exact same notification is still unread (like -> unlike ->
#     like again shouldn't pile up three "liked your story" rows)
#
# To add a new kind: add it to Notification.KINDS (accounts/models.py)
# and an icon in NotificationItem.jsx, then call notify() in the view.
# ---------------------------------------------------------------
def notify(recipient, actor, kind, text, link):
    if recipient is None or recipient == actor:
        return None
    if actor is not None and Block.objects.filter(blocker=recipient, blocked=actor).exists():
        return None
    switch = SWITCH_FOR_KIND.get(kind)
    # getattr(profile, 'notify_likes') = profile.notify_likes, with the
    # field name coming from the dictionary above.
    if switch and not getattr(get_profile(recipient), switch):
        return None
    if Notification.objects.filter(recipient=recipient, actor=actor, kind=kind, link=link, is_read=False).exists():
        return None
    return Notification.objects.create(recipient=recipient, actor=actor, kind=kind, text=text[:300], link=link[:200])


# "The House on Wren Street That Nobody Visits Anymore" -> shortened,
# so notifications stay one or two lines.
def short_title(title, length=50):
    return title if len(title) <= length else title[:length - 1].rstrip() + '…'
