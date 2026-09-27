from .models import Block, Notification


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
#   - the exact same notification is still unread (like -> unlike ->
#     like again shouldn't pile up three "liked your story" rows)
#
# To add a new kind: add it to Notification.KINDS (accounts/models.py)
# and an icon in NotificationMenu.jsx, then call notify() in the view.
# ---------------------------------------------------------------
def notify(recipient, actor, kind, text, link):
    if recipient is None or recipient == actor:
        return None
    if actor is not None and Block.objects.filter(blocker=recipient, blocked=actor).exists():
        return None
    if Notification.objects.filter(recipient=recipient, actor=actor, kind=kind, link=link, is_read=False).exists():
        return None
    return Notification.objects.create(recipient=recipient, actor=actor, kind=kind, text=text[:300], link=link[:200])


# "The House on Wren Street That Nobody Visits Anymore" -> shortened,
# so notifications stay one or two lines.
def short_title(title, length=50):
    return title if len(title) <= length else title[:length - 1].rstrip() + '…'
