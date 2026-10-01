from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Series, stories_for
from .serializers import StoryCardSerializer


# ---------------------------------------------------------------
# SERIES
#
#   GET  /api/series/mine/          -> my series (for the picker on the Write page)
#   POST /api/series/mine/  { title, description }  -> make a new one
#   GET  /api/series/<id>/          -> one series + its parts (anyone)
#
# A story joins a series on the Write page (StoryWriteSerializer
# gives it the next part number by itself).
# ---------------------------------------------------------------

def series_data(series, part_count):
    return {
        'id': series.id,
        'title': series.title,
        'description': series.description,
        'author': series.author.username,
        'part_count': part_count,
    }


class MySeriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        mine = request.user.series.all()
        # part_count here counts drafts too - it's your own list.
        return Response([series_data(series, series.parts.count()) for series in mine])

    def post(self, request):
        title = (request.data.get('title') or '').strip()
        if not title:
            return Response({'title': ['Give the series a name.']}, status=400)
        if request.user.series.filter(title__iexact=title).exists():
            return Response({'title': ['You already have a series with that name.']}, status=400)
        series = Series.objects.create(
            author=request.user,
            title=title[:150],
            description=(request.data.get('description') or '').strip()[:300],
        )
        return Response(series_data(series, 0), status=201)


class SeriesDetailView(APIView):
    def get(self, request, pk):
        series = get_object_or_404(Series.objects.select_related('author'), pk=pk)
        # Only the parts THIS visitor may read (published, not blocked...).
        parts = stories_for(request.user).filter(series=series).order_by('series_part').select_related('author', 'category')
        data = series_data(series, parts.count())
        data['parts'] = StoryCardSerializer(parts, many=True, context={'request': request}).data
        return Response(data)
