from django.urls import path

from .views import BoardListView, BoardView, ThreadView, AdminThreadView, AdminPostView


# Included under "api/" in config/urls.py.
# 'forums/threads/<id>/' comes BEFORE 'forums/<slug>/' - otherwise
# "threads" would be read as a board's slug.
urlpatterns = [
    path('forums/', BoardListView.as_view()),
    path('forums/threads/<int:pk>/', ThreadView.as_view()),
    path('forums/<slug:slug>/', BoardView.as_view()),
    path('dashboard/forums/threads/<int:pk>/', AdminThreadView.as_view()),
    path('dashboard/forums/posts/<int:pk>/', AdminPostView.as_view()),
]
