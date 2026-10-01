from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mass_mail
from django.db.models import Count, Sum
from django.utils import timezone

from sitecontent.models import VillainNomination, week_start
from stories.models import SprintResult, StoryViewDay, published_stories
from .email_templates import render_email
from .models import Newsletter


# ---------------------------------------------------------------
# "TOP OF THE WEEK" email - every Monday, to members who have
# "Weekly Horror Digest" switched on (the same people as the
# newsletter - newsletter_recipients() in views.py).
#
#   - the 5 most-read stories of the last 7 days
#   - last week's Villain of the Week
#   - the top 3 sprinters of last week
#
# The words around these lists are an Email Template ('weekly_top'),
# so admins can change them in Dashboard -> Email Templates.
#
# Send it:  python manage.py send_weekly_top
# (or the "Send now" button on Dashboard -> Newsletter)
# ---------------------------------------------------------------

def top_stories(since):
    # Views per story in the last 7 days (StoryViewDay rows), most first.
    # 18+ stories are left out: an email can't check the reader's age.
    counts = (
        StoryViewDay.objects.filter(date__gte=since, story__in=published_stories().exclude(content_rating='mature'))
        .values('story_id', 'story__title', 'story__author__username')
        .annotate(views=Sum('count'))
        .order_by('-views')[:5]
    )
    return [
        f'{number}. "{row["story__title"]}" by {row["story__author__username"]} - {settings.SITE_URL}/stories/{row["story_id"]}'
        for number, row in enumerate(counts, start=1)
    ]


def villain_line(last_monday):
    winner = (
        VillainNomination.objects.filter(week=last_monday)
        .annotate(vote_count=Count('votes'))
        .order_by('-vote_count', 'created_at')
        .first()
    )
    if not winner:
        return 'No villain was crowned last week - nominate one: ' + f'{settings.SITE_URL}/villains'
    return f'{winner.name} ({winner.vote_count} votes). Vote for this week\'s: {settings.SITE_URL}/villains'


def sprinters_lines(last_monday, this_monday):
    rows = (
        SprintResult.objects.filter(created_at__date__gte=last_monday, created_at__date__lt=this_monday)
        .values('user__username')
        .annotate(words=Sum('words'))
        .order_by('-words')[:3]
    )
    return [f'{row["user__username"]} - {row["words"]} words' for row in rows]


def build_weekly_top(today=None):
    # -> (subject, body) or None when there's nothing worth sending.
    today = today or timezone.localdate()
    this_monday = week_start(today)
    last_monday = this_monday - timedelta(weeks=1)

    stories = top_stories(today - timedelta(days=7))
    if not stories:
        return None   # a quiet week - don't send an empty email

    sprinters = sprinters_lines(last_monday, this_monday)
    return render_email(
        'weekly_top',
        top_stories='\n'.join(stories),
        villain=villain_line(last_monday),
        sprinters='\n'.join(sprinters) if sprinters else f'Nobody sprinted last week - be the first: {settings.SITE_URL}/sprints',
        settings_link=f'{settings.SITE_URL}/settings',
    )


def send_weekly_top(sent_by=None):
    # -> how many emails went out (0 = nothing to send).
    from .views import newsletter_recipients   # here: views.py imports this file too

    email = build_weekly_top()
    if email is None:
        return 0
    subject, body = email
    recipients = list(newsletter_recipients().values_list('email', flat=True))
    # One email per person, so nobody sees the other addresses.
    send_mass_mail(
        [(subject, body, settings.DEFAULT_FROM_EMAIL, [address]) for address in recipients],
        fail_silently=True,
    )
    # Saved like a newsletter, so it shows in the Newsletter history.
    Newsletter.objects.create(subject=subject[:150], body=body, sent_by=sent_by, recipient_count=len(recipients))
    return len(recipients)
