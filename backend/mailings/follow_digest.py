from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mass_mail
from django.db.models import Q
from django.utils import timezone

from accounts.age import is_adult
from accounts.models import Follow
from stories.models import stories_for
from .email_templates import render_email


# ---------------------------------------------------------------
# "NEW FROM WRITERS YOU FOLLOW" - once a day, one email per member
# with the stories their followed writers published in the last day.
#
#   python manage.py send_follow_digest     (a daily scheduled job)
#
# "Published in the last day" also counts SCHEDULED stories whose
# time came (publish_at) - that's why this is a daily job and not an
# email at the moment of publishing.
# stories_for(member): only stories THEY may read (18+ setting,
# blocked writers...). No new stories -> no email.
# ---------------------------------------------------------------
WINDOW = timedelta(days=1)


def new_stories_for(member, now):
    since = now - WINDOW
    followed = Follow.objects.filter(follower=member).values('following_id')
    # "Went live" in the window: published then (no publish_at), or
    # its scheduled time fell in the window.
    went_live = (Q(publish_at__isnull=True) & Q(created_at__gt=since)) | Q(publish_at__gt=since, publish_at__lte=now)
    stories = stories_for(member).filter(author__in=followed).filter(went_live)
    # 18+ stories are listed on the site but locked until you confirm
    # your age - an email can't lock, so leave them out unless the
    # member is a confirmed adult.
    if not is_adult(member):
        stories = stories.exclude(content_rating='mature')
    return stories.select_related('author').order_by('created_at')


def build_follow_email(member, now=None):
    # -> (subject, body) or None when there's nothing new.
    now = now or timezone.now()
    stories = list(new_stories_for(member, now)[:20])
    if not stories:
        return None
    story_list = ''.join(
        f'\n"{story.title}" by {story.author.username}\n  {settings.SITE_URL}/stories/{story.id}' for story in stories
    )
    return render_email(
        'follow_digest', username=member.username, story_list=story_list, settings_link=f'{settings.SITE_URL}/settings',
    )


def send_follow_digests():
    # -> how many emails went out.
    now = timezone.now()
    members = (
        get_user_model().objects
        .filter(is_active=True, profile__email_verified=True, following__isnull=False)
        .exclude(email='')
        .exclude(profile__follow_digest=False)
        .distinct()
    )
    messages = []
    for member in members:
        email = build_follow_email(member, now)
        if email:
            subject, body = email
            messages.append((subject, body, settings.DEFAULT_FROM_EMAIL, [member.email]))
    send_mass_mail(messages, fail_silently=True)
    return len(messages)
