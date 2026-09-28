import re

from rest_framework import generics, serializers
from rest_framework.permissions import IsAdminUser

from stories.models import Story
from .models import Video


# ---------------------------------------------------------------
# VIDEOS API
#   GET  /api/videos/                     - the list (anyone)
#   GET  /api/dashboard/videos/           - the same, for admins
#   POST /api/dashboard/videos/  { url, title, description, story_id }
#   DELETE /api/dashboard/videos/<id>/
# ---------------------------------------------------------------

# The 11-character video id from any usual YouTube link:
#   https://www.youtube.com/watch?v=dQw4w9WgXcQ
#   https://youtu.be/dQw4w9WgXcQ
#   https://www.youtube.com/shorts/dQw4w9WgXcQ
#   https://www.youtube.com/embed/dQw4w9WgXcQ
YOUTUBE_ID = re.compile(r'(?:youtube\.com/(?:watch\?(?:.*&)?v=|shorts/|embed/)|youtu\.be/)([A-Za-z0-9_-]{11})')


def youtube_id_from(url):
    match = YOUTUBE_ID.search(url or '')
    return match.group(1) if match else None


class VideoSerializer(serializers.ModelSerializer):
    # write_only: sent IN (the link), never sent back out.
    url = serializers.CharField(write_only=True)
    story_id = serializers.PrimaryKeyRelatedField(source='story', queryset=Story.objects.all(), required=False, allow_null=True)
    story_title = serializers.CharField(source='story.title', read_only=True, default=None)

    class Meta:
        model = Video
        fields = ['id', 'title', 'description', 'youtube_id', 'url', 'story_id', 'story_title', 'created_at']
        read_only_fields = ['youtube_id']

    def validate(self, data):
        video_id = youtube_id_from(data.pop('url', ''))
        if not video_id:
            raise serializers.ValidationError({'url': ['Paste a YouTube link, like https://www.youtube.com/watch?v=...']})
        data['youtube_id'] = video_id
        return data


class VideoListView(generics.ListAPIView):
    serializer_class = VideoSerializer
    queryset = Video.objects.select_related('story')


class AdminVideoListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = VideoSerializer
    queryset = Video.objects.select_related('story')


class AdminVideoDetailView(generics.DestroyAPIView):
    permission_classes = [IsAdminUser]
    queryset = Video.objects.all()
