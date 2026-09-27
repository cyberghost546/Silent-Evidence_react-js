from django.conf import settings
from django.db import models
from django.utils import timezone

from stories.models import Story


# ---------------------------------------------------------------
# SITE CONTENT - things admins create for the whole site, from the
# Admin Dashboard:
#   Announcement   - the banner at the top of every page
#   WritingPrompt  - story ideas on the Write a Story page
#   Challenge      - a writing contest (+ ChallengeEntry)
#   Bundle         - a hand-picked collection of stories
# ---------------------------------------------------------------


class Announcement(models.Model):
    # The colour of the banner: info = blue, warning = amber,
    # event = red. React has the matching Tailwind classes.
    STYLES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('event', 'Event'),
    ]

    message = models.CharField(max_length=300)
    # Optional "Read more" link, e.g. /challenges or a full URL.
    link_url = models.CharField(max_length=300, blank=True)
    link_label = models.CharField(max_length=50, blank=True)
    style = models.CharField(max_length=10, choices=STYLES, default='info')

    # Only ONE is shown at a time: the newest active one.
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.message[:60]


class WritingPrompt(models.Model):
    text = models.CharField(max_length=300)
    # Switched off prompts stay in the list but aren't shown.
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.text[:60]


class Challenge(models.Model):
    title = models.CharField(max_length=150)
    theme = models.TextField(max_length=1000)   # the brief: what to write about
    # Writers can enter until this moment.
    deadline = models.DateTimeField()
    # Set by an admin after the deadline. SET_NULL: deleting the
    # winning story doesn't delete the whole challenge.
    winner = models.ForeignKey(Story, on_delete=models.SET_NULL, null=True, blank=True, related_name='challenges_won')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-deadline']

    def __str__(self):
        return self.title

    # A method, so views and the admin can ask challenge.is_open().
    def is_open(self):
        return timezone.now() < self.deadline


class ChallengeEntry(models.Model):
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='entries')
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='challenge_entries')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # The same story can't enter the same challenge twice.
        unique_together = ['challenge', 'story']
        ordering = ['created_at']
        verbose_name_plural = 'challenge entries'

    def __str__(self):
        return f'{self.story} in {self.challenge}'


class Bundle(models.Model):
    title = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)    # the URL: /bundles/best-haunted-houses
    description = models.TextField(max_length=1000, blank=True)

    # ManyToManyField = "many stories in a bundle, and a story can be in
    # many bundles". Django makes a hidden in-between table for it.
    #   bundle.stories.all()       -> the stories in this bundle
    #   story.bundles.all()        -> the bundles a story is in
    stories = models.ManyToManyField(Story, blank=True, related_name='bundles')

    # Only published bundles are shown on the site.
    is_published = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='bundles_made')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


# ---------------------------------------------------------------
# COOKIE CONSENT
#
# CookieBanner: the banner's settings. There's only ever ONE row
# (see CookieBanner.load() - "get it, or make it the first time").
# CookieConsent: one row per visitor's choice, to count them.
# No names or IPs are stored - just the choice and when.
# ---------------------------------------------------------------
class CookieBanner(models.Model):
    is_enabled = models.BooleanField(default=True)
    message = models.TextField(
        max_length=1000,
        default='We use cookies to keep you logged in and to keep the site secure. '
                'No advertising or tracking cookies.',
    )
    updated_at = models.DateTimeField(auto_now=True)

    # A "classmethod" is called on the class itself: CookieBanner.load()
    @classmethod
    def load(cls):
        banner, _ = cls.objects.get_or_create(pk=1)
        return banner

    def __str__(self):
        return 'Cookie banner'


class CookieConsent(models.Model):
    CHOICES = [
        ('all', 'Accepted all'),
        ('essential', 'Essential only'),
    ]
    choice = models.CharField(max_length=10, choices=CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.choice
