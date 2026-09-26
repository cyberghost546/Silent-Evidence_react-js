from django.urls import path

from .ai import AIStatusView, GenerateStoryView, SaveGeneratedStoryView
from .views import (
    DashboardStatsView, AdminUserListView, AdminUserDetailView,
    AdminStoryListView, AdminStoryDetailView, FunnelView,
)


# Included under "api/" in config/urls.py, so this becomes
# /api/dashboard/stats/ (next to /api/dashboard/slides/ from the
# slides app).
urlpatterns = [
    path('dashboard/stats/', DashboardStatsView.as_view()),

    # The Users page
    path('dashboard/users/', AdminUserListView.as_view()),
    path('dashboard/users/<int:pk>/', AdminUserDetailView.as_view()),

    # The Stories page
    path('dashboard/stories/', AdminStoryListView.as_view()),
    path('dashboard/stories/<int:pk>/', AdminStoryDetailView.as_view()),

    # The Conversion Funnel page
    path('dashboard/funnel/', FunnelView.as_view()),

    # The AI Generator page (dashboard/ai.py)
    path('dashboard/ai/status/', AIStatusView.as_view()),
    path('dashboard/ai/generate/', GenerateStoryView.as_view()),
    path('dashboard/ai/save/', SaveGeneratedStoryView.as_view()),
]
