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
]
