from django.urls import path

from .views import ContactMessageCreateView


# Included under "api/" in config/urls.py -> /api/contact/
urlpatterns = [
    path('contact/', ContactMessageCreateView.as_view()),
]
