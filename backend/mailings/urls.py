from django.urls import path

from .template_views import AdminEmailTemplateListView, AdminEmailTemplateDetailView
from .views import NewsletterView, CommentDigestView, WeeklyTopView


# Included under "api/" in config/urls.py.
urlpatterns = [
    path('dashboard/newsletter/', NewsletterView.as_view()),
    path('dashboard/digest/', CommentDigestView.as_view()),
    path('dashboard/weekly-top/', WeeklyTopView.as_view()),
    path('dashboard/email-templates/', AdminEmailTemplateListView.as_view()),
    path('dashboard/email-templates/<str:key>/', AdminEmailTemplateDetailView.as_view()),
]
