from django.contrib import admin

from .models import Announcement, WritingPrompt, Challenge, ChallengeEntry, Bundle


admin.site.register(Announcement)
admin.site.register(WritingPrompt)
admin.site.register(Challenge)
admin.site.register(ChallengeEntry)


@admin.register(Bundle)
class BundleAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_published', 'created_at']
    # A nicer "pick many stories" box than the default.
    filter_horizontal = ['stories']
    # Fill the slug in from the title while typing.
    prepopulated_fields = {'slug': ['title']}
