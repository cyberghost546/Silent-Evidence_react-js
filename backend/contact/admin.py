from django.contrib import admin

from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'subject', 'is_handled', 'created_at']

    # Tick "handled" right in the list, like is_published on stories.
    list_editable = ['is_handled']
    list_filter = ['is_handled', 'subject']
    search_fields = ['name', 'email', 'message']

    # Nobody should edit what a visitor wrote.
    readonly_fields = ['name', 'email', 'subject', 'message', 'created_at']
