from django.contrib import admin

from .models import Follow, Profile, Block


admin.site.register(Follow)
admin.site.register(Profile)
admin.site.register(Block)
