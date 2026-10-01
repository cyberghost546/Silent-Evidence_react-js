from django.contrib import admin

from .models import Message


# Private messages, visible to admins for moderation (reports etc.).
@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'sender', 'recipient', 'is_read', 'created_at']
    search_fields = ['body', 'sender__username', 'recipient__username']
