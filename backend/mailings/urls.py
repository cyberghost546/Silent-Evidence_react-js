from django.urls import path

from .views import NewsletterView, CommentDigestView


# Included under "api/" in config/urls.py.
urlpatterns = [
    path('dashboard/newsletter/', NewsletterView.as_view()),
    path('dashboard/digest/', CommentDigestView.as_view()),
]
