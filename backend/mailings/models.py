from django.conf import settings
from django.db import models


# ---------------------------------------------------------------
# MAILINGS - emails sent to many members at once.
#   Newsletter  - written by an admin, sent to everyone who has the
#                 Weekly Horror Digest switched on (Settings)
#   DigestRun   - a record of each Comment Digest send-out
# Both are kept as history, so admins can see what went out when.
# ---------------------------------------------------------------

class Newsletter(models.Model):
    subject = models.CharField(max_length=150)
    body = models.TextField(max_length=20000)
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='newsletters_sent')
    recipient_count = models.PositiveIntegerField(default=0)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return self.subject


class DigestRun(models.Model):
    PERIODS = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
    ]
    period = models.CharField(max_length=10, choices=PERIODS)
    emails_sent = models.PositiveIntegerField(default=0)
    # Who pressed "Send now" - empty when the scheduled command ran it.
    started_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f'{self.period} digest, {self.emails_sent} emails'
