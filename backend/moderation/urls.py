from django.urls import path

from .views import (
    ReportCreateView, MyAppealsView,
    AdminReportListView, AdminReportActionView,
    AdminModerationListView, AdminModerationItemView,
    AdminAppealListView, AdminAppealDecisionView,
    AdminLoginLogView, AdminSecurityView, AdminUnlockView,
)


# Included under "api/" in config/urls.py.
urlpatterns = [
    # For members
    path('reports/', ReportCreateView.as_view()),
    path('appeals/', MyAppealsView.as_view()),

    # Admin Dashboard
    path('dashboard/reports/', AdminReportListView.as_view()),
    path('dashboard/reports/<int:pk>/', AdminReportActionView.as_view()),
    path('dashboard/moderation/', AdminModerationListView.as_view()),
    # <str:kind> = 'comments' or 'lastwords'
    path('dashboard/moderation/<str:kind>/<int:pk>/', AdminModerationItemView.as_view()),
    path('dashboard/appeals/', AdminAppealListView.as_view()),
    path('dashboard/appeals/<int:pk>/', AdminAppealDecisionView.as_view()),
    path('dashboard/login-logs/', AdminLoginLogView.as_view()),
    path('dashboard/security/', AdminSecurityView.as_view()),
    path('dashboard/security/unlock/', AdminUnlockView.as_view()),
]
