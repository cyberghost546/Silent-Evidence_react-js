from django.contrib.auth import authenticate, login, logout, get_user_model, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from stories.models import Like, Bookmark, Comment, published_stories
from .models import Follow, Block, get_profile
from .serializers import SignUpSerializer, ProfileSettingsSerializer


# ---------------------------------------------------------------
# HOW LOGIN WORKS HERE
#
# Django's login() saves "user 3 is logged in" in the database and
# sends the browser a "sessionid" cookie pointing at it. The browser
# sends that cookie back with every request (React uses
# credentials: 'include'), and Django fills in request.user.
#
# It's the same cookie the /admin page uses - so logging in on the
# site also unlocks the slides dashboard for admins.
#
# These are plain APIViews instead of generics because they don't
# map to "list/create/update rows" - we write post()/get() ourselves.
# ---------------------------------------------------------------


# What React gets to know about a user. Kept in one function so
# every view sends the exact same shape.
def user_data(user):
    profile = get_profile(user)
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
        # '/media/avatars/me.jpg', or '' if they never uploaded one.
        # (An empty ImageField has no .url - asking for it crashes.)
        'avatar': profile.avatar.url if profile.avatar else '',
    }


# POST /api/accounts/signup/
class SignUpView(APIView):
    def post(self, request):
        serializer = SignUpSerializer(data=request.data)

        # raise_exception=True: if anything is wrong, stop here and
        # answer 400 with the error messages. No if/else needed.
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        # Log them straight in - nobody wants to sign up and then
        # type the same password again.
        login(request, user)

        return Response(user_data(user), status=status.HTTP_201_CREATED)


# POST /api/accounts/login/
class LogInView(APIView):
    def post(self, request):
        # The Log In page has ONE box: "Email or username".
        # (It's still sent as 'username'.)
        login_name = (request.data.get('username') or '').strip()

        # Has an @ in it? Then it's an email: look up whose it is and
        # use their username, because authenticate() only understands
        # usernames. email__iexact = ignore upper/lower case.
        # This is safe because Sign Up refuses a second account with
        # the same email (see validate_email in serializers.py).
        if '@' in login_name:
            match = get_user_model().objects.filter(email__iexact=login_name).first()
            if match:
                login_name = match.username

        # authenticate() checks the password against the hash.
        # Right password -> the User. Wrong -> None.
        user = authenticate(
            request,
            username=login_name,
            password=request.data.get('password'),
        )

        # Same message for "no such user" and "wrong password" on
        # purpose - otherwise you tell attackers which usernames exist.
        if user is None:
            return Response(
                {'detail': 'Wrong email, username or password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)
        return Response(user_data(user))


# POST /api/accounts/logout/
class LogOutView(APIView):
    def post(self, request):
        # Deletes the session, so the old cookie stops working.
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


# GET /api/accounts/me/
# React calls this once when the page loads, to ask "is anyone
# already logged in?" (e.g. you logged in yesterday and the cookie
# is still there).
class MeView(APIView):
    # ensure_csrf_cookie = "always send the browser a csrftoken cookie
    # if it doesn't have one yet".
    #
    # Every POST from React (like, save, comment...) must carry that
    # token. Normally the browser gets it when logging in - but if the
    # cookie was cleared or expired while the login is still valid,
    # every button would fail. React calls /me/ on EVERY page load
    # (AuthContext), so this makes sure the token is always there.
    #
    # @method_decorator is needed because ensure_csrf_cookie was made
    # for plain functions, and get() is a method inside a class.
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        # Logged out is a normal answer, not an error - so no 403.
        # 204 = "No Content": nobody here. The frontend's authRequest
        # already turns a 204 into null, so React gets user = null.
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(user_data(request.user))


# ---------------------------------------------------------------
# AUTHORS (the "Authors to Follow" row on the homepage)
# ---------------------------------------------------------------

# GET /api/accounts/authors/?limit=6
#
# People who have written at least one published story, most
# stories first:
#   [ { "username": "the_keeper", "story_count": 12,
#       "follower_count": 3, "is_following": false }, ... ]
class AuthorListView(APIView):
    def get(self, request):
        User = get_user_model()

        # Count only stories the public can see: published, and not
        # scheduled for later. 'stories' is the related_name on
        # Story.author. Same rule as categories_with_counts().
        visible = Q(stories__is_published=True) & (
            Q(stories__publish_at__isnull=True) | Q(stories__publish_at__lte=timezone.now())
        )
        authors = (
            User.objects
            .annotate(
                story_count=Count('stories', filter=visible, distinct=True),
                follower_count=Count('followers', distinct=True),
            )
            .filter(story_count__gt=0)          # __gt = "greater than"
            .order_by('-story_count', 'username')
        )

        limit = request.query_params.get('limit')
        if limit and limit.isdigit():
            authors = authors[:int(limit)]

        # Who do *I* follow? One query, turned into a set of ids, so
        # checking each author below doesn't ask the database again.
        following_ids = set()
        if request.user.is_authenticated:
            following_ids = set(request.user.following.values_list('following_id', flat=True))

        data = [
            {
                'username': author.username,
                'story_count': author.story_count,
                'follower_count': author.follower_count,
                'is_following': author.id in following_ids,
            }
            for author in authors
        ]
        return Response(data)


# POST /api/accounts/authors/the_keeper/follow/
#   -> { "following": true, "follower_count": 4 }
# Click once to follow, again to unfollow. Logged-in users only.
class ToggleFollowView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, username):
        author = get_object_or_404(get_user_model(), username=username)

        if author == request.user:
            return Response({'detail': "You can't follow yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # Same 3 steps as toggle() in stories/views.py (like / save).
        # We can't just call it: that one expects fields called user
        # and story, and Follow's are follower and following.
        row, created = Follow.objects.get_or_create(follower=request.user, following=author)
        if not created:
            row.delete()

        return Response({'following': created, 'follower_count': author.followers.count()})


# ---------------------------------------------------------------
# PROFILE PAGE
# ---------------------------------------------------------------

# GET /api/accounts/profile/christopher/
#
# Everything the top of a profile page needs, in one request:
#   { "username": "christopher", "date_joined": "...",
#     "story_count": 3, "follower_count": 5, "following_count": 2,
#     "total_views": 120, "total_likes": 14,
#     "is_following": false, "is_me": true }
#
# Anyone can look at a profile. The stories themselves come from
# /api/stories/?author=christopher (StoryListView).
class ProfileView(APIView):
    def get(self, request, username):
        # Wrong username -> 404, and React shows "not found".
        person = get_object_or_404(get_user_model(), username=username)

        # Only stories the public can see count - no drafts, nothing
        # scheduled for later. (published_stories() in stories/models.py.)
        stories = published_stories().filter(author=person)

        # .aggregate() asks the DATABASE to add up a column over many
        # rows (SQL "SUM"). It gives None when there are no rows, so
        # "or 0" turns that into a normal 0.
        total_views = stories.aggregate(total=Sum('views'))['total'] or 0

        # All likes on any of their stories. story__in = "the story is
        # one of these".
        total_likes = Like.objects.filter(story__in=stories).count()

        is_me = request.user.is_authenticated and request.user == person
        is_following = (
            request.user.is_authenticated
            and not is_me
            and Follow.objects.filter(follower=request.user, following=person).exists()
        )

        return Response({
            'username': person.username,
            'date_joined': person.date_joined,
            'story_count': stories.count(),
            'follower_count': person.followers.count(),
            'following_count': person.following.count(),
            'total_views': total_views,
            'total_likes': total_likes,
            'is_following': is_following,
            'is_me': is_me,
        })


# ---------------------------------------------------------------
# SETTINGS PAGE (/settings in React). Everything is logged-in only.
# ---------------------------------------------------------------

# Everything the Settings page shows, in one object.
def settings_data(user):
    profile = get_profile(user)
    data = ProfileSettingsSerializer(profile).data

    # The serializer sends the avatar as a path (or None). Send the
    # same '' for "no avatar" as user_data() does.
    data['avatar'] = profile.avatar.url if profile.avatar else ''

    # Username and email live on the User, not on the Profile.
    data['username'] = user.username
    data['email'] = user.email
    return data


# GET   /api/accounts/settings/  -> all your settings
# PATCH /api/accounts/settings/  -> change SOME of them
#
# Each section of the page sends only its own fields, e.g. the
# Notifications switch sends just weekly_digest=false.
class SettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(settings_data(request.user))

    def patch(self, request):
        user = request.user

        # partial=True = "fields you don't send stay as they are".
        serializer = ProfileSettingsSerializer(get_profile(user), data=request.data, partial=True)

        # Check everything first and save nothing yet - so a taken
        # username doesn't leave half the form saved.
        errors = {} if serializer.is_valid() else dict(serializer.errors)

        new_username = request.data.get('username')
        if new_username is not None:
            new_username = new_username.strip()
            User = get_user_model()
            if not new_username:
                errors['username'] = ['Username is required.']
            elif User.objects.filter(username__iexact=new_username).exclude(id=user.id).exists():
                # exclude(id=user.id): keeping your OWN name is fine.
                errors['username'] = ['That username is already taken.']

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        if new_username is not None:
            user.username = new_username
            user.save()

        return Response(settings_data(user))


# POST /api/accounts/change-password/
#   { current_password, new_password }
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current = request.data.get('current_password', '')
        new = request.data.get('new_password', '')

        # check_password compares with the saved hash.
        if not user.check_password(current):
            return Response(
                {'current_password': ['That is not your current password.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Same rules as Sign Up (AUTH_PASSWORD_VALIDATORS). A weak
        # password raises an error holding a list of messages.
        try:
            validate_password(new, user)
        except ValidationError as error:
            return Response({'new_password': error.messages}, status=status.HTTP_400_BAD_REQUEST)

        # set_password hashes it (never write user.password = new).
        user.set_password(new)
        user.save()

        # A new password logs you out everywhere - including here.
        # This line keeps THIS browser logged in.
        update_session_auth_hash(request, user)
        return Response({'detail': 'Password changed.'})


# POST /api/accounts/delete/   { password }
# POST and not DELETE, because we send the password along.
class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.check_password(request.data.get('password', '')):
            return Response({'password': ['Wrong password.']}, status=status.HTTP_400_BAD_REQUEST)

        logout(request)

        # on_delete=CASCADE everywhere, so their stories, comments,
        # likes and profile are deleted along with them.
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# GET  /api/accounts/blocks/               -> [ "troll99", ... ]
# POST /api/accounts/blocks/  { username }  -> the new list
class BlockListView(APIView):
    permission_classes = [IsAuthenticated]

    # values_list(..., flat=True) = just the usernames, not whole rows.
    def blocked_names(self, user):
        return list(
            user.blocking.order_by('blocked__username').values_list('blocked__username', flat=True)
        )

    def get(self, request):
        return Response(self.blocked_names(request.user))

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        person = get_user_model().objects.filter(username__iexact=username).first()

        if person is None:
            return Response({'detail': 'No user with that username.'}, status=status.HTTP_400_BAD_REQUEST)
        if person == request.user:
            return Response({'detail': "You can't block yourself."}, status=status.HTTP_400_BAD_REQUEST)

        Block.objects.get_or_create(blocker=request.user, blocked=person)
        return Response(self.blocked_names(request.user))


# DELETE /api/accounts/blocks/troll99/  -> unblock them
class UnblockView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, username):
        Block.objects.filter(blocker=request.user, blocked__username=username).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# GET /api/accounts/export/  -> everything about you, as JSON.
# React turns the answer into a file download.
# No password in here (we only have the hash, and it stays private).
class ExportDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'account': {
                'username': user.username,
                'email': user.email,
                'date_joined': user.date_joined,
            },
            'settings': settings_data(user),
            # .values() = plain dictionaries with only these columns.
            'stories': list(user.stories.values('id', 'title', 'body', 'is_published', 'created_at')),
            'comments': list(Comment.objects.filter(author=user).values('story_id', 'body', 'created_at')),
            'liked_story_ids': list(Like.objects.filter(user=user).values_list('story_id', flat=True)),
            'saved_story_ids': list(Bookmark.objects.filter(user=user).values_list('story_id', flat=True)),
            'following': list(user.following.values_list('following__username', flat=True)),
        })


# ---------------------------------------------------------------
# LEADERBOARD (/leaderboard in React)
# ---------------------------------------------------------------

# How many published stories make you an "Elite Member".
# Change this one number to make the Elite tab harder or easier.
ELITE_MIN_STORIES = 10


# GET /api/accounts/leaderboard/             -> all writers
# GET /api/accounts/leaderboard/?tab=elite   -> only Elite Members
#
# Writers with at least one published story, most likes first:
#   [ { "rank": 1, "username": "the_keeper", "avatar": "",
#       "story_count": 20, "follower_count": 0,
#       "total_likes": 0, "total_views": 10, "is_elite": true }, ... ]
#
# Anyone can see it, logged in or not.
class LeaderboardView(APIView):
    def get(self, request):
        stories = published_stories()

        # --- Step 1: stories and views per author, in ONE query ---
        # .values('author') + .annotate() = SQL "GROUP BY author":
        # one row per author, with the numbers added up.
        #   [ { 'author': 3, 'story_count': 20, 'total_views': 10 }, ... ]
        #
        # The empty .order_by() matters! Story has ordering =
        # ['-created_at'] in its Meta, and Django would add created_at
        # to the GROUP BY - giving one row per STORY instead of one per
        # author. .order_by() with nothing in it switches that off.
        per_author = stories.order_by().values('author').annotate(
            story_count=Count('id'),
            total_views=Sum('views'),
        )

        # --- Step 2: likes per author, in ONE more query ---
        # Every Like on a published story, grouped by who WROTE it.
        likes = (
            Like.objects.filter(story__in=stories)
            .order_by()                   # same reason as above
            .values('story__author')
            .annotate(total=Count('id'))
        )
        # Turn the list into a dictionary { author_id: likes } so we
        # can look an author up instantly in step 3.
        likes_by_author = {row['story__author']: row['total'] for row in likes}

        # Why two queries and not one big annotate()? Counting likes
        # AND adding up views in the same query joins the tables
        # together, and every view count gets added once PER LIKE -
        # the numbers come out far too big. Two small queries are
        # simpler and always right.

        # --- Step 3: the users themselves (name, avatar, followers) ---
        author_ids = [row['author'] for row in per_author]
        users = (
            get_user_model().objects
            .filter(id__in=author_ids)
            .select_related('profile')    # avatar, without 1 query per user
            .annotate(follower_count=Count('followers'))
        )
        users_by_id = {user.id: user for user in users}

        # --- Step 4: glue it all together ---
        rows = []
        for row in per_author:
            user = users_by_id[row['author']]

            # Only the Elite tab? Skip anyone below the bar.
            if request.query_params.get('tab') == 'elite' and row['story_count'] < ELITE_MIN_STORIES:
                continue

            # hasattr: users made before Profile existed may not have
            # one yet - then there's no avatar either.
            has_avatar = hasattr(user, 'profile') and user.profile.avatar

            rows.append({
                'username': user.username,
                'avatar': user.profile.avatar.url if has_avatar else '',
                'story_count': row['story_count'],
                'follower_count': user.follower_count,
                # .get(..., 0): no row in likes_by_author = no likes.
                'total_likes': likes_by_author.get(user.id, 0),
                'total_views': row['total_views'] or 0,
                'is_elite': row['story_count'] >= ELITE_MIN_STORIES,
            })

        # Most likes first. When two writers have the same likes, the
        # one with more views goes higher. The "-" means "biggest first".
        rows.sort(key=lambda item: (-item['total_likes'], -item['total_views'], item['username']))

        # Now that the order is fixed, give out the ranks: 1, 2, 3...
        # enumerate(rows, start=1) gives (1, first row), (2, second row)...
        for rank, item in enumerate(rows, start=1):
            item['rank'] = rank

        # Top 50 is plenty for one page.
        return Response(rows[:50])
