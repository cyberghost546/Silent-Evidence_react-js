from django.conf import settings
from django.db import models


# ---------------------------------------------------------------
# MESSAGE - one private message from one user to another.
#
# There's no separate "Conversation" table. A conversation between
# you and Bob is simply "every message where (you -> Bob) OR
# (Bob -> you)", sorted by time. Simple, and enough for a small site.
#
# Two ForeignKeys to the same User table, so each needs its own
# related_name (same as Follow in accounts/models.py):
#   user.messages_sent.all()      -> what I sent
#   user.messages_received.all()  -> what was sent to me
# ---------------------------------------------------------------
class Message(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages_sent')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages_received')
    body = models.TextField(max_length=2000)

    # False until the recipient opens the conversation. Used for the
    # "2 unread" counts.
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Oldest first - the way a chat reads, top to bottom.
        ordering = ['created_at']

    def __str__(self):
        return f'{self.sender} -> {self.recipient}: {self.body[:30]}'
