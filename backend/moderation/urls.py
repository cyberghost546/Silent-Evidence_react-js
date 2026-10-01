from django.urls import path

from .views import (
    ReportCreateView, MyAppealsView,
    AdminReportListView, AdminReportActionView,
    AdminModerationListView, AdminModerationItemView,
    AdminAppealListView, AdminAppealDecisionView,
    AdminLoginLogView, AdminSecurityView, AdminUnlockView,
    AdminBannedWordListView, AdminBannedWordDetailView, FilterTestView,
    MyVerificationView, AdminVerificationListView, AdminVerificationDecisionView,
    MyWarningsView, AcknowledgeWarningView,
    AdminDisciplineView, AdminWarnView, AdminBanView, AdminLiftBanView,
)


# Included under "api/" in config/urls.py.
urlpatterns = [
    # For members
    path('reports/', ReportCreateView.as_view()),
    path('appeals/', MyAppealsView.as_view()),
    path('verification/', MyVerificationView.as_view()),
    path('warnings/', MyWarningsView.as_view()),
    path('warnings/<int:pk>/ack/', AcknowledgeWarningView.as_view()),

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

    # Content Filter
    path('dashboard/banned-words/', AdminBannedWordListView.as_view()),
    path('dashboard/banned-words/test/', FilterTestView.as_view()),
    path('dashboard/banned-words/<int:pk>/', AdminBannedWordDetailView.as_view()),

    # Verification
    path('dashboard/verification/', AdminVerificationListView.as_view()),
    path('dashboard/verification/<int:pk>/', AdminVerificationDecisionView.as_view()),

    # Warnings & Bans
    path('dashboard/discipline/', AdminDisciplineView.as_view()),
    path('dashboard/warnings/', AdminWarnView.as_view()),
    path('dashboard/bans/', AdminBanView.as_view()),
    path('dashboard/bans/<int:pk>/lift/', AdminLiftBanView.as_view()),
]
