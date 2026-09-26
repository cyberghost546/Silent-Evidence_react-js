from datetime import timedelta

from django.contrib.auth.models import User
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

# One app is allowed to import another app's models - that's how
# the dashboard can count slides and categories.
from accounts.models import get_profile
from categories.models import Category
from slides.models import Slide
from stories.models import Story


# GET /api/dashboard/stats/
#
# Everything the Overview page needs, in ONE request. The page would
# otherwise have to make 4-5 separate calls every time it loads.
class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # --- The 4 number cards ---
        # .count() runs "SELECT COUNT(*)" - the database does the
        # counting, Python never loads the rows themselves.
        stats = {
            'total_users': User.objects.count(),
            'total_slides': Slide.objects.count(),
            'active_slides': Slide.objects.filter(is_active=True).count(),
            'total_categories': Category.objects.count(),
        }

        # --- The chart: how many people signed up on each of the last 7 days ---
        today = timezone.localdate()
        signups = []

        # range(6, -1, -1) counts 6, 5, 4, 3, 2, 1, 0 = "6 days ago"
        # up to "today". Oldest first, so the chart reads left to right.
        for days_ago in range(6, -1, -1):
            day = today - timedelta(days=days_ago)

            # The shape { label, value } is exactly what the React
            # BarChart component wants, so React doesn't need to
            # reshape anything.
            signups.append({
                'label': day.strftime('%b %d'),  # e.g. "Sep 24"
                # date_joined__date = "the date part of date_joined".
                'value': User.objects.filter(date_joined__date=day).count(),
            })

        # --- The two "recent" lists ---
        # '-date_joined' = newest first (the minus means "descending").
        # [:5] becomes SQL "LIMIT 5" - only 5 rows are fetched.
        recent_users = User.objects.order_by('-date_joined')[:5]

        # Slide has no "created" date, so the highest id = the newest.
        recent_slides = Slide.objects.order_by('-id')[:5]

        return Response({
            'stats': stats,
            'signups': signups,

            # [ ... for u in recent_users ] is a "list comprehension":
            # a short way to build a list with a loop. We pick only the
            # fields React needs - never send the whole user (password
            # hash, etc.) to the browser.
            'recent_users': [
                {'id': u.id, 'username': u.username, 'date_joined': u.date_joined}
                for u in recent_users
            ],
            'recent_slides': [
                {'id': s.id, 'title': s.title, 'order': s.order, 'is_active': s.is_active}
                for s in recent_slides
            ],
        })


# ---------------------------------------------------------------
# USERS PAGE (Admin Dashboard -> Users). Admins only.
# ---------------------------------------------------------------

# One user, the way the Users table wants it.
#
# role: 'admin' if they're staff (Django's own flag), otherwise the
# role saved on their profile ('user' or 'author').
def admin_user_data(user):
    profile = get_profile(user)
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'avatar': profile.avatar.url if profile.avatar else '',
        'role': 'admin' if user.is_staff else profile.role,
        'is_verified': profile.is_verified,
        'is_premium': profile.is_premium,
        'story_count': user.story_count,
        'comment_count': user.comment_count,
        'date_joined': user.date_joined,
    }


# The users with their two counts added, for both views below.
# distinct=True: counting stories AND comments in one query joins
# both tables, and without it every story would be counted once
# per comment (and the other way round).
def users_with_counts():
    return User.objects.select_related('profile').annotate(
        story_count=Count('stories', distinct=True),
        comment_count=Count('comments', distinct=True),
    )


# GET /api/dashboard/users/
#
#   { "counts": { "total": 2, "admins": 1, "authors": 1, "premium": 1 },
#     "users": [ ...admin_user_data()... ] }
#
# ALL users at once, oldest first. The page searches, filters and
# sorts them in the browser. That's fine for a few hundred users;
# with thousands you'd do it here in Django (and send one page at
# a time - "pagination").
class AdminUserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = [admin_user_data(user) for user in users_with_counts().order_by('id')]

        # Count them from the list we just made - no extra queries.
        # sum(1 for ... if ...) = "how many match".
        counts = {
            'total': len(users),
            'admins': sum(1 for u in users if u['role'] == 'admin'),
            'authors': sum(1 for u in users if u['role'] == 'author'),
            'premium': sum(1 for u in users if u['is_premium']),
        }
        return Response({'counts': counts, 'users': users})


# PATCH  /api/dashboard/users/5/   { role / is_verified / is_premium }
# DELETE /api/dashboard/users/5/
class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        profile = get_profile(user)
        data = request.data

        if 'role' in data:
            role = data['role']
            if role not in ('user', 'author', 'admin'):
                return Response({'detail': 'Unknown role.'}, status=400)

            # Taking away your OWN admin rights would lock you out of
            # this page halfway through. Another admin must do it.
            if user == request.user and role != 'admin':
                return Response({'detail': "You can't remove your own admin role."}, status=400)

            # 'admin' = Django's staff flag (it's what IsAdminUser and
            # /admin check). Any other role = not staff + that role.
            if role == 'admin':
                user.is_staff = True
            else:
                user.is_staff = False
                profile.role = role
            user.save()

        # FormData sends true/false as TEXT: 'true' / 'false'.
        if 'is_verified' in data:
            profile.is_verified = data['is_verified'] == 'true'
        if 'is_premium' in data:
            profile.is_premium = data['is_premium'] == 'true'

        profile.save()

        # Read the user again WITH the counts, and send the new row back.
        return Response(admin_user_data(users_with_counts().get(pk=pk)))

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)

        if user == request.user:
            return Response({'detail': "You can't delete your own account here."}, status=400)

        # Everything they made goes with them (on_delete=CASCADE).
        user.delete()
        return Response(status=204)


# ---------------------------------------------------------------
# STORIES PAGE (Admin Dashboard -> Stories). Admins only.
# ---------------------------------------------------------------

# 'draft' / 'published' / 'archived' - one word for the dropdown.
# (Archived wins: an archived story is off the site either way.)
def story_status(story):
    if story.is_archived:
        return 'archived'
    return 'published' if story.is_published else 'draft'


def admin_story_data(story):
    return {
        'id': story.id,
        'title': story.title,
        'author': story.author.username,
        'category': story.category.name if story.category else None,
        'status': story_status(story),
        'is_story_of_the_day': story.is_story_of_the_day,
        'is_story_of_the_week': story.is_story_of_the_week,
        'like_count': story.like_count,
        'comment_count': story.comment_count,
        'views': story.views,
        'created_at': story.created_at,
    }


# All stories (drafts and archived too) with their two counts.
# distinct=True for the same reason as users_with_counts() above.
def stories_with_counts():
    return Story.objects.select_related('author', 'category').annotate(
        like_count=Count('likes', distinct=True),
        comment_count=Count('comments', distinct=True),
    )


# GET /api/dashboard/stories/
#   { "counts": { "total", "draft", "published", "archived" },
#     "stories": [ ...admin_story_data()... ] }  newest first
#
# Like the Users page: everything at once, the page searches and
# filters in the browser.
class AdminStoryListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        stories = [admin_story_data(story) for story in stories_with_counts().order_by('-created_at')]

        counts = {'total': len(stories), 'draft': 0, 'published': 0, 'archived': 0}
        for story in stories:
            counts[story['status']] += 1

        return Response({'counts': counts, 'stories': stories})


# PATCH  /api/dashboard/stories/5/   { status } or { is_story_of_the_day } or { is_story_of_the_week }
# DELETE /api/dashboard/stories/5/
class AdminStoryDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        story = get_object_or_404(Story, pk=pk)
        data = request.data

        if 'status' in data:
            status_word = data['status']
            if status_word == 'draft':
                story.is_published = False
                story.is_archived = False
            elif status_word == 'published':
                story.is_published = True
                story.is_archived = False
            elif status_word == 'archived':
                # is_published is left alone: un-archiving later puts
                # the story back exactly as it was.
                story.is_archived = True
            else:
                return Response({'detail': 'Unknown status.'}, status=400)

        # FormData sends 'true' / 'false' as text.
        # Only ONE Story of the Day (and one of the Week) at a time:
        # picking a new one takes the tick off the old one.
        for field in ('is_story_of_the_day', 'is_story_of_the_week'):
            if field in data:
                turn_on = data[field] == 'true'
                if turn_on:
                    # **{field: True} = "filter(is_story_of_the_day=True)",
                    # with the field name coming from the loop.
                    Story.objects.filter(**{field: True}).exclude(pk=story.pk).update(**{field: False})
                setattr(story, field, turn_on)   # story.<field> = turn_on

        story.save()
        return Response(admin_story_data(stories_with_counts().get(pk=pk)))

    def delete(self, request, pk):
        get_object_or_404(Story, pk=pk).delete()
        return Response(status=204)
