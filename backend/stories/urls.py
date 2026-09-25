from django.urls import path

from .views import (
    StoryListView, StoryCreateView, StoryDetailView, FeaturedStoriesView, RandomStoryView,
    ToggleLikeView, ToggleSaveView, CommentListView, LastWordListView, AuthorStatsView,
    FeedView,
)


# Included under "api/" in config/urls.py -> /api/stories/...
urlpatterns = [
    path('stories/', StoryListView.as_view()),
    path('stories/new/', StoryCreateView.as_view()),
    path('stories/featured/', FeaturedStoriesView.as_view()),
    path('stories/random/', RandomStoryView.as_view()),

    # My Feed - stories by the authors you follow (logged in).
    path('stories/feed/', FeedView.as_view()),

    # <int:pk> only matches numbers, so "featured" and "random" above
    # can never be mistaken for a story id. pk = "primary key" = the
    # story's id.
    path('stories/<int:pk>/', StoryDetailView.as_view()),
    path('stories/<int:pk>/like/', ToggleLikeView.as_view()),
    path('stories/<int:pk>/save/', ToggleSaveView.as_view()),
    path('stories/<int:pk>/comments/', CommentListView.as_view()),

    # The quote wall on the homepage -> /api/last-words/
    path('last-words/', LastWordListView.as_view()),

    # The Author Dashboard (logged in) -> /api/author/stats/?days=30
    path('author/stats/', AuthorStatsView.as_view()),
]
