from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from stories.models import Story, MOODS


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


# ---------------------------------------------------------------
# JUDGED CHALLENGES (sitecontent/judging_views.py)
#
# An admin picks JUDGES for a challenge. After the deadline each
# judge scores every entry 1-10 (plus a private note). Only admins see
# the scores; they announce the winner from the ranked results.
# ---------------------------------------------------------------
class ChallengeJudge(models.Model):
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='judges')
    judge = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='judging')

    class Meta:
        unique_together = ['challenge', 'judge']


class JudgeScore(models.Model):
    entry = models.ForeignKey(ChallengeEntry, on_delete=models.CASCADE, related_name='scores')
    judge = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='judge_scores')
    score = models.PositiveSmallIntegerField()          # 1-10
    note = models.CharField(max_length=500, blank=True)  # private: only admins read it
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['entry', 'judge']   # one score per judge per entry (changing it = updating)


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



# ---------------------------------------------------------------
# MOOD OF THE DAY - one mood per date, picked by admins ahead of
# time. The homepage shows today's, with stories in that mood.
# The moods are the same ones writers pick on Write a Story
# (MOODS in stories/models.py).
# ---------------------------------------------------------------
class MoodOfDay(models.Model):
    date = models.DateField(unique=True)   # one per day
    mood = models.CharField(max_length=20, choices=MOODS)
    # An optional line under the heading: "For the first frost..."
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f'{self.date}: {self.mood}'


# ---------------------------------------------------------------
# FEATURED AUTHORS - writers the admins want to show first in the
# homepage's "Authors to Follow" row. OneToOne: a writer is either
# featured (one row) or not (no row).
# ---------------------------------------------------------------
class FeaturedAuthor(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='featured')
    # One line on their card: "Master of lighthouse horror".
    blurb = models.CharField(max_length=120, blank=True)
    # Lower number = further left in the row.
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'Featured: {self.user}'


# ---------------------------------------------------------------
# STORY SPOTLIGHT - a big banner for one story on the homepage,
# with the admins' own headline, between two dates.
# ---------------------------------------------------------------
class Spotlight(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='spotlights')
    headline = models.CharField(max_length=120)
    blurb = models.CharField(max_length=300, blank=True)
    starts_on = models.DateField()
    ends_on = models.DateField()

    class Meta:
        ordering = ['-starts_on']

    def __str__(self):
        return f'Spotlight: {self.story}'


# ---------------------------------------------------------------
# POLLS - "Which monster scares you most?"
#   Poll        - the question (only ONE is shown on the site: the
#                 newest active one)
#   PollOption  - the answers to pick from
#   PollVote    - who picked what (one vote per member per poll)
# ---------------------------------------------------------------
class Poll(models.Model):
    question = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.question


class PollOption(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name='options')
    text = models.CharField(max_length=100)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.text


class PollVote(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name='votes')
    option = models.ForeignKey(PollOption, on_delete=models.CASCADE, related_name='votes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='poll_votes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One vote per member per poll - the DATABASE refuses a second.
        unique_together = ['poll', 'user']


# ---------------------------------------------------------------
# VIDEOS - horror story readings from YouTube, on the /videos page.
# Admins add them (Dashboard -> Videos) by pasting a YouTube link;
# we only store the video's id ("dQw4w9WgXcQ"), not the whole link.
# story: the site's story being read, if there is one.
# ---------------------------------------------------------------
class Video(models.Model):
    title = models.CharField(max_length=150)
    youtube_id = models.CharField(max_length=20)
    description = models.CharField(max_length=300, blank=True)
    story = models.ForeignKey('stories.Story', on_delete=models.SET_NULL, null=True, blank=True, related_name='videos')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


# ---------------------------------------------------------------
# VILLAIN OF THE WEEK - members nominate the scariest villain from
# the site's stories, and vote. Every week starts fresh on Monday.
#
#   VillainNomination  "The Keeper" (from a story), why, by whom
#   VillainVote        one vote per member per week (can be changed)
#
# The winner of a week = its nomination with the most votes
# (worked out when asked - see sitecontent/villain_views.py).
# ---------------------------------------------------------------
def week_start(day=None):
    # The Monday of the week `day` is in. weekday(): Monday = 0.
    day = day or timezone.localdate()
    return day - timedelta(days=day.weekday())


class VillainNomination(models.Model):
    name = models.CharField(max_length=80)                 # "The Keeper"
    reason = models.CharField(max_length=300, blank=True)  # why they're so scary
    story = models.ForeignKey(Story, on_delete=models.SET_NULL, null=True, blank=True, related_name='villain_nominations')
    nominated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='villain_nominations')
    week = models.DateField(default=week_start)             # the Monday of that week
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        # One nomination per member per week.
        unique_together = ['nominated_by', 'week']

    def __str__(self):
        return f'{self.name} ({self.week})'


class VillainVote(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='villain_votes')
    nomination = models.ForeignKey(VillainNomination, on_delete=models.CASCADE, related_name='votes')
    week = models.DateField(default=week_start)

    class Meta:
        # One vote per member per week (changing it = moving this row).
        unique_together = ['user', 'week']
