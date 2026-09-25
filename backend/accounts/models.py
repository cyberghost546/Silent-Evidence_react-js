from django.conf import settings
from django.db import models


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

    # --- Notifications ---
    weekly_digest = models.BooleanField(default=True)
    comment_digest = models.CharField(max_length=10, choices=DIGEST_CHOICES, default='weekly')

    # --- Appearance ---
    profile_theme = models.CharField(max_length=20, choices=THEMES, default='blood-red')
    avatar_border = models.CharField(max_length=20, choices=BORDERS, default='none')

    # --- Account ---
    is_private = models.BooleanField(default=False)

    def __str__(self):
        return f'Profile of {self.user}'


def get_profile(user):
    # get_or_create answers (the row, True/False "was it just made").
    # We only want the row, so the second value goes into _ (= "ignore").
    profile, _ = Profile.objects.get_or_create(user=user)
    return profile


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
