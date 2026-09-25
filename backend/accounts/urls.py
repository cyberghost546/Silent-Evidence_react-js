from django.urls import path

from .views import (
    SignUpView, LogInView, LogOutView, MeView, AuthorListView, ToggleFollowView, ProfileView,
    SettingsView, ChangePasswordView, DeleteAccountView, BlockListView, UnblockView, ExportDataView,
    LeaderboardView,
)


# Included under "api/accounts/" in config/urls.py,
# so these become /api/accounts/signup/ and so on.
urlpatterns = [
    path('signup/', SignUpView.as_view()),
    path('login/', LogInView.as_view()),
    path('logout/', LogOutView.as_view()),
    path('me/', MeView.as_view()),
    path('authors/', AuthorListView.as_view()),
    path('authors/<str:username>/follow/', ToggleFollowView.as_view()),
    path('profile/<str:username>/', ProfileView.as_view()),
    path('leaderboard/', LeaderboardView.as_view()),

    # The Settings page (SettingsPage.jsx in React)
    path('settings/', SettingsView.as_view()),
    path('change-password/', ChangePasswordView.as_view()),
    path('delete/', DeleteAccountView.as_view()),
    path('blocks/', BlockListView.as_view()),
    path('blocks/<str:username>/', UnblockView.as_view()),
    path('export/', ExportDataView.as_view()),
]
