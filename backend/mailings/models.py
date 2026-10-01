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


# ---------------------------------------------------------------
# EMAIL LOG - one row for every email the site sends (or tries to).
# Written by our email backend (mailings/backends.py), so EVERY
# email is logged, wherever in the code it's sent from.
# ---------------------------------------------------------------
class EmailLog(models.Model):
    to = models.TextField()                 # "a@x.com, b@y.com"
    subject = models.CharField(max_length=300)
    body = models.TextField(blank=True)     # the first 5000 characters
    success = models.BooleanField(default=True)
    error = models.CharField(max_length=500, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f'{self.subject} -> {self.to}'


# ---------------------------------------------------------------
# EMAIL TEMPLATES - an admin's own wording for an automatic email.
# Only CHANGED templates get a row; the rest use the defaults in
# mailings/email_templates.py. Deleting the row = "reset to default".
# ---------------------------------------------------------------
class EmailTemplate(models.Model):
    key = models.CharField(max_length=50, unique=True)   # 'contact_reply', ...
    subject = models.CharField(max_length=200, blank=True)
    body = models.TextField(max_length=10000)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key
