from django.contrib import admin

from .models import Newsletter, DigestRun, EmailLog


admin.site.register(Newsletter)
admin.site.register(DigestRun)


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ['subject', 'to', 'success', 'sent_at']
    list_filter = ['success']
    search_fields = ['to', 'subject']
