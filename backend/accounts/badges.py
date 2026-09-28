from datetime import timedelta

from django.db.models import Count
from django.utils import timezone


# ---------------------------------------------------------------
# BADGES + READING STREAKS - shown on profiles.
#
# Nothing extra is stored for badges: they're worked out from what
# the member already did (stories, likes, ratings...). Only reading
# DAYS are stored (stories.ReadingDay), to count streaks.
#
# To add a badge: add one line to BADGES, and its number to counts().
#   key        - a fixed name for it
#   count      - which number from counts() it looks at
#   target     - how much of it you need
# ---------------------------------------------------------------
BADGES = [
    {'key': 'first_story', 'emoji': '🖋️', 'name': 'First Story', 'description': 'Published a story', 'count': 'stories', 'target': 1},
    {'key': 'storyteller', 'emoji': '📚', 'name': 'Storyteller', 'description': 'Published 10 stories', 'count': 'stories', 'target': 10},
    {'key': 'fan_favourite', 'emoji': '❤️', 'name': 'Fan Favourite', 'description': 'Got 100 likes on your stories', 'count': 'likes', 'target': 100},
    {'key': 'saga', 'emoji': '🗝️', 'name': 'Saga Writer', 'description': 'Wrote a series with 5 parts', 'count': 'series_parts', 'target': 5},
    {'key': 'night_owl', 'emoji': '🦉', 'name': 'Night Owl', 'description': 'Read stories 7 days in a row', 'count': 'longest_streak', 'target': 7},
    {'key': 'bookworm', 'emoji': '🐛', 'name': 'Bookworm', 'description': 'Read 50 stories', 'count': 'stories_read', 'target': 50},
    {'key': 'critic', 'emoji': '💀', 'name': 'Fear Critic', 'description': 'Rated 20 stories on the fear meter', 'count': 'fear_ratings', 'target': 20},
    {'key': 'chain_gang', 'emoji': '⛓️', 'name': 'Chain Gang', 'description': 'Wrote 5 parts of story chains', 'count': 'chain_parts', 'target': 5},
    {'key': 'regular', 'emoji': '🕯️', 'name': 'Forum Regular', 'description': 'Posted 25 times in the forums', 'count': 'forum_posts', 'target': 25},
]


# Reading days -> (current streak, longest streak).
# "Current" still counts if your last day was YESTERDAY - you haven't
# broken it yet, you just haven't read today.
def streaks(days):
    days = sorted(set(days))
    if not days:
        return 0, 0
    longest = run = 1
    for before, after in zip(days, days[1:]):
        run = run + 1 if after - before == timedelta(days=1) else 1
        longest = max(longest, run)

    today = timezone.localdate()
    current = 0
    if days[-1] >= today - timedelta(days=1):
        current = 1
        for before, after in zip(reversed(days[:-1]), reversed(days[1:])):
            if after - before != timedelta(days=1):
                break
            current += 1
    return current, longest


# Every number the badges look at, for one member.
def counts(user):
    # Imported here: accounts is loaded before stories and forums.
    from forums.models import Post, Thread
    from stories.models import Story, Like, ReadingHistory, FearRating, ChainPart, ReadingDay, Series

    current, longest = streaks(ReadingDay.objects.filter(user=user).values_list('date', flat=True))
    biggest_series = (
        Series.objects.filter(author=user).annotate(parts_count=Count('parts'))
        .order_by('-parts_count').values_list('parts_count', flat=True).first()
    )
    return {
        'stories': Story.objects.filter(author=user, is_published=True).count(),
        'likes': Like.objects.filter(story__author=user).count(),
        'series_parts': biggest_series or 0,
        'current_streak': current,
        'longest_streak': longest,
        'stories_read': ReadingHistory.objects.filter(user=user).count(),
        'fear_ratings': FearRating.objects.filter(user=user).count(),
        'chain_parts': ChainPart.objects.filter(author=user).count(),
        'forum_posts': Post.objects.filter(author=user).count() + Thread.objects.filter(author=user).count(),
    }


# -> { streak: {current, longest}, badges: [ {key, emoji, name,
#      description, earned, progress, target}, ... ] }
def badge_report(user):
    numbers = counts(user)
    return {
        'streak': {'current': numbers['current_streak'], 'longest': numbers['longest_streak']},
        'badges': [
            {
                'key': badge['key'],
                'emoji': badge['emoji'],
                'name': badge['name'],
                'description': badge['description'],
                'earned': numbers[badge['count']] >= badge['target'],
                # min(): "12 of 10" would look odd - stop at the target.
                'progress': min(numbers[badge['count']], badge['target']),
                'target': badge['target'],
            }
            for badge in BADGES
        ],
    }
