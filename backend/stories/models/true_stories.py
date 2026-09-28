# ---------------------------------------------------------------
# TRUE STORIES shared anonymously.
# Part of stories/models/ - everything is imported in __init__.py,
# so the rest of the site still writes: from stories.models import Story
# ---------------------------------------------------------------
from django.conf import settings
from django.db import models

from categories.models import Category

from .story import Story


# ---------------------------------------------------------------
# TRUE STORIES - "this really happened to me", shared ANONYMOUSLY.
#
# 1. A member sends a TrueStorySubmission (/true-stories/submit).
# 2. An admin reads it (/dashboard/true-stories) and approves or
#    rejects it.
# 3. Approved -> a normal Story is made, written by the shared
#    "Anonymous" account and tagged "true-story". The real sender
#    is ONLY kept here, on the submission, which only admins see.
#
# Why a separate Anonymous account instead of hiding the author
# name? The author shows up in LOTS of places (cards, profile links,
# notifications, feeds, search...). One fake author can't leak the
# real name through a place we forgot.
# ---------------------------------------------------------------
ANONYMOUS_USERNAME = 'Anonymous'


TRUE_STORY_TAG = 'true-story'


def anonymous_author():
    from django.contrib.auth import get_user_model
    user, created = get_user_model().objects.get_or_create(
        username=ANONYMOUS_USERNAME,
        # is_active=False: nobody can ever log in as Anonymous.
        defaults={'is_active': False},
    )
    if created:
        user.set_unusable_password()
        user.save()
    return user


class TrueStorySubmission(models.Model):
    STATUSES = [
        ('pending', 'Waiting for review'),
        ('approved', 'Published'),
        ('rejected', 'Not published'),
    ]

    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='true_story_submissions')
    title = models.CharField(max_length=200)
    body = models.TextField(max_length=20000)
    where_when = models.CharField(max_length=200, blank=True)   # "Ohio, summer 2009"
    # A pin for the Haunted Map - BLURRED to about 1 km when it's saved
    # (blur_place in true_story_views.py), so an anonymous story can't
    # point at someone's house.
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUSES, default='pending')
    admin_note = models.CharField(max_length=300, blank=True)   # why it was rejected
    story = models.OneToOneField(Story, on_delete=models.SET_NULL, null=True, blank=True, related_name='true_story_submission')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.status})'
