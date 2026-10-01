from django.urls import path

from .views import ConversationListView, ConversationView, UnreadCountView


# Included under "api/messages/" in config/urls.py.
urlpatterns = [
    path('', ConversationListView.as_view()),

    # 'unread/' must come BEFORE '<str:username>/' - Django tries the
    # patterns top to bottom, and <str:username> would happily match
    # the word "unread" too.
    path('unread/', UnreadCountView.as_view()),

    path('<str:username>/', ConversationView.as_view()),
]
