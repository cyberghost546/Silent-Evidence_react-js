from django.conf import settings
from django.db import models

from stories.models import Story, Comment


# ---------------------------------------------------------------
# The "keeping the site safe" app:
#   Report      - a member says "this story/comment breaks the rules"
#   Appeal      - a writer asks to get their archived story back
#   LoginEvent  - one row per login attempt (for Login Logs and
#                 Security in the Admin Dashboard)
# ---------------------------------------------------------------


# ---------------------------------------------------------------
# REPORT - about ONE story or ONE comment (the other is empty).
# ---------------------------------------------------------------
class Report(models.Model):
    REASONS = [
        ('spam', 'Spam or advertising'),
        ('harassment', 'Harassment or bullying'),
        ('hate', 'Hate speech'),
        ('private_info', "Someone's private information"),
        ('real_violence', 'Encourages real violence or self-harm'),
        ('copyright', 'Copied from someone else'),
        ('wrong_rating', 'Wrong content rating / missing warnings'),
        ('other', 'Something else'),
    ]
    STATUSES = [
        ('open', 'Open'),            # waiting for an admin
        ('resolved', 'Resolved'),    # an admin removed the content
        ('dismissed', 'Dismissed'),  # an admin decided it was fine
    ]

    # SET_NULL: if the reporter deletes their account, keep the report.
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reports_made')

    # Exactly one of these two is filled in (checked in the view).
    story = models.ForeignKey(Story, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')

    reason = models.CharField(max_length=20, choices=REASONS)
    details = models.TextField(max_length=1000, blank=True)

    status = models.CharField(max_length=10, choices=STATUSES, default='open')
    handled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports_handled')
    handled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        target = f'story {self.story_id}' if self.story_id else f'comment {self.comment_id}'
        return f'Report on {target}: {self.reason} ({self.status})'


# ---------------------------------------------------------------
# APPEAL - "please bring back my archived story".
# ---------------------------------------------------------------
class Appeal(models.Model):
    STATUSES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),   # the story is back on the site
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='appeals')
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='appeals')
    message = models.TextField(max_length=1000)

    status = models.CharField(max_length=10, choices=STATUSES, default='pending')
    # The admin's answer, shown to the writer.
    admin_note = models.TextField(max_length=1000, blank=True)
    handled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='appeals_handled')
    handled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Appeal by {self.user} for "{self.story}" ({self.status})'


# ---------------------------------------------------------------
# LOGIN EVENT - written by LogInView for EVERY attempt.
# ---------------------------------------------------------------
class LoginEvent(models.Model):
    # The account, if the login worked (or the name matched someone).
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='login_events')

    # Whatever was typed in the "Email or username" box - also when
    # it matches nobody (that's how you spot someone guessing names).
    username = models.CharField(max_length=150)

    success = models.BooleanField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)   # which browser
    created_at = models.DateTimeField(auto_now_add=True)

    # False = an admin pressed "Unlock" (Security page): this failure
    # no longer counts towards the lock-out. The row itself stays.
    counts_for_lockout = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        # An index makes "failures in the last 15 minutes" fast, even
        # with thousands of rows.
        indexes = [models.Index(fields=['created_at'])]

    def __str__(self):
        result = 'OK' if self.success else 'FAILED'
        return f'{self.username} {result} from {self.ip_address}'
