from django.urls import path

from .views import (
    PlansView, CheckoutView, PaymentStatusView, FakePayView,
    StripeWebhookView, TipsReceivedView, TipsOwedView,
)


urlpatterns = [
    path('payments/plans/', PlansView.as_view()),
    path('payments/checkout/', CheckoutView.as_view()),
    path('payments/stripe-webhook/', StripeWebhookView.as_view()),
    path('payments/tips/received/', TipsReceivedView.as_view()),
    path('payments/<int:pk>/', PaymentStatusView.as_view()),
    path('payments/<int:pk>/fake-pay/', FakePayView.as_view()),
    # Admin Dashboard -> Revenue (tips we owe writers)
    path('dashboard/tips-owed/', TipsOwedView.as_view()),
]
