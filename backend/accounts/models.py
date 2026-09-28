from django.conf import settings
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------
# FOLLOW - "this user follows that author".
#
# Same idea as Like in stories/models.py: a row exists (following)
# or it doesn't (not following). Follow = create it, unfollow =
# delete it.
#
# Two ForeignKeys to the SAME table (users), so each needs its own
# related_name, or Django can't tell them apart:
#   user.following.all()  -> the Follow rows where I'm the follower
#   user.followers.all()  -> the Follow rows where I'm being followed
# ---------------------------------------------------------------
class Follow(models.Model):
    follower = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='following')
    following = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Nobody can follow the same person twice.
        unique_together = ['follower', 'following']

    def __str__(self):
        return f'{self.follower} follows {self.following}'


# ---------------------------------------------------------------
# PROFILE - everything on the Settings page that Django's own User
# doesn't have (avatar, bio, preferences...).
#
# OneToOneField = "exactly one Profile per user". It's a ForeignKey
# that also stops a user from getting a second one.
#   user.profile  -> this user's Profile
#
# Old users don't have one yet, so always get it with
# get_profile(user) below - it makes one the first time.
# ---------------------------------------------------------------
class Profile(models.Model):
    # The (value in the database, label people read) pairs.
    # The frontend's settingsOptions.js must use the same values.
    CONTENT_ACCESS = [
        ('all', 'All Ages only'),
        ('teen', 'Up to 13+'),
        ('mature', 'Full Access'),
    ]
    READING_SPEEDS = [
        ('slow', 'Slow'),
        ('average', 'Average'),
        ('fast', 'Fast'),
    ]
    DIGEST_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('never', 'Never'),
    ]
    THEMES = [
        ('blood-red', 'Blood Red'),
        ('ghost-blue', 'Ghost Blue'),
        ('void', 'Void'),
        ('crimson', 'Crimson'),
        ('shadow', 'Shadow'),
        ('toxic', 'Toxic'),
    ]
    BORDERS = [
        ('none', 'None'),
        ('pulse', 'Pulse Glow'),
        ('orbit', 'Orbit Ring'),
        ('flicker', 'Flicker'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')

    # --- Profile ---
    avatar = models.ImageField(upload_to='avatars/', blank=True)
    bio = models.TextField(max_length=500, blank=True)
    website = models.URLField(blank=True)

    # --- Reading preferences ---
    content_access = models.CharField(max_length=10, choices=CONTENT_ACCESS, default='mature')
    # Up to 3 moods, saved as one string: "creepy,gore,dark".
    fear_moods = models.CharField(max_length=100, blank=True)
    reading_speed = models.CharField(max_length=10, choices=READING_SPEEDS, default='average')

    # Confirmed once to read 18+ stories (accounts/age.py). null = not yet.
    # Locked after that - only an admin can reset it (Users page).
    birth_date = models.DateField(null=True, blank=True)

    # Did they click the link in the "confirm your email" email?
    # (accounts/email_views.py) Newsletters and digests only go to
    # confirmed addresses - so nobody gets mail for an account someone
    # else made with their address.
    email_verified = models.BooleanField(default=False)

    # --- Notifications ---
    # The bell: which kinds they want (Settings -> Notifications).
    # Co-author invites and support answers can't be switched off -
    # they need an answer from you.
    notify_likes = models.BooleanField(default=True)
    notify_comments = models.BooleanField(default=True)   # comments AND replies
    notify_follows = models.BooleanField(default=True)

    weekly_digest = models.BooleanField(default=True)
    comment_digest = models.CharField(max_length=10, choices=DIGEST_CHOICES, default='weekly')

    # --- Appearance ---
    profile_theme = models.CharField(max_length=20, choices=THEMES, default='blood-red')
    avatar_border = models.CharField(max_length=20, choices=BORDERS, default='none')

    # --- Account ---
    is_private = models.BooleanField(default=False)

    # --- Set by admins on the Admin Dashboard -> Users page ---
    # role: 'user' = reads and comments, 'author' = has written a
    # story (set automatically on the first one, see StoryCreateView).
    # "Admin" is NOT stored here - that's Django's own user.is_staff.
    ROLES = [
        ('user', 'User'),
        ('author', 'Author'),
    ]
    role = models.CharField(max_length=10, choices=ROLES, default='user')

    # A checkmark next to the name: "this person is who they say".
    is_verified = models.BooleanField(default=False)

    # The PRO badge. (There's no payment system - an admin switches it on.)
    is_premium = models.BooleanField(default=False)

    def __str__(self):
        return f'Profile of {self.user}'


def get_profile(user):
    # get_or_create answers (the row, True/False "was it just made").
    # We only want the row, so the second value goes into _ (= "ignore").
    profile, _ = Profile.objects.get_or_create(user=user)
    return profile


# For LISTS only (forum replies, the admin Users table): the view
# already loaded every profile together with its user, using
# .select_related('profile') or ('author__profile'). Use that copy -
# no extra query per row. (get_profile() would ask the database
# again for every single row: the "N+1 problem".)
#
# Why not make get_profile() do this everywhere? Because then a view
# that changes a profile and reads it again could get the OLD copy.
# In a list that only READS, the loaded copy is always right.
def loaded_profile(user):
    try:
        return user.profile
    except Profile.DoesNotExist:
        # A user who never had a profile row yet (older accounts).
        return get_profile(user)


# ---------------------------------------------------------------
# BLOCK - "this user blocked that user". Same shape as Follow above.
#   user.blocking.all()  -> the Block rows where I blocked someone
# ---------------------------------------------------------------
class Block(models.Model):
    blocker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blocking')
    blocked = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blocked_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['blocker', 'blocked']

    def __str__(self):
        return f'{self.blocker} blocked {self.blocked}'



# ---------------------------------------------------------------
# PREMIUM MEMBERSHIP - one row per time someone got premium.
#
# There's no online payment yet: an admin records it on
# Admin Dashboard -> Premium Members ("gift", or with the amount
# they paid another way). The Revenue page adds up `amount`.
#
# Profile.is_premium follows the memberships: on while one is
# running, off when the last one ends (see accounts/premium.py).
# ---------------------------------------------------------------
class PremiumMembership(models.Model):
    PLANS = [
        ('monthly', '1 month'),
        ('yearly', '1 year'),
        ('lifetime', 'Lifetime'),
        ('gift', 'Gift (free)'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='premium_memberships')
    plan = models.CharField(max_length=10, choices=PLANS)
    # DecimalField for money - never FloatField: 0.1 + 0.2 is not
    # exactly 0.3 with floats, and money must add up to the cent.
    amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    starts_at = models.DateTimeField()
    # Empty = never ends (lifetime).
    ends_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-starts_at']

    def __str__(self):
        return f'{self.user} - {self.plan}'

    def is_active(self):
        now = timezone.now()
        if self.cancelled_at or self.starts_at > now:
            return False
        return self.ends_at is None or self.ends_at > now


# ---------------------------------------------------------------
# NOTIFICATIONS - the bell in the header.
# "Sarah liked your story", "Mike started following you", ...
#
# Don't create these by hand - use notify() in accounts/notifications.py,
# which skips notifying yourself, blocked people and duplicates.
# ---------------------------------------------------------------
class Notification(models.Model):
    KINDS = [
        ('like', 'Like'),
        ('comment', 'Comment'),
        ('follow', 'Follow'),
        ('invite', 'Co-author invite'),
        ('support', 'Support reply'),
        ('reply', 'Comment reply'),
        ('forum', 'Forum reply'),
        ('chain', 'Story chain'),
        ('beta', 'Beta reading'),
        ('truestory', 'True story review'),
    ]

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    # Who did it. SET_NULL: the notification stays if they delete their account.
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    kind = models.CharField(max_length=10, choices=KINDS)
    text = models.CharField(max_length=300)
    link = models.CharField(max_length=200)        # the page to open, e.g. '/stories/5'
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.recipient}: {self.text}'
