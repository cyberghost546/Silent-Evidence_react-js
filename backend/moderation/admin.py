from django.contrib import admin

from .models import Report, Appeal, LoginEvent


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'reporter', 'status', 'created_at']
    list_filter = ['status', 'reason']


@admin.register(Appeal)
class AppealAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'status', 'created_at']
    list_filter = ['status']


# Login logs are a record - read-only in the admin, nobody should
# edit or add them by hand.
@admin.register(LoginEvent)
class LoginEventAdmin(admin.ModelAdmin):
    list_display = ['username', 'success', 'ip_address', 'created_at']
    list_filter = ['success']
    search_fields = ['username', 'ip_address']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
