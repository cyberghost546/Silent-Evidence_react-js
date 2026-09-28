from django.db import connection
from django.db.models import Case, IntegerField, Q, Value, When


# ---------------------------------------------------------------
# STORY SEARCH (the Search page - SearchView in views.py).
#
#   search_stories(stories, 'haunted lighthouse') -> the matching stories, best first
#
# EVERY database (SQLite on your computer, Postgres online):
#   - each WORD must appear somewhere (title, excerpt, text, tag or
#     author) - in any order: "haunted lighthouse" finds "The
#     Lighthouse" if the story is tagged "haunted"
#   - ranked by WHERE it matched: the whole phrase in the title counts
#     most, then words in the title, tags or author, then the excerpt,
#     then the story text. Ties -> more views first.
#
# POSTGRES ONLY (the live site) - search_postgres() below adds:
#   - real full-text search: "haunting" also finds "haunted"
#   - typo tolerance on titles: "lighthuose" still finds "Lighthouse"
#     (the pg_trgm extension - migration 0027 switches it on)
# ---------------------------------------------------------------
MAX_WORDS = 6


def query_words(query):
    # 'The  haunted, lighthouse' -> ['the', 'haunted', 'lighthouse'] (2+ letters each)
    words = [word.strip('.,!?;:"\'()').lower() for word in query.split()]
    return [word for word in words if len(word) >= 2][:MAX_WORDS]


def search_everywhere(stories, query):
    words = query_words(query)
    if not words:
        return stories.none()

    # Every word, anywhere.
    for word in words:
        stories = stories.filter(
            Q(title__icontains=word) | Q(excerpt__icontains=word) | Q(body__icontains=word)
            | Q(author__username__icontains=word) | Q(tags__name__icontains=word)
        )

    # Points for WHERE the words were found. Case/When = an "if" that
    # the database works out for every row.
    def points(condition, value):
        return Case(When(condition, then=Value(value)), default=Value(0), output_field=IntegerField())

    score = points(Q(title__icontains=query), 10)
    for word in words:
        score = score + points(Q(title__icontains=word), 4)
        score = score + points(Q(tags__name__iexact=word), 3)
        score = score + points(Q(author__username__iexact=word), 3)
        score = score + points(Q(excerpt__icontains=word), 2)
        score = score + points(Q(body__icontains=word), 1)

    # distinct(): a story with two matching tags would come twice.
    return stories.annotate(score=score).distinct().order_by('-score', '-views')


def search_postgres(stories, query):
    # Postgres's own search. Imported here: these only work on Postgres.
    from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector, TrigramSimilarity

    # Weights: A (title) counts most, then B (excerpt), then C (text).
    vector = SearchVector('title', weight='A') + SearchVector('excerpt', weight='B') + SearchVector('body', weight='C')
    # websearch = the rules people know from search engines ("quotes", -minus).
    search_query = SearchQuery(query, search_type='websearch')
    return (
        stories.annotate(rank=SearchRank(vector, search_query), similarity=TrigramSimilarity('title', query))
        # A full-text match, OR a title that LOOKS like what was typed (typos).
        .filter(Q(rank__gt=0) | Q(similarity__gt=0.3))
        .order_by('-rank', '-similarity', '-views')
    )


def search_stories(stories, query):
    if connection.vendor == 'postgresql':
        found = search_postgres(stories, query)
        # Postgres found nothing (e.g. only an author name or a tag was
        # typed)? Use the everywhere-search, which looks at those too.
        return found if found.exists() else search_everywhere(stories, query)
    return search_everywhere(stories, query)
