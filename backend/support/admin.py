from django.contrib import admin

from .models import SupportTicket, TicketMessage


# The messages shown INSIDE the ticket's admin page ("inline").
class TicketMessageInline(admin.TabularInline):
    model = TicketMessage
    extra = 0


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'user', 'status', 'updated_at']
    list_filter = ['status']
    inlines = [TicketMessageInline]
