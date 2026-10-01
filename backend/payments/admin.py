from django.contrib import admin

from .models import Payment


# Read-only in Django's admin: payments are only made by the site
# itself (views.py), never typed in by hand.
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'kind', 'amount', 'status', 'buyer', 'writer', 'created_at', 'paid_at', 'paid_out_at']
    list_filter = ['kind', 'status']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
