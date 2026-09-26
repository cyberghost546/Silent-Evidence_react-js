from django.urls import path

from .views import MyTicketsView, TicketDetailView, CloseTicketView, AdminTicketListView


# Included under "api/" in config/urls.py.
urlpatterns = [
    path('support/', MyTicketsView.as_view()),
    path('support/<int:pk>/', TicketDetailView.as_view()),
    path('support/<int:pk>/close/', CloseTicketView.as_view()),

    # Admin Dashboard -> User Support (answering uses the same
    # support/<id>/ URL above - admins may open every ticket).
    path('dashboard/support/', AdminTicketListView.as_view()),
]
