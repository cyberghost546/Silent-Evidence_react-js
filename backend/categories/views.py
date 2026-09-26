# "generics" holds DRF's ready-made views for the common cases
# (list, create, retrieve, update, delete).
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics

from .models import Category
from .serializers import CategorySerializer


# Both views below need "categories + how many published stories each
# has", so the query lives in one function instead of being copied.
#
# .annotate() adds a calculated value to every row. Here: how many
# PUBLISHED stories point at this category. 'stories' is the
# related_name on Story.category, and filter=Q(...) means drafts
# don't count. The database does all the counting in ONE query -
# much faster than asking "how many stories?" 52 separate times.
#
# .order_by('id') keeps the order from the seed file. Without it,
# the counting (SQL "GROUP BY") lets the database return rows in
# whatever order it likes - and the header dropdown and footer
# would suddenly change order too.
def categories_with_counts():
    # Scheduled stories (publish_at still in the future) don't count
    # yet either - same rule as published_stories() in stories/models.py.
    visible = Q(stories__is_published=True, stories__is_archived=False) & (
        Q(stories__publish_at__isnull=True) | Q(stories__publish_at__lte=timezone.now())
    )
    return Category.objects.annotate(
        story_count=Count('stories', filter=visible)
    ).order_by('id')


# GET /api/categories/  -> every category
# ListAPIView handles the whole GET request for us: runs the query,
# serializes the results, returns JSON. No request handling of our own.
class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer

    # get_queryset() instead of `queryset = ...`: a class attribute is
    # built ONCE when the server starts, so "now" inside it would be
    # frozen and scheduled stories would never get counted.
    def get_queryset(self):
        return categories_with_counts()


# GET /api/categories/paranormal/  -> ONE category, found by its slug
# RetrieveAPIView = "get one row". If no row matches, DRF answers
# 404 Not Found by itself - React uses that to show "not found".
class CategoryDetailView(generics.RetrieveAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return categories_with_counts()

    # By default DRF looks rows up by id (/categories/5/).
    # lookup_field = 'slug' makes it use the slug from the URL instead.
    lookup_field = 'slug'
