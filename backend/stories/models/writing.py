# ---------------------------------------------------------------
# WRITERS: co-authors, series, story chains, beta readers, sprints, version history, feedback from Claude.
# Part of stories/models/ - everything is imported in __init__.py,
# so the rest of the site still writes: from stories.models import Story
# ---------------------------------------------------------------
from django.conf import settings
from django.db import models

from .story import Story


# ---------------------------------------------------------------
# CO-AUTHOR INVITE - "please write this story with me".
#
# The story's author invites another user. They accept or decline.
# Accepted = they're a co-author, and their name is shown on the
# story next to the author's.
# ---------------------------------------------------------------
class CoAuthorInvite(models.Model):
    STATUSES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]

    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='invites')
    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invites_sent')
    to_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invites_received')
    status = models.CharField(max_length=10, choices=STATUSES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # You can't invite the same person to the same story twice.
        unique_together = ['story', 'to_user']
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.from_user} invited {self.to_user} to "{self.story}" ({self.status})'


# ---------------------------------------------------------------
# A SERIES - one author's stories that belong together, in order:
# "The Lighthouse Diaries", part 1, part 2, part 3...
# The stories point to it (Story.series + Story.series_part).
# ---------------------------------------------------------------
class Series(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='series')
    title = models.CharField(max_length=150)
    description = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'series'   # not "seriess"

    def __str__(self):
        return self.title


# ---------------------------------------------------------------
# STORY CHAIN - a story the community writes together.
#
# One member starts it (the first ChainPart), then others add the
# next part, one after another. Rules (see stories/chain_views.py):
#   - you can't add two parts in a row (someone else goes between)
#   - max 1500 characters per part
#   - after max_parts parts the chain closes by itself: "The End"
# ---------------------------------------------------------------
class Chain(models.Model):
    title = models.CharField(max_length=120)
    started_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chains_started')
    is_open = models.BooleanField(default=True)
    max_parts = models.PositiveSmallIntegerField(default=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class ChainPart(models.Model):
    chain = models.ForeignKey(Chain, on_delete=models.CASCADE, related_name='parts')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chain_parts')
    body = models.TextField(max_length=1500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']   # the story reads from the start

    def __str__(self):
        return f'{self.chain}: {self.body[:30]}'


# ---------------------------------------------------------------
# BETA READERS - members a writer invited to read a DRAFT, and the
# private feedback they send back (stories/beta_views.py).
# ---------------------------------------------------------------
class BetaReader(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='beta_readers')
    reader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='beta_reads')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['story', 'reader']


class BetaFeedback(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='beta_feedback')
    reader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='beta_feedback')
    body = models.TextField(max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


# ---------------------------------------------------------------
# WRITING SPRINTS - "write as much as you can in 20 minutes".
# The writing itself stays in the browser (it can go on to the Write
# page); Django only keeps the RESULT, for the weekly sprinters
# leaderboard and the Sprinter badge (stories/sprint_views.py).
# ---------------------------------------------------------------
class SprintResult(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sprints')
    words = models.PositiveIntegerField()
    minutes = models.PositiveSmallIntegerField()    # 10, 20 or 30
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


# ---------------------------------------------------------------
# VERSION HISTORY - every time a writer saves an edit, the text as it
# was BEFORE is kept here, so an edit is never lost for good
# (stories/edit_views.py). The newest 30 per story are kept.
# ---------------------------------------------------------------
class StoryVersion(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='versions')
    title = models.CharField(max_length=200)
    excerpt = models.CharField(max_length=300, blank=True)
    body = models.TextField()
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-saved_at', '-id']


# ---------------------------------------------------------------
# PRIVATE FEEDBACK FROM CLAUDE on your own story (the Edit page).
# Kept, so you can read it again - and so we can count the daily
# limit (each request costs a little money). stories/feedback_views.py
# ---------------------------------------------------------------
class WritingFeedback(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='ai_feedback')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_feedback')
    feedback = models.JSONField()   # { overall, strengths: [...], suggestions: [{ area, note }], scares }
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
