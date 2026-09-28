from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Block, get_profile
from accounts.notifications import notify, short_title
from dashboard.limits import hourly_limit_reached
from dashboard.models import SiteSettings
from moderation.content_filter import check_text, BLOCKED_MESSAGE
from .models import Board, Thread, Post


# ---------------------------------------------------------------
# FORUMS API
#
#   GET  /api/forums/                        -> the boards, with counts
#   GET  /api/forums/<slug>/                 -> one board + its threads
#   POST /api/forums/<slug>/  {title, body}  -> start a thread (members)
#   GET  /api/forums/threads/<id>/           -> a thread + its replies
#   POST /api/forums/threads/<id>/  {body}   -> reply (members)
#
# Admins:
#   PATCH  /api/dashboard/forums/threads/<id>/  {is_pinned, is_locked}
#   DELETE /api/dashboard/forums/threads/<id>/
#   PATCH  /api/dashboard/forums/posts/<id>/    {is_hidden}
# ---------------------------------------------------------------

def avatar_of(user):
    profile = get_profile(user)
    return profile.avatar.url if profile.avatar else ''


def blocked_ids_for(user):
    # People you blocked (Settings -> Blocked Users): their threads
    # and posts are hidden from you, like their comments are.
    if not user.is_authenticated:
        return []
    return list(Block.objects.filter(blocker=user).values_list('blocked_id', flat=True))


# The same checks for a new thread and a reply: length, the content
# filter, and the hourly limit (Rate Limits page -> comments per hour).
def check_message(request, text, max_length=5000):
    if not text:
        return 'Write something first.'
    if len(text) > max_length:
        return f'Keep it under {max_length} characters.'
    if check_text(text)[0] == 'block':
        return BLOCKED_MESSAGE
    limit = SiteSettings.load().comments_per_hour
    recent = request.user.forum_posts.all()
    if hourly_limit_reached(request.user, recent, limit):
        return f'You can post up to {limit} messages an hour. Take a breather!'
    return None


def thread_card(thread, reply_count, last_reply_at):
    return {
        'id': thread.id,
        'title': thread.title,
        'author': thread.author.username,
        'is_pinned': thread.is_pinned,
        'is_locked': thread.is_locked,
        'reply_count': reply_count,
        'created_at': thread.created_at,
        'last_activity': last_reply_at or thread.created_at,
    }


class BoardListView(APIView):
    def get(self, request):
        # Count(...) with a filter = GROUP BY, counting only visible posts.
        boards = Board.objects.annotate(
            thread_count=Count('threads', distinct=True),
            post_count=Count('threads__posts', filter=Q(threads__posts__is_hidden=False), distinct=True),
        # Counting (GROUP BY) makes Django ignore Meta.ordering - so say it again.
        ).order_by('order', 'name')
        return Response([
            {
                'slug': board.slug,
                'name': board.name,
                'description': board.description,
                'thread_count': board.thread_count,
                'post_count': board.post_count,
            }
            for board in boards
        ])


class BoardView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, slug):
        board = get_object_or_404(Board, slug=slug)
        threads = (
            board.threads.exclude(author_id__in=blocked_ids_for(request.user))
            .select_related('author')
            .annotate(
                reply_count=Count('posts', filter=Q(posts__is_hidden=False)),
                last_reply_at=Max('posts__created_at', filter=Q(posts__is_hidden=False)),
            )
            .order_by('-is_pinned', '-last_activity')
        )
        return Response({
            'slug': board.slug,
            'name': board.name,
            'description': board.description,
            'threads': [thread_card(t, t.reply_count, t.last_reply_at) for t in threads[:100]],
        })

    def post(self, request, slug):
        board = get_object_or_404(Board, slug=slug)
        title = (request.data.get('title') or '').strip()
        body = (request.data.get('body') or '').strip()
        if not title:
            return Response({'detail': 'Give your thread a title.'}, status=400)
        problem = check_message(request, f'{title}\n{body}') if body else 'Write something first.'
        if problem:
            return Response({'detail': problem}, status=400)
        thread = Thread.objects.create(board=board, author=request.user, title=title[:150], body=body)
        return Response(thread_card(thread, 0, None), status=201)


def post_data(post):
    return {
        'id': post.id,
        'author': post.author.username,
        'avatar': avatar_of(post.author),
        'body': post.body,
        'created_at': post.created_at,
        'is_hidden': post.is_hidden,
    }


class ThreadView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        thread = get_object_or_404(Thread.objects.select_related('board', 'author'), pk=pk)
        posts = thread.posts.select_related('author').exclude(author_id__in=blocked_ids_for(request.user))
        # Admins also see hidden posts (greyed out), so they can undo.
        if not request.user.is_staff:
            posts = posts.filter(is_hidden=False)
        return Response({
            'id': thread.id,
            'title': thread.title,
            'body': thread.body,
            'author': thread.author.username,
            'avatar': avatar_of(thread.author),
            'created_at': thread.created_at,
            'is_pinned': thread.is_pinned,
            'is_locked': thread.is_locked,
            'board': {'slug': thread.board.slug, 'name': thread.board.name},
            'posts': [post_data(post) for post in posts],
        })

    def post(self, request, pk):
        thread = get_object_or_404(Thread, pk=pk)
        if thread.is_locked:
            return Response({'detail': 'This thread is locked - no new replies.'}, status=400)
        body = (request.data.get('body') or '').strip()
        problem = check_message(request, body)
        if problem:
            return Response({'detail': problem}, status=400)

        post = Post.objects.create(thread=thread, author=request.user, body=body)
        Thread.objects.filter(pk=thread.pk).update(last_activity=timezone.now())
        # Tell whoever started the thread (notify() skips yourself).
        notify(thread.author, request.user, 'forum',
               f'{request.user.username} replied to your thread "{short_title(thread.title)}"',
               f'/forums/{thread.board.slug}/{thread.id}')
        return Response(post_data(post), status=201)


# ---------------- admins ----------------

class AdminThreadView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        thread = get_object_or_404(Thread, pk=pk)
        for field in ('is_pinned', 'is_locked'):
            if field in request.data:
                setattr(thread, field, request.data[field] in (True, 'true'))
        thread.save()
        return Response({'is_pinned': thread.is_pinned, 'is_locked': thread.is_locked})

    def delete(self, request, pk):
        get_object_or_404(Thread, pk=pk).delete()
        return Response(status=204)


class AdminPostView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        post.is_hidden = request.data.get('is_hidden') in (True, 'true')
        post.save(update_fields=['is_hidden'])
        return Response(post_data(post))
