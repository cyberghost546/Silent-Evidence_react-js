from django.urls import path

from .ai import AIStatusView, GenerateStoryView, SaveGeneratedStoryView
from .content_views import (
    ScheduledStoriesView, ScheduledStoryActionView,
    TagSuggestionsView, AdminTagListView, AdminTagDetailView, MergeTagView,
    ContentCalendarView, MergeStoriesView,
)
from .premium_views import PremiumMembersView, CancelMembershipView, RevenueView
from .site_views import (
    SiteStatusView, AdminSiteSettingsView, AdminRateLimitsView,
    AdminBlockedIPListView, AdminBlockedIPDetailView, AdminAuditLogView,
)
from .tools_views import AdminSearchView, EmailLogView, SiteHealthView
from .views import (
    DashboardStatsView, AdminUserListView, AdminUserDetailView,
    AdminStoryListView, AdminStoryDetailView, FunnelView,
)


# Included under "api/" in config/urls.py, so this becomes
# /api/dashboard/stats/ (next to /api/dashboard/slides/ from the
# slides app).
urlpatterns = [
    # Public: maintenance / sign-ups open / contact email
    path('site-status/', SiteStatusView.as_view()),

    # Site Settings, Rate Limits, IP Blocklist, Audit Log
    path('dashboard/site-settings/', AdminSiteSettingsView.as_view()),
    path('dashboard/rate-limits/', AdminRateLimitsView.as_view()),
    path('dashboard/blocked-ips/', AdminBlockedIPListView.as_view()),
    path('dashboard/blocked-ips/<int:pk>/', AdminBlockedIPDetailView.as_view()),
    path('dashboard/audit-log/', AdminAuditLogView.as_view()),

    path('dashboard/stats/', DashboardStatsView.as_view()),

    # The Users page
    path('dashboard/users/', AdminUserListView.as_view()),
    path('dashboard/users/<int:pk>/', AdminUserDetailView.as_view()),

    # The Stories page
    path('dashboard/stories/', AdminStoryListView.as_view()),
    path('dashboard/stories/merge/', MergeStoriesView.as_view()),
    path('dashboard/calendar/', ContentCalendarView.as_view()),
    path('dashboard/stories/<int:pk>/', AdminStoryDetailView.as_view()),

    # Premium Members + Revenue (premium_views.py)
    path('dashboard/premium/', PremiumMembersView.as_view()),
    path('dashboard/premium/<int:pk>/cancel/', CancelMembershipView.as_view()),
    path('dashboard/revenue/', RevenueView.as_view()),

    # Scheduled Stories + Tag Manager (content_views.py)
    path('dashboard/scheduled/', ScheduledStoriesView.as_view()),
    path('dashboard/scheduled/<int:pk>/', ScheduledStoryActionView.as_view()),
    path('tags/', TagSuggestionsView.as_view()),
    path('dashboard/tags/', AdminTagListView.as_view()),
    path('dashboard/tags/<int:pk>/', AdminTagDetailView.as_view()),
    path('dashboard/tags/<int:pk>/merge/', MergeTagView.as_view()),

    # Admin Search, Email Log, Site Health (tools_views.py)
    path('dashboard/search/', AdminSearchView.as_view()),
    path('dashboard/email-log/', EmailLogView.as_view()),
    path('dashboard/health/', SiteHealthView.as_view()),

    # The Conversion Funnel page
    path('dashboard/funnel/', FunnelView.as_view()),

    # The AI Generator page (dashboard/ai.py)
    path('dashboard/ai/status/', AIStatusView.as_view()),
    path('dashboard/ai/generate/', GenerateStoryView.as_view()),
    path('dashboard/ai/save/', SaveGeneratedStoryView.as_view()),
]
