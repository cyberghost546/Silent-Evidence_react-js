from django.urls import path

from .views import DashboardStatsView, AdminUserListView, AdminUserDetailView


# Included under "api/" in config/urls.py, so this becomes
# /api/dashboard/stats/ (next to /api/dashboard/slides/ from the
# slides app).
urlpatterns = [
    path('dashboard/stats/', DashboardStatsView.as_view()),

    # The Users page
    path('dashboard/users/', AdminUserListView.as_view()),
    path('dashboard/users/<int:pk>/', AdminUserDetailView.as_view()),
]
