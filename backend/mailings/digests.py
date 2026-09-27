from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db.models import Q
from django.utils import timezone

from stories.models import Comment
from .email_templates import render_email
from .models import DigestRun


# ---------------------------------------------------------------
# THE COMMENT DIGEST - "5 new comments on your stories this week".
#
# Members pick Daily / Weekly / Never on the Settings page
# (Profile.comment_digest). Two ways to send it:
#   - Admin Dashboard -> Comment Digest -> "Send now"
#   - automatically, with the command:
#         python manage.py send_comment_digests weekly
#     run by a scheduler (Windows Task Scheduler / cron) every
#     Monday (weekly) or every morning (daily).
# Both use the functions below, so they always send the same thing.
# ---------------------------------------------------------------

# How far back each period looks.
PERIOD_DAYS = {'daily': 1, 'weekly': 7}


def digest_recipients(period):
    # Members who chose this period. Members WITHOUT a Profile row
    # yet have the default choice, which is 'weekly' - hence the
    # "or no profile" for weekly.
    choice = Q(profile__comment_digest=period)
    if period == 'weekly':
        choice |= Q(profile__isnull=True)
    return get_user_model().objects.filter(choice, is_active=True).exclude(email='')


def new_comments_for(user, period):
    since = timezone.now() - timedelta(days=PERIOD_DAYS[period])
    return (
        Comment.objects
        .filter(story__author=user, created_at__gte=since, is_hidden=False)
        .exclude(author=user)                  # not your own comments
        .select_related('author', 'story')
        .order_by('story__title', 'created_at')
    )


# The email text for one member, or None if nothing new happened
# (nobody wants an email saying "0 new comments").
def build_digest(user, period):
    comments = list(new_comments_for(user, period))
    if not comments:
        return None

    lines = []
    current_story = None
    for comment in comments:
        # A heading each time we get to another story.
        if comment.story_id != current_story:
            current_story = comment.story_id
            lines += ['', f'"{comment.story.title}" - {settings.SITE_URL}/stories/{comment.story_id}']
        # [:200] = keep long comments short in the email.
        lines.append(f'  {comment.author.username}: {comment.body[:200]}')

    # The rest of the wording: Dashboard -> Email Templates.
    subject, body = render_email(
        'comment_digest',
        username=user.username,
        count=len(comments),
        period='today' if period == 'daily' else 'this week',
        comment_list='\n'.join(lines),
        settings_link=f'{settings.SITE_URL}/settings',
    )
    return {'subject': subject, 'body': body, 'comment_count': len(comments)}


# Build and send them all. Returns the DigestRun (how many were sent).
def send_digests(period, started_by=None):
    sent = 0
    for user in digest_recipients(period):
        digest = build_digest(user, period)
        if digest is None:
            continue
        send_mail(digest['subject'], digest['body'], settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
        sent += 1
    return DigestRun.objects.create(period=period, emails_sent=sent, started_by=started_by)
