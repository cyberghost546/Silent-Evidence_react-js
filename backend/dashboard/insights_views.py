import ipaddress
from datetime import datetime, time, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q, Sum
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from categories.models import Category
from moderation.models import LoginEvent
from stories.models import Story, Comment, Like, published_stories
from .models import BlockedIP


ALLOWED_DAYS = (7, 30, 90, 365)


def days_param(request):
    try:
        days = int(request.query_params.get('days', 30))
    except ValueError:
        return 30
    return days if days in ALLOWED_DAYS else 30


# ===============================================================
# LOGIN MAP  GET /api/dashboard/login-map/?days=30
#
# "Where do logins come from?" An IP address alone doesn't say where
# someone is - you need a lookup table (a "GeoIP database").
#
# OPTIONAL: countries. Free, but you have to download it yourself:
#   1. pip install geoip2
#   2. make a free account at maxmind.com, download
#      "GeoLite2 Country" (a .mmdb file)
#   3. put it at backend/geoip/GeoLite2-Country.mmdb
#      (or set GEOIP_COUNTRY_DB in settings.py to another path)
# Without it, everything still works - just no country names.
# ===============================================================

def geoip_path():
    return getattr(settings, 'GEOIP_COUNTRY_DB', settings.BASE_DIR / 'geoip' / 'GeoLite2-Country.mmdb')


# Returns a function ip -> 'Netherlands' (or None), or None when the
# database isn't installed. Opened once per request, not once per IP.
def country_lookup():
    try:
        import geoip2.database
        import geoip2.errors
    except ImportError:
        return None
    path = geoip_path()
    if not path.exists():
        return None
    reader = geoip2.database.Reader(str(path))

    def lookup(ip):
        try:
            return reader.country(ip).country.name
        except (geoip2.errors.AddressNotFoundError, ValueError):
            return None
    return lookup


# 'local'   = this computer (127.0.0.1) - you, while developing
# 'private' = a home / office network (192.168..., 10...)
# 'public'  = a real internet address
def ip_kind(ip):
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        return 'unknown'
    if address.is_loopback:
        return 'local'
    if address.is_private:
        return 'private'
    return 'public'


class LoginMapView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        days = days_param(request)
        since = timezone.now() - timedelta(days=days)
        events = LoginEvent.objects.filter(created_at__gte=since).exclude(ip_address__isnull=True)

        # One row per IP: GROUP BY ip_address, with the counts.
        # Count(..., distinct=True) = how many DIFFERENT usernames.
        rows = (
            events.values('ip_address')
            .annotate(
                successful=Count('id', filter=Q(success=True)),
                failed=Count('id', filter=Q(success=False)),
                accounts=Count('username', distinct=True),
                # Different names with a WRONG password. Many members
                # can share one address (a family, an office, a school),
                # so only failures count as suspicious.
                failed_accounts=Count('username', filter=Q(success=False), distinct=True),
                last_seen=Max('created_at'),
            )
            .order_by('-successful', '-failed')
        )

        lookup = country_lookup()
        blocked = set(BlockedIP.objects.values_list('ip_address', flat=True))

        ips = []
        by_country = {}
        for row in rows[:300]:
            ip = row['ip_address']
            kind = ip_kind(ip)
            if kind == 'public':
                country = (lookup(ip) if lookup else None) or 'Unknown country'
            else:
                country = 'This computer' if kind == 'local' else 'Private network'
            ips.append({
                'ip_address': ip,
                'kind': kind,
                'country': country,
                'successful': row['successful'],
                'failed': row['failed'],
                'accounts': row['accounts'],
                # Wrong passwords for many accounts from one address =
                # someone guessing passwords - worth a look.
                'suspicious': row['failed_accounts'] >= 3 or row['failed'] >= 10,
                'blocked': ip in blocked,
                'last_seen': row['last_seen'],
            })
            place = by_country.setdefault(country, {'country': country, 'successful': 0, 'failed': 0})
            place['successful'] += row['successful']
            place['failed'] += row['failed']

        return Response({
            'days': days,
            'geoip_installed': lookup is not None,
            'countries': sorted(by_country.values(), key=lambda place: -(place['successful'] + place['failed'])),
            'ips': ips,
            'totals': {
                'successful': events.filter(success=True).count(),
                'failed': events.filter(success=False).count(),
                'ips': len(ips),
            },
        })


# ===============================================================
# ANALYTICS  GET /api/dashboard/analytics/?days=30
#
# How is the site doing? For the chosen period:
#   - tiles: sign-ups, stories, comments, likes, logins - with the
#     number from the period BEFORE, to show up / down
#   - series: one count per day, for the chart
#   - top stories (by views) and top categories
#
# (Story views are one running total per story - there's no date per
# view - so "most viewed" is all-time, not per period.)
# ===============================================================

# name -> (label, function(start, end) giving the date-times to count)
METRICS = {
    'signups': ('Sign-ups', lambda a, b: get_user_model().objects.filter(date_joined__gte=a, date_joined__lt=b).values_list('date_joined', flat=True)),
    'stories': ('Stories published', lambda a, b: Story.objects.filter(is_published=True, created_at__gte=a, created_at__lt=b).values_list('created_at', flat=True)),
    'comments': ('Comments', lambda a, b: Comment.objects.filter(created_at__gte=a, created_at__lt=b).values_list('created_at', flat=True)),
    'likes': ('Likes', lambda a, b: Like.objects.filter(created_at__gte=a, created_at__lt=b).values_list('created_at', flat=True)),
    'logins': ('Logins', lambda a, b: LoginEvent.objects.filter(success=True, created_at__gte=a, created_at__lt=b).values_list('created_at', flat=True)),
}


class AnalyticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        days = days_param(request)
        today = timezone.localdate()
        # The period = the last `days` days INCLUDING today.
        first_day = today - timedelta(days=days - 1)
        start = timezone.make_aware(datetime.combine(first_day, time.min))   # midnight
        end = timezone.now()
        previous_start = start - timedelta(days=days)

        # Every day in the period, so days with 0 still get a bar.
        all_days = [first_day + timedelta(days=n) for n in range(days)]

        tiles = []
        series = {}
        for key, (label, moments) in METRICS.items():
            per_day = {day: 0 for day in all_days}
            for moment in moments(start, end):
                day = timezone.localtime(moment).date()
                if day in per_day:
                    per_day[day] += 1
            series[key] = [{'date': day.isoformat(), 'count': count} for day, count in per_day.items()]
            tiles.append({
                'key': key,
                'label': label,
                'total': sum(per_day.values()),
                'previous': moments(previous_start, start).count(),
            })

        top_stories = [
            {'id': story.id, 'title': story.title, 'author': story.author.username, 'views': story.views}
            for story in published_stories().select_related('author').order_by('-views')[:5]
        ]
        visible = Q(stories__is_published=True, stories__is_archived=False)
        top_categories = [
            {'name': category.name, 'slug': category.slug, 'stories': category.story_count, 'views': category.total_views or 0}
            for category in Category.objects.annotate(
                story_count=Count('stories', filter=visible),
                total_views=Sum('stories__views', filter=visible),
            ).filter(story_count__gt=0).order_by('-total_views')[:5]
        ]

        return Response({
            'days': days,
            'tiles': tiles,
            'series': series,
            'top_stories': top_stories,
            'top_categories': top_categories,
        })
