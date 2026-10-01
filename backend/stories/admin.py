from django.contrib import admin

from .models import Story, Like, Bookmark, Comment, LastWord, ReadingHistory, CoAuthorInvite


# A ModelAdmin customises the admin page for one model. The other
# apps use plain admin.site.register(...) - this is the next step up.
@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    # The columns shown in the list of stories.
    list_display = ['title', 'author', 'category', 'is_published', 'is_story_of_the_day', 'is_story_of_the_week', 'views', 'created_at']

    # These columns become checkboxes you can tick right in the list
    # (then press Save at the bottom) - picking the Story of the Day
    # takes one click instead of opening the story.
    list_editable = ['is_published', 'is_story_of_the_day', 'is_story_of_the_week']

    # Filter box on the right side, and a search bar on top.
    list_filter = ['is_published', 'category']
    search_fields = ['title']

    # Shown on the edit page, but greyed out - views are counted by
    # the site, nobody should type in a fake number.
    readonly_fields = ['views']


# The admin is where you moderate comments for now: search for a
# nasty one, tick it, "Delete selected".
@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'story', 'author', 'created_at']
    search_fields = ['body', 'author__username']
    list_filter = ['created_at']


# Likes and saves just need to be viewable - plain registration is enough.
admin.site.register(Like)
admin.site.register(Bookmark)


# Moderate the Last Words wall the same way as comments.
@admin.register(LastWord)
class LastWordAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'author', 'created_at']
    search_fields = ['body', 'author__username']


admin.site.register(ReadingHistory)


@admin.register(CoAuthorInvite)
class CoAuthorInviteAdmin(admin.ModelAdmin):
    list_display = ['story', 'from_user', 'to_user', 'status', 'created_at']
    list_filter = ['status']
