# ---------------------------------------------------------------
# READERS: likes, saves, comments, Last Words, history, fear meter, reactions, reading days and views, reading lists, read-alongs.
# Part of stories/models/ - everything is imported in __init__.py,
# so the rest of the site still writes: from stories.models import Story
# ---------------------------------------------------------------
from django.conf import settings
from django.db import models

from .story import Story


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
