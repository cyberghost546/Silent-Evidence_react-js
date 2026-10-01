from django.urls import path

from .views import ContactMessageCreateView, AdminContactListView, AdminContactDetailView


# Included under "api/" in config/urls.py -> /api/contact/
urlpatterns = [
    path('contact/', ContactMessageCreateView.as_view()),

    # Admin Dashboard -> Contact Inbox
    path('dashboard/contact/', AdminContactListView.as_view()),
    path('dashboard/contact/<int:pk>/', AdminContactDetailView.as_view()),
]
