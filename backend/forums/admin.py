from django.contrib import admin

from .models import Board, Thread, Post

admin.site.register(Board)
admin.site.register(Thread)
admin.site.register(Post)
