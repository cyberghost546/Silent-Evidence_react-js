from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import PremiumMembership
from accounts.premium import grant_premium, cancel_membership, refresh_premium


# ---------------------------------------------------------------
# PREMIUM MEMBERS and REVENUE (Admin Dashboard). Admins only.
# The rules (how long a plan lasts, extending...) are in
# accounts/premium.py - these views only read and call them.
# ---------------------------------------------------------------

# Money as text with exactly 2 decimals: "43.99".
# SQLite adds decimals up a bit loosely (43.9900000000000), so every
# total goes through here. quantize(Decimal('0.01')) = round to cents.
def money(value):
    return str(Decimal(value or 0).quantize(Decimal('0.01')))


def membership_data(membership):
    return {
        'id': membership.id,
        'user': membership.user.username,
        'plan': membership.plan,
        'plan_label': membership.get_plan_display(),
        'amount': money(membership.amount),
        'starts_at': membership.starts_at,
        'ends_at': membership.ends_at,
        'cancelled_at': membership.cancelled_at,
        'is_active': membership.is_active(),
        'note': membership.note,
        'created_by': membership.created_by.username if membership.created_by else None,
    }


# GET  /api/dashboard/premium/  -> { members, history, currency }
# POST /api/dashboard/premium/  { username, plan, amount, note, gift_days }
class PremiumMembersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        memberships = PremiumMembership.objects.select_related('user', 'created_by')

        # First switch off anyone whose time ran out (refresh_premium),
        # so the list below is up to date.
        for user_id in memberships.values_list('user', flat=True).distinct():
            refresh_premium(get_user_model().objects.get(pk=user_id))

        # Everyone with the PRO badge now - also the ones switched on
        # by hand on the Users page (they have no membership rows).
        members = []
        for user in get_user_model().objects.filter(profile__is_premium=True).order_by('username'):
            mine = [m for m in memberships if m.user_id == user.id]
            running = [m for m in mine if m.is_active()]
            members.append({
                'username': user.username,
                # The LAST end date of the running memberships (None =
                # lifetime, or no membership at all).
                'ends_at': None if any(m.ends_at is None for m in running) else max((m.ends_at for m in running), default=None),
                'has_membership': bool(running),
                'total_paid': money(sum((m.amount for m in mine), Decimal('0'))),
            })

        return Response({
            'currency': settings.CURRENCY,
            'members': members,
            'history': [membership_data(m) for m in memberships[:200]],
        })

    def post(self, request):
        user = get_user_model().objects.filter(username__iexact=(request.data.get('username') or '').strip()).first()
        if user is None:
            return Response({'detail': 'No member with that username.'}, status=400)

        plan = request.data.get('plan')
        if plan not in ('monthly', 'yearly', 'lifetime', 'gift'):
            return Response({'detail': 'Pick a plan.'}, status=400)

        # Decimal(...) turns the text "4.99" into an exact number.
        # A gift is always free.
        try:
            amount = Decimal('0') if plan == 'gift' else Decimal(str(request.data.get('amount') or '0'))
        except InvalidOperation:
            return Response({'detail': 'The amount must be a number, like 4.99'}, status=400)
        if amount < 0:
            return Response({'detail': "The amount can't be negative."}, status=400)

        gift_days = int(request.data.get('gift_days') or 30)
        membership = grant_premium(user, plan, amount, (request.data.get('note') or '')[:200], request.user, gift_days)
        return Response(membership_data(membership), status=201)


# POST /api/dashboard/premium/5/cancel/
class CancelMembershipView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        membership = get_object_or_404(PremiumMembership, pk=pk)
        cancel_membership(membership)
        return Response(membership_data(membership))


# GET /api/dashboard/revenue/
#   -> the last 12 months (money + new memberships), totals, per plan
class RevenueView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        paid = PremiumMembership.objects.filter(amount__gt=0, cancelled_at__isnull=True)

        # TruncMonth = "cut the date down to the month", so all of
        # September lands in one group. values + annotate = GROUP BY.
        year_ago = timezone.now() - timedelta(days=365)
        per_month = (
            paid.filter(created_at__gte=year_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('month')
        )
        found = {row['month'].strftime('%Y-%m'): row for row in per_month}

        # All 12 months, also the ones with 0 - a chart with gaps
        # would skip months and look wrong.
        months = []
        today = timezone.localdate().replace(day=1)
        for back in range(11, -1, -1):
            # Go back `back` months from this month.
            year = today.year + (today.month - 1 - back) // 12
            month = (today.month - 1 - back) % 12 + 1
            key = f'{year}-{month:02d}'
            row = found.get(key)
            months.append({
                'key': key,
                'label': f'{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month - 1]} {str(year)[2:]}',
                'total': money(row['total'] if row else 0),
                'count': row['count'] if row else 0,
            })

        by_plan = paid.values('plan').annotate(total=Sum('amount'), count=Count('id')).order_by('-total')

        return Response({
            'currency': settings.CURRENCY,
            'total_all_time': money(paid.aggregate(total=Sum('amount'))['total']),
            'this_month': months[-1]['total'],
            'last_month': months[-2]['total'],
            'months': months,
            'by_plan': [{'plan': row['plan'], 'total': money(row['total']), 'count': row['count']} for row in by_plan],
            'active_premium': get_user_model().objects.filter(profile__is_premium=True).count(),
        })
