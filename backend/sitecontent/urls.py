from django.urls import path

from .views import (
    CurrentAnnouncementView, RandomPromptView,
    ChallengeListView, ChallengeDetailView, EnterChallengeView,
    BundleListView, BundleDetailView,
    AdminAnnouncementListView, AdminAnnouncementDetailView,
    AdminPromptListView, AdminPromptDetailView,
    AdminChallengeListView, AdminChallengeDetailView,
    AdminBundleListView, AdminBundleDetailView,
    AdminCategoryListView, AdminCategoryDetailView,
    AdminStoryPickerView,
    CookieBannerView, CookieConsentView, AdminCookieView,
    MoodOfTheDayView, AdminMoodListView, AdminMoodDetailView,
    CurrentSpotlightView, AdminSpotlightListView, AdminSpotlightDetailView,
    CurrentPollView, VoteView, AdminPollListView, AdminPollDetailView,
    AdminFeaturedListView, AdminFeaturedDetailView,
)


# Included under "api/" in config/urls.py.
urlpatterns = [
    # Public
    path('announcement/', CurrentAnnouncementView.as_view()),
    path('prompts/random/', RandomPromptView.as_view()),
    path('challenges/', ChallengeListView.as_view()),
    path('challenges/<int:pk>/', ChallengeDetailView.as_view()),
    path('challenges/<int:pk>/enter/', EnterChallengeView.as_view()),
    path('bundles/', BundleListView.as_view()),
    path('bundles/<slug:slug>/', BundleDetailView.as_view()),
    path('cookie-banner/', CookieBannerView.as_view()),
    path('cookie-consent/', CookieConsentView.as_view()),
    path('mood-of-the-day/', MoodOfTheDayView.as_view()),
    path('spotlight/', CurrentSpotlightView.as_view()),
    path('polls/current/', CurrentPollView.as_view()),
    path('polls/<int:pk>/vote/', VoteView.as_view()),

    # Admin Dashboard
    path('dashboard/announcements/', AdminAnnouncementListView.as_view()),
    path('dashboard/announcements/<int:pk>/', AdminAnnouncementDetailView.as_view()),
    path('dashboard/prompts/', AdminPromptListView.as_view()),
    path('dashboard/prompts/<int:pk>/', AdminPromptDetailView.as_view()),
    path('dashboard/challenges/', AdminChallengeListView.as_view()),
    path('dashboard/challenges/<int:pk>/', AdminChallengeDetailView.as_view()),
    path('dashboard/bundles/', AdminBundleListView.as_view()),
    path('dashboard/bundles/<int:pk>/', AdminBundleDetailView.as_view()),
    path('dashboard/categories/', AdminCategoryListView.as_view()),
    path('dashboard/categories/<int:pk>/', AdminCategoryDetailView.as_view()),
    path('dashboard/story-picker/', AdminStoryPickerView.as_view()),
    path('dashboard/cookie-consent/', AdminCookieView.as_view()),
    path('dashboard/moods/', AdminMoodListView.as_view()),
    path('dashboard/moods/<int:pk>/', AdminMoodDetailView.as_view()),
    path('dashboard/spotlights/', AdminSpotlightListView.as_view()),
    path('dashboard/spotlights/<int:pk>/', AdminSpotlightDetailView.as_view()),
    path('dashboard/polls/', AdminPollListView.as_view()),
    path('dashboard/polls/<int:pk>/', AdminPollDetailView.as_view()),
    path('dashboard/featured-authors/', AdminFeaturedListView.as_view()),
    path('dashboard/featured-authors/<int:pk>/', AdminFeaturedDetailView.as_view()),
]
