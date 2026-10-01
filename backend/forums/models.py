from django.conf import settings
from django.db import models


# ---------------------------------------------------------------
# FORUMS: Board -> Thread -> Post
#
#   Board   "Cold Cases"                       (made by a migration)
#   Thread  "The 1987 lighthouse case"         (a member starts it)
#   Post    "I think the keeper never left..." (the replies)
#
# The first message of a thread is in Thread.body; the answers are
# Posts. last_activity moves on every reply, so busy threads go up.
# ---------------------------------------------------------------
class Board(models.Model):
    slug = models.SlugField(unique=True)          # the URL: /forums/cold-cases
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=200, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Thread(models.Model):
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='threads')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='forum_threads')
    title = models.CharField(max_length=150)
    body = models.TextField(max_length=5000)
    # Admins: pinned = always at the top; locked = no new replies.
    is_pinned = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Pinned first (True sorts after False, hence the minus),
        # then the most recently active.
        ordering = ['-is_pinned', '-last_activity']

    def __str__(self):
        return self.title


class Post(models.Model):
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='posts')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='forum_posts')
    body = models.TextField(max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)
    # Hidden by an admin: not shown, but not deleted.
    is_hidden = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']   # a conversation reads oldest first

    def __str__(self):
        return f'{self.author}: {self.body[:40]}'
