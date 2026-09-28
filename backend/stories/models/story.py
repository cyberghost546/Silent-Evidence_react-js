# ---------------------------------------------------------------
# THE STORY itself: Tag, Story, content ratings, and WHO may see what (stories_for).
# Part of stories/models/ - everything is imported in __init__.py,
# so the rest of the site still writes: from stories.models import Story
# ---------------------------------------------------------------
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
    # because the Series class is in another file (writing.py) - Django
    # finds it by name.
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
