from django.urls import path

from .beta_views import BetaReadersView, RemoveBetaReaderView, BetaFeedbackView
from .chain_views import ChainListView, ChainDetailView, AdminChainView
from .series_views import MySeriesView, SeriesDetailView
from .sprint_views import SprintView
from .trend_views import AuthorTrendsView
from .edit_views import StoryEditView, StoryVersionsView, RestoreVersionView
from .recommend_views import RecommendedStoriesView
from .map_views import StoryMapView
from .reading_list_views import ReadingListsView, ReadingListDetailView, ReadingListStoryView
from .true_story_views import TrueStoryListView, TrueStoryDetailView, AdminTrueStoryListView, AdminTrueStoryActionView
from .views import (
    StoryListView, StoryCreateView, StoryDetailView, FeaturedStoriesView, RandomStoryView,
    ToggleLikeView, ToggleSaveView, CommentListView, LastWordListView, AuthorStatsView,
    FeedView, SavedStoriesView, ReadingHistoryView, MyStoriesView, ManageStoryView, SearchView,
    InviteListView, InviteActionView, FearRatingView, ToggleReactionView,
    ReadingProgressView, ContinueReadingView,
)


# Included under "api/" in config/urls.py -> /api/stories/...
urlpatterns = [
    path('stories/<int:pk>/beta/', BetaReadersView.as_view()),
    path('stories/<int:pk>/beta/feedback/', BetaFeedbackView.as_view()),
    path('stories/<int:pk>/beta/<str:username>/', RemoveBetaReaderView.as_view()),
    path('chains/', ChainListView.as_view()),
    path('chains/<int:pk>/', ChainDetailView.as_view()),
    path('dashboard/chains/<int:pk>/', AdminChainView.as_view()),
    path('sprints/', SprintView.as_view()),     # Writing Sprints
    path('series/mine/', MySeriesView.as_view()),
    path('series/<int:pk>/', SeriesDetailView.as_view()),
    path('stories/', StoryListView.as_view()),
    path('stories/new/', StoryCreateView.as_view()),
    path('stories/featured/', FeaturedStoriesView.as_view()),
    path('stories/map/', StoryMapView.as_view()),                    # the Haunted Map
    path('stories/recommended/', RecommendedStoriesView.as_view()),   # "Because you read..."
    path('stories/random/', RandomStoryView.as_view()),

    # My Feed - stories by the authors you follow (logged in).
    path('stories/feed/', FeedView.as_view()),

    # Pages from the user menu (logged in)
    path('stories/saved/', SavedStoriesView.as_view()),        # My Lists
    path('stories/continue/', ContinueReadingView.as_view()),
    path('stories/<int:pk>/progress/', ReadingProgressView.as_view()),
    path('stories/history/', ReadingHistoryView.as_view()),    # Reading History
    path('stories/mine/', MyStoriesView.as_view()),            # My Stories

    # <int:pk> only matches numbers, so "featured" and "random" above
    # can never be mistaken for a story id. pk = "primary key" = the
    # story's id.
    path('stories/<int:pk>/', StoryDetailView.as_view()),
    path('stories/<int:pk>/like/', ToggleLikeView.as_view()),
    path('stories/<int:pk>/fear/', FearRatingView.as_view()),
    path('stories/<int:pk>/react/', ToggleReactionView.as_view()),
    path('stories/<int:pk>/save/', ToggleSaveView.as_view()),
    path('stories/<int:pk>/comments/', CommentListView.as_view()),
    path('stories/<int:pk>/edit/', StoryEditView.as_view()),                                  # edit YOUR story
    path('stories/<int:pk>/versions/', StoryVersionsView.as_view()),                          # its history
    path('stories/<int:pk>/versions/<int:version_id>/restore/', RestoreVersionView.as_view()),
    path('stories/<int:pk>/manage/', ManageStoryView.as_view()),   # publish / delete YOUR story

    # Search -> /api/search/?q=house
    path('search/', SearchView.as_view()),

    # Co-author invites
    path('invites/', InviteListView.as_view()),
    path('invites/<int:pk>/', InviteActionView.as_view()),              # DELETE = cancel
    path('invites/<int:pk>/<str:action>/', InviteActionView.as_view()), # accept / decline

    # The quote wall on the homepage -> /api/last-words/
    path('last-words/', LastWordListView.as_view()),

    # The Author Dashboard (logged in) -> /api/author/stats/?days=30
    path('author/stats/', AuthorStatsView.as_view()),
    path('reading-lists/', ReadingListsView.as_view()),                                   # shareable lists
    path('reading-lists/<int:pk>/', ReadingListDetailView.as_view()),
    path('reading-lists/<int:pk>/stories/<int:story_id>/', ReadingListStoryView.as_view()),
    path('true-stories/', TrueStoryListView.as_view()),                  # anonymous true stories
    path('true-stories/<int:pk>/', TrueStoryDetailView.as_view()),
    path('dashboard/true-stories/', AdminTrueStoryListView.as_view()),
    path('dashboard/true-stories/<int:pk>/<str:action>/', AdminTrueStoryActionView.as_view()),
    path('author/trends/', AuthorTrendsView.as_view()),    # views / read-through per week
]
