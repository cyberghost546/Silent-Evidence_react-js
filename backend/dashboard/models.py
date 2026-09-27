from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


# ---------------------------------------------------------------
# SITE SETTINGS - ONE row for the whole site (a "singleton").
#
# Two admin pages edit this same row:
#   - Site Settings: maintenance mode, sign-ups open/closed, contact email
#   - Rate Limits:   how many logins / messages / comments are allowed
#
# Always read it with SiteSettings.load() - it makes the row the
# first time, with the defaults below. So a brand-new site works
# before anyone opens the settings page.
# ---------------------------------------------------------------
class SiteSettings(models.Model):
    # --- Site Settings page ---
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.CharField(max_length=300, default="We're doing some work on the site. Back soon!")
    signups_open = models.BooleanField(default=True)
    contact_email = models.EmailField(blank=True)

    # --- Rate Limits page ---
    # MinValueValidator(1): 0 would lock everybody out.
    login_max_per_username = models.PositiveIntegerField(default=5, validators=[MinValueValidator(1)])
    login_max_per_ip = models.PositiveIntegerField(default=10, validators=[MinValueValidator(1)])
    login_lock_minutes = models.PositiveIntegerField(default=15, validators=[MinValueValidator(1)])
    contact_per_hour = models.PositiveIntegerField(default=5, validators=[MinValueValidator(1)])
    comments_per_hour = models.PositiveIntegerField(default=30, validators=[MinValueValidator(1)])
    messages_per_hour = models.PositiveIntegerField(default=60, validators=[MinValueValidator(1)])

    # --- SEO Dashboard page ---
    # site_title: the browser-tab name ("Story title · Silent Evidence").
    # site_description: the short text Google may show under the link.
    # allow_indexing off = robots.txt tells search engines "stay out"
    # (handy while the site is still a test site).
    site_title = models.CharField(max_length=70, default='Silent Evidence')
    site_description = models.CharField(max_length=160, default='A community for horror story readers and writers.')
    allow_indexing = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'site settings'

    # get_or_create(pk=1): "give me row 1, make it if it's missing".
    @classmethod
    def load(cls):
        row, _ = cls.objects.get_or_create(pk=1)
        return row

    def __str__(self):
        return 'Site settings'


# ---------------------------------------------------------------
# IP BLOCKLIST - requests from these addresses get a 403 on every
# page (dashboard/middleware.py checks each request).
# ---------------------------------------------------------------
class BlockedIP(models.Model):
    ip_address = models.GenericIPAddressField(unique=True)
    reason = models.CharField(max_length=200, blank=True)
    blocked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.ip_address


# ---------------------------------------------------------------
# AUDIT LOG - one row per change an admin made in the dashboard.
# Nobody writes these by hand: AuditLogMiddleware saves one for every
# POST / PATCH / PUT / DELETE to /api/dashboard/... by a staff member.
# ---------------------------------------------------------------
class AuditEntry(models.Model):
    # SET_NULL + a copy of the name: the log survives if the admin
    # account is deleted later.
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    username = models.CharField(max_length=150)
    action = models.CharField(max_length=200)        # "Deleted polls #4"
    method = models.CharField(max_length=10)         # POST, PATCH...
    path = models.CharField(max_length=300)
    details = models.JSONField(default=dict, blank=True)  # what was sent (passwords removed)
    status_code = models.PositiveSmallIntegerField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.username}: {self.action}'


# ---------------------------------------------------------------
# ERROR LOG - crashes, so admins find out before members complain.
#
#   source 'frontend' = a React page broke in someone's browser
#                       (sent by ErrorBoundary.jsx / reportError())
#   source 'backend'  = Django crashed with an error 500
#                       (saved by ErrorLogMiddleware)
#
# The same error again doesn't make a new row: `count` goes up and
# `last_seen` moves (otherwise one bug could fill the table).
# ---------------------------------------------------------------
class ErrorReport(models.Model):
    SOURCES = [('frontend', 'Browser (React)'), ('backend', 'Server (Django)')]

    source = models.CharField(max_length=10, choices=SOURCES)
    message = models.CharField(max_length=300)
    details = models.TextField(blank=True)          # the "stack trace": where in the code
    url = models.CharField(max_length=300, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    user_agent = models.CharField(max_length=300, blank=True)
    count = models.PositiveIntegerField(default=1)
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_seen']

    def __str__(self):
        return f'[{self.source}] {self.message}'
