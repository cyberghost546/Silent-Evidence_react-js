from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from accounts.models import Follow, Block, get_profile
from categories.models import Category


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
        return len(self.body.split())

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
