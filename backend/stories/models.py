import re

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from accounts.models import Follow, Block, get_profile
from categories.models import Category


# ---------------------------------------------------------------
# TAGS - short labels writers add to a story ("lighthouse", "vhs",
# "cursed-object"). Search finds stories by tag, and admins tidy
# them up on Admin Dashboard -> Tag Manager.
#
# Defined ABOVE Story because Story points at it (ManyToManyField).
# ---------------------------------------------------------------
class Tag(models.Model):
    # Always lower case, so "VHS" and "vhs" are one tag (see save()).
    name = models.CharField(max_length=30, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        self.name = self.name.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ---------------------------------------------------------------
# CHOICES for the Write a Story page.
#
# Each pair is (what's saved in the database, what a human reads).
# The React page (WriteStory/storyOptions.js) has the same lists -
# if you add one here, add it there too.
# ---------------------------------------------------------------
CONTENT_RATINGS = [
    ('all', 'All Ages'),
    ('teen', '13+ Teen'),
    ('mature', '18+ Mature'),
]

MOODS = [
    ('creepy', 'Creepy'),
    ('sad', 'Sad'),
    ('mysterious', 'Mysterious'),
    ('terrifying', 'Terrifying'),
    ('unsettling', 'Unsettling'),
    ('shocking', 'Shocking'),
]


class Story(models.Model):
    title = models.CharField(max_length=200)

    # The one-line teaser shown on cards under the title.
    excerpt = models.CharField(max_length=300, blank=True)

    body = models.TextField()

    # blank=True: a story without a picture is allowed - the card
    # shows a dark placeholder instead.
    cover_image = models.ImageField(upload_to='stories/', blank=True)

    # ForeignKey = "this story belongs to ONE category" (a link to a
    # row in another table).
    # on_delete=SET_NULL: if the category is deleted, keep the story
    # and just leave its category empty (that's why null=True).
    # related_name='stories' lets you go backwards: category.stories.all()
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stories',
    )

    # settings.AUTH_USER_MODEL instead of importing User directly -
    # Django's recommended way, so it still works if you ever swap in
    # a custom user model.
    # on_delete=CASCADE: delete the user -> their stories go too.
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stories',
    )

    # Drafts stay hidden from the site until this is ticked.
    is_published = models.BooleanField(default=False)

    # ARCHIVED = taken off the site by an admin (Admin Dashboard ->
    # Stories), but NOT deleted - it can be brought back any time.
    # An archived story is hidden even when is_published is ticked.
    is_archived = models.BooleanField(default=False)

    # --- Extra fields from the Write a Story page ---
    # All of them are optional (blank=True / null=True / a default),
    # so the stories that already exist are still valid.

    # A language code like 'en' or 'es'.
    language = models.CharField(max_length=10, default='en')

    # A picture from another website, for when the author pastes a
    # link instead of uploading a file. The serializer sends this as
    # cover_image when there's no uploaded file.
    cover_image_url = models.URLField(blank=True)

    video_url = models.URLField(blank=True)
    audio_url = models.URLField(blank=True)
    # The writer's OWN recording, uploaded on the Write page (max 25 MB,
    # mp3 / m4a / ogg / wav - checked in StoryCreateSerializer).
    audio_file = models.FileField(upload_to='audio/', blank=True)

    # Where it happened. DecimalField keeps exact numbers - 6 decimal
    # places is about 10 cm, more than enough for a map pin.
    location = models.CharField(max_length=200, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # choices= limits what can be saved to the lists at the top.
    mood = models.CharField(max_length=20, choices=MOODS, blank=True)
    content_rating = models.CharField(max_length=10, choices=CONTENT_RATINGS, default='all')

    # The ticked warnings, saved as one string: "Violence,Gore".
    # Simple, and good enough until we need to search by warning.
    content_warnings = models.CharField(max_length=300, blank=True)

    # Many tags per story, and many stories per tag:
    #   story.tags.all()   /   tag.stories.all()
    tags = models.ManyToManyField(Tag, blank=True, related_name='stories')

    # SERIES: "Part 2 of The Lighthouse Diaries". 'Series' in quotes
    # because the Series class is written further down this file.
    # SET_NULL: deleting a series keeps its stories (they just stop
    # being "part N of" anything).
    series = models.ForeignKey('Series', on_delete=models.SET_NULL, null=True, blank=True, related_name='parts')
    series_part = models.PositiveSmallIntegerField(null=True, blank=True)   # 1, 2, 3...

    # FEAR METER: readers rate 1-5 skulls (FearRating). We keep the
    # running total here, so cards and "sort by scariest" don't have
    # to count every rating again for every story.
    fear_total = models.PositiveIntegerField(default=0)   # all the skulls added up
    fear_votes = models.PositiveIntegerField(default=0)   # how many ratings

    @property
    def fear_average(self):
        # 3 ratings of 5, 4 and 3 skulls -> 12 / 3 = 4.0
        return round(self.fear_total / self.fear_votes, 1) if self.fear_votes else None

    # Empty = show it straight away. A date = stay hidden until then
    # (see published_stories() below).
    publish_at = models.DateTimeField(null=True, blank=True)

    # The homepage picks. Tick these in the admin to choose the
    # Story of the Day / Week. If more than one is ticked, the most
    # recently edited one wins (see views.py).
    is_story_of_the_day = models.BooleanField(default=False)
    is_story_of_the_week = models.BooleanField(default=False)

    # How many times the story page was opened. Goes up by one in
    # StoryDetailView, and "Popular" sorts by it.
    # PositiveIntegerField = a whole number that can't go below 0.
    views = models.PositiveIntegerField(default=0)

    # auto_now_add = set once, when the row is created.
    # auto_now     = updated every time the row is saved.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        # Otherwise the admin would say "Storys".
        verbose_name_plural = 'stories'

    def __str__(self):
        return self.title

    # Normal Python methods on the model. The serializer can send their
    # results to React like any other field.
    def word_count(self):
        # .split() cuts the text at spaces -> a list of words.
        # "!!scare" (a jump-scare mark, see utils/storyFormat.js in
        # React) isn't a word the reader sees, so it doesn't count.
        # Choose-your-path marks ([[section: x]], [[choice: ... -> x]])
        # aren't read either - take those lines out first.
        text = re.sub(r'^\s*\[\[(section|choice):[^\]]*\]\]\s*$', '', self.body, flags=re.MULTILINE | re.IGNORECASE)
        return len([word for word in text.split() if word.lower() != '!!scare'])

    # wpm = "words per minute". The average reader does about 238.
    # The serializer passes a different number for people who picked
    # Slow or Fast on the Settings page (see READING_WPM below).
    # max(1, ...) so a very short story says "1 min read", not "0".
    def reading_time(self, wpm=238):
        return max(1, round(self.word_count() / wpm))


# Settings page "Reading Speed" -> words per minute.
# The labels on that page ("~150 wpm") use the same numbers.
READING_WPM = {
    'slow': 150,
    'average': 238,
    'fast': 350,
}


# ---------------------------------------------------------------
# "Which stories can the public see?" - asked in lots of views, so
# the answer lives in ONE place. A story is visible when:
#   - it's published, AND
#   - an admin hasn't archived it, AND
#   - it has no publish date, or that date has already passed.
#
# Q(...) | Q(...) means OR. (A normal .filter(a, b) means AND.)
# ---------------------------------------------------------------
def published_stories():
    return Story.objects.filter(is_published=True, is_archived=False).filter(
        Q(publish_at__isnull=True) | Q(publish_at__lte=timezone.now())
    )


# ---------------------------------------------------------------
# LIKES AND SAVES
#
# Both are just "this user <-> this story" - a row exists, or it
# doesn't. Liking = create the row, unliking = delete it.
#
# unique_together: the database refuses a second row for the same
# user + story, so nobody can like the same story twice - even if
# they double-click, or call the API by hand.
# ---------------------------------------------------------------
class Like(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes')
    # related_name='likes' is what makes story.likes.count() work.
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'story']

    def __str__(self):
        return f'{self.user} likes {self.story}'


# "Save" in the story's Actions menu - a bookmark to read later.
class Bookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookmarks')
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'story']

    def __str__(self):
        return f'{self.user} saved {self.story}'


class Comment(models.Model):
    # on_delete=CASCADE on both: delete the story (or the user) and
    # their comments go with it.
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')

    # max_length on a TextField isn't enforced by the database, but
    # the serializer (and the admin form) respect it.
    body = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    # A REPLY points to the comment it answers; a normal comment has
    # parent = None. Only ONE level deep: a reply to a reply is saved
    # under the same top comment (CommentListView takes care of that),
    # so threads never get squashed into a narrow staircase.
    # 'self' = a link to another row of this same table.
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')

    # Hidden by an admin (Admin Dashboard -> Moderation or Reports).
    # Hidden = not shown on the site, but not deleted.
    is_hidden = models.BooleanField(default=False)

    class Meta:
        # Newest comments first.
        ordering = ['-created_at']

    def __str__(self):
        # The first 40 characters, so the admin list stays readable.
        return f'{self.author}: {self.body[:40]}'


# ---------------------------------------------------------------
# LAST WORDS - the short-quote wall at the bottom of the homepage.
# Like a tweet: one user, up to 280 characters.
# ---------------------------------------------------------------
LAST_WORDS_MAX = 280


class LastWord(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='last_words')

    # CharField (not TextField) because the database really enforces
    # max_length on a CharField.
    body = models.CharField(max_length=LAST_WORDS_MAX)
    created_at = models.DateTimeField(auto_now_add=True)

    # Hidden by an admin (Admin Dashboard -> Moderation).
    is_hidden = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.author}: {self.body[:40]}'


# ---------------------------------------------------------------
# "Which stories can THIS person see?"
#
# published_stories() above is the same for everyone. This one also
# looks at WHO is asking, and uses their Settings page choices:
#
#   1. Age & Content Access - hide stories rated above your level
#   2. Blocked Users        - hide stories by people you blocked
#   3. Private profiles     - their stories are for their followers
#                             only (and themselves, of course)
#
# Usage in a view:
#   stories = stories_for(request.user)
# ---------------------------------------------------------------

# Which ratings each access level may read.
ALLOWED_RATINGS = {
    'all': ['all'],
    'teen': ['all', 'teen'],
    'mature': ['all', 'teen', 'mature'],
}


def stories_for(user):
    stories = published_stories()

    # "Written by someone with a private profile". author__profile =
    # follow the author to their Profile row.
    by_private_author = Q(author__profile__is_private=True)

    # Logged out: no settings, no follows - just hide private ones.
    if not user.is_authenticated:
        return stories.exclude(by_private_author)

    # 1. Content rating. content_rating__in = "is one of these".
    level = get_profile(user).content_access
    stories = stories.filter(content_rating__in=ALLOWED_RATINGS[level])

    # 2. Blocked authors. .values('blocked_id') is a list of ids that
    # Django turns into a sub-query - no extra trip to the database.
    blocked_ids = Block.objects.filter(blocker=user).values('blocked_id')
    stories = stories.exclude(author__in=blocked_ids)

    # 3. Private authors: hide them UNLESS it's me or someone I follow.
    # ~Q(...) means NOT.
    followed_ids = Follow.objects.filter(follower=user).values('following_id')
    stories = stories.exclude(by_private_author & ~Q(author=user) & ~Q(author__in=followed_ids))

    return stories


# How fast does this user read? (For reading_time above.)
# Logged out -> the average.
def wpm_for(user):
    if not user.is_authenticated:
        return READING_WPM['average']
    return READING_WPM[get_profile(user).reading_speed]


# ---------------------------------------------------------------
# READING HISTORY - "this user opened this story".
#
# ONE row per user + story (unique_together). Reading the same
# story again doesn't add a second row - it just moves last_read_at
# to now, so the story jumps back to the top of your history.
#
# auto_now=True = "set to now every time the row is saved".
# ---------------------------------------------------------------
class ReadingHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reading_history')
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='readers')
    last_read_at = models.DateTimeField(auto_now=True)
    # CONTINUE READING: how far down the story you got, 0-100 (percent).
    # The story page saves it while you read (ReadingProgressView).
    progress = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = ['user', 'story']
        ordering = ['-last_read_at']
        # The admin would otherwise call it "Reading historys".
        verbose_name_plural = 'reading history'

    def __str__(self):
        return f'{self.user} read {self.story}'


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
# FEAR METER - "how scary was it?" 1 to 5 skulls, once per reader
# per story (they can change it). Story.fear_total / fear_votes keep
# the sum up to date (see FearRatingView).
# ---------------------------------------------------------------
class FearRating(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fear_ratings')
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='fear_ratings')
    score = models.PositiveSmallIntegerField()   # 1-5
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'story']


# ---------------------------------------------------------------
# REACTIONS - besides Like: how did the story land?
# One of each kind per reader per story, switched on/off by clicking.
# ---------------------------------------------------------------
REACTION_KINDS = [
    ('got_me', 'Got me'),        # 😱
    ('cant_sleep', "Can't sleep"),   # 🌙
    ('creepy', 'Creepy'),        # 🕯️
]


class Reaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reactions')
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='reactions')
    kind = models.CharField(max_length=12, choices=REACTION_KINDS)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'story', 'kind']


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
# READING DAYS - "did this member read a story on this day?"
# One row per member per day (record_reading() in views.py adds it).
# Used for reading streaks and the Night Owl badge (accounts/badges.py).
# ---------------------------------------------------------------
class ReadingDay(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reading_days')
    date = models.DateField()

    class Meta:
        unique_together = ['user', 'date']


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
# VIEWS PER DAY - Story.views is only a running total, so the Author
# Dashboard couldn't draw "views over time". One row per story per
# day, counted when the story page is opened (StoryDetailView).
# Only days from when this was added have numbers.
# ---------------------------------------------------------------
class StoryViewDay(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='view_days')
    date = models.DateField()
    count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ['story', 'date']


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


# ---------------------------------------------------------------
# READING LISTS - "My 10 scariest winter reads". A member makes a
# named list of stories; a PUBLIC one has a link anyone can open
# (/reading-lists/<id>). Different from "Save" (Bookmark), which is
# one private "read later" pile.
# ---------------------------------------------------------------
class ReadingList(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reading_lists')
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=300, blank=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title


class ReadingListItem(models.Model):
    reading_list = models.ForeignKey(ReadingList, on_delete=models.CASCADE, related_name='items')
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='reading_list_items')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['added_at']                          # the order you added them
        unique_together = ['reading_list', 'story']      # a story once per list


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
# READ-ALONGS - a group reads one story together at a set time
# ("Friday midnight read"), chatting as they go. When it's over,
# everyone's fear ratings are revealed. (stories/readalong_views.py)
#
#   before starts_at             -> upcoming: people can join
#   starts_at ... + 90 minutes   -> live: the chat is open
#   after that                   -> ended: chat closed, ratings revealed
# ---------------------------------------------------------------
class ReadAlong(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='read_alongs')
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='read_alongs_hosted')
    starts_at = models.DateTimeField()
    joined = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='read_alongs_joined')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['starts_at']


class ReadAlongMessage(models.Model):
    room = models.ForeignKey(ReadAlong, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='read_along_messages')
    body = models.CharField(max_length=500)
    # Hidden by an admin after a report (moderation/views.py) - it
    # disappears from the room, but the report can still show it.
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


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
