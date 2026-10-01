from django.db.models import Count, Max
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.notifications import notify, short_title
from dashboard.limits import hourly_limit_reached
from dashboard.models import SiteSettings
from moderation.content_filter import check_text, BLOCKED_MESSAGE
from .models import Chain, ChainPart


# ---------------------------------------------------------------
# STORY CHAIN API
#
#   GET  /api/chains/                       -> all chains (open ones first)
#   POST /api/chains/  { title, opening }   -> start one (members)
#   GET  /api/chains/<id>/                  -> a chain + all its parts
#   POST /api/chains/<id>/  { body }        -> add the next part (members)
# Admins:
#   PATCH  /api/dashboard/chains/<id>/  { is_open }
#   DELETE /api/dashboard/chains/<id>/
# ---------------------------------------------------------------
PART_MAX_LENGTH = 1500


# The checks for an opening AND for every next part.
def check_part(request, text):
    if not text:
        return 'Write something first.'
    if len(text) > PART_MAX_LENGTH:
        return f'Keep your part under {PART_MAX_LENGTH} characters.'
    if check_text(text)[0] == 'block':
        return BLOCKED_MESSAGE
    limit = SiteSettings.load().comments_per_hour
    if hourly_limit_reached(request.user, request.user.chain_parts.all(), limit):
        return f'You can add up to {limit} parts an hour.'
    return None


def chain_card(chain, part_count, last_part_at):
    return {
        'id': chain.id,
        'title': chain.title,
        'started_by': chain.started_by.username,
        'is_open': chain.is_open,
        'part_count': part_count,
        'max_parts': chain.max_parts,
        'last_activity': last_part_at or chain.created_at,
    }


def part_data(part):
    return {'id': part.id, 'author': part.author.username, 'body': part.body, 'created_at': part.created_at}


class ChainListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        chains = (
            Chain.objects.select_related('started_by')
            .annotate(part_count=Count('parts'), last_part_at=Max('parts__created_at'))
            # Open chains first, then the most recently active.
            .order_by('-is_open', '-last_part_at')
        )
        return Response([chain_card(c, c.part_count, c.last_part_at) for c in chains[:100]])

    def post(self, request):
        title = (request.data.get('title') or '').strip()
        opening = (request.data.get('opening') or '').strip()
        if not title:
            return Response({'detail': 'Give the chain a title.'}, status=400)
        problem = check_part(request, opening)
        if problem:
            return Response({'detail': problem}, status=400)
        chain = Chain.objects.create(title=title[:120], started_by=request.user)
        ChainPart.objects.create(chain=chain, author=request.user, body=opening)
        return Response(chain_card(chain, 1, None), status=201)


class ChainDetailView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        chain = get_object_or_404(Chain.objects.select_related('started_by'), pk=pk)
        parts = list(chain.parts.select_related('author'))
        data = chain_card(chain, len(parts), parts[-1].created_at if parts else None)
        data['parts'] = [part_data(part) for part in parts]
        # Whose turn? Anyone except whoever wrote the last part.
        data['last_author'] = parts[-1].author.username if parts else None
        return Response(data)

    def post(self, request, pk):
        chain = get_object_or_404(Chain, pk=pk)
        if not chain.is_open:
            return Response({'detail': 'This chain is finished - start a new one!'}, status=400)
        last = chain.parts.select_related('author').last()
        if last and last.author == request.user:
            return Response({'detail': 'You wrote the last part - let someone else continue first.'}, status=400)
        body = (request.data.get('body') or '').strip()
        problem = check_part(request, body)
        if problem:
            return Response({'detail': problem}, status=400)

        part = ChainPart.objects.create(chain=chain, author=request.user, body=body)
        # The last allowed part closes the chain: "The End".
        if chain.parts.count() >= chain.max_parts:
            chain.is_open = False
            chain.save(update_fields=['is_open'])
        if last:
            notify(last.author, request.user, 'chain',
                   f'{request.user.username} continued your part of "{short_title(chain.title)}"', f'/chains/{chain.id}')
        return Response(part_data(part), status=201)


class AdminChainView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        chain = get_object_or_404(Chain, pk=pk)
        chain.is_open = request.data.get('is_open') in (True, 'true')
        chain.save(update_fields=['is_open'])
        return Response({'is_open': chain.is_open})

    def delete(self, request, pk):
        get_object_or_404(Chain, pk=pk).delete()
        return Response(status=204)
