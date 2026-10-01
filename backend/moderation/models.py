from django.conf import settings
from django.db import models
from django.utils import timezone

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

    # Exactly ONE of these is filled in (checked in the view): what
    # was reported. (TARGETS in moderation/views.py lists them.)
    story = models.ForeignKey(Story, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    chat_message = models.ForeignKey('stories.ReadAlongMessage', on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    reading_list = models.ForeignKey('stories.ReadingList', on_delete=models.CASCADE, null=True, blank=True, related_name='reports')

    reason = models.CharField(max_length=20, choices=REASONS)
    details = models.TextField(max_length=1000, blank=True)

    status = models.CharField(max_length=10, choices=STATUSES, default='open')
    handled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports_handled')
    handled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Report #{self.id}: {self.reason} ({self.status})'


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


# ---------------------------------------------------------------
# CONTENT FILTER - words that aren't allowed.
#   block = the comment / story / Last Word is refused
#   flag  = it's saved, but admins get a report about it
# Checked in moderation/content_filter.py.
# ---------------------------------------------------------------
class BannedWord(models.Model):
    ACTIONS = [
        ('block', 'Block it'),
        ('flag', 'Allow, but flag for review'),
    ]
    # Saved in lower case, so "Spam" and "spam" are the same word.
    word = models.CharField(max_length=100, unique=True)
    action = models.CharField(max_length=10, choices=ACTIONS, default='block')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['word']

    def save(self, *args, **kwargs):
        # save() runs every time the row is saved - the one place to
        # tidy the value, whoever saves it (API, admin, shell).
        self.word = self.word.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.word} ({self.action})'


# ---------------------------------------------------------------
# VERIFICATION - a member asks for the blue check mark.
# Approving sets Profile.is_verified (accounts/models.py).
# ---------------------------------------------------------------
class VerificationRequest(models.Model):
    STATUSES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='verification_requests')
    # Why they should be verified (published author, podcast host...).
    reason = models.TextField(max_length=1000)
    # Somewhere we can check it: a website, a social media profile.
    proof_url = models.URLField(blank=True)
    status = models.CharField(max_length=10, choices=STATUSES, default='pending')
    admin_note = models.TextField(max_length=1000, blank=True)
    handled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    handled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Verification for {self.user} ({self.status})'


# ---------------------------------------------------------------
# WARNINGS & BANS
#
# A warning is a message from the moderators. The member sees it
# the next time they visit, and must press "I understand".
#
# A ban stops someone from logging in, until `until` (or forever
# when `until` is empty). "Lifting" a ban ends it early.
# While a ban is active the account is also set to is_active=False,
# which logs them out everywhere - Django refuses inactive accounts.
# ---------------------------------------------------------------
class UserWarning(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='warnings_received')
    message = models.TextField(max_length=2000)
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    # Empty until the member pressed "I understand".
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Warning for {self.user}'


class Ban(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bans')
    reason = models.TextField(max_length=2000)
    # null = permanent.
    until = models.DateTimeField(null=True, blank=True)
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    # Set when an admin ends it early.
    lifted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Ban for {self.user}'

    # "Is this ban still running?" - not lifted, and not past `until`.
    def is_active(self):
        if self.lifted_at:
            return False
        return self.until is None or self.until > timezone.now()


# ---------------------------------------------------------------
# AI TOXICITY QUEUE - Claude's opinion about one comment.
# Made by the "Scan comments" button (dashboard/toxicity_views.py).
# One row per comment, so a comment is never scanned (and paid
# for) twice.
# ---------------------------------------------------------------
class ToxicityCheck(models.Model):
    STATUSES = [
        ('clean', 'Looks fine'),         # low score - nothing to do
        ('flagged', 'Waiting for review'),
        ('hidden', 'Hidden by an admin'),
        ('approved', 'Approved by an admin'),
    ]

    comment = models.OneToOneField(Comment, on_delete=models.CASCADE, related_name='toxicity')
    score = models.PositiveSmallIntegerField()        # 0 = friendly ... 100 = very toxic
    category = models.CharField(max_length=20)        # 'harassment', 'hate', 'none', ...
    reason = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=10, choices=STATUSES)
    checked_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-score', '-checked_at']

    def __str__(self):
        return f'{self.comment_id}: {self.score} ({self.status})'
