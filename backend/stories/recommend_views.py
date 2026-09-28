from collections import Counter

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Follow, get_profile
from .models import FearRating, Like, ReadingHistory, stories_for
from .serializers import StoryCardSerializer


# ---------------------------------------------------------------
# GET /api/stories/recommended/  - "Because you read..." (logged in)
#
# Up to 8 stories you haven't read, each with the REASON it was picked:
#   [ { ...story card..., reason: 'Because you liked "The Well"' }, ... ]
#
# How a story earns points (simple on purpose - you can tune the numbers):
#   +3  per tag it shares with a story you liked or rated 4-5 on the fear meter
#   +2  same category as one of those stories
#   +2  its mood is in your Fear Profile (Settings)
#   +2  by a writer you follow
#   + a little for being popular (so ties go to stories others enjoyed)
#
# Nothing to go on yet (a brand-new member)? -> [] and the homepage
# simply doesn't show the row.
# ---------------------------------------------------------------
MAX_RESULTS = 8
CANDIDATES = 300   # how many unread stories we look at


class RecommendedStoriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # ---- What we know about your taste ----
        loved_ids = set(Like.objects.filter(user=user).values_list('story_id', flat=True))
        loved_ids |= set(FearRating.objects.filter(user=user, score__gte=4).values_list('story_id', flat=True))
        loved = list(stories_for(user).filter(id__in=loved_ids).prefetch_related('tags'))

        tag_to_story = {}          # tag name -> a loved story that has it (for the reason text)
        category_to_story = {}
        for story in loved:
            for tag in story.tags.all():
                tag_to_story.setdefault(tag.name, story)
            if story.category_id:
                category_to_story.setdefault(story.category_id, story)

        fear_moods = {mood for mood in get_profile(user).fear_moods.split(',') if mood}
        followed = set(Follow.objects.filter(follower=user).values_list('following_id', flat=True))

        if not (loved or fear_moods or followed):
            return Response([])

        # ---- Score the stories you haven't read ----
        read_ids = ReadingHistory.objects.filter(user=user).values('story_id')
        candidates = (
            stories_for(user)
            .exclude(id__in=read_ids)
            .exclude(id__in=loved_ids)
            .exclude(author=user)
            .select_related('author', 'category')
            .prefetch_related('tags')
            .order_by('-views')[:CANDIDATES]
        )

        scored = []
        for story in candidates:
            points = Counter()    # reason -> points, so we can say WHY
            for tag in story.tags.all():
                if tag.name in tag_to_story:
                    points[f'Because you liked "{tag_to_story[tag.name].title}"'] += 3
            if story.category_id in category_to_story:
                points[f'Because you liked "{category_to_story[story.category_id].title}"'] += 2
            if story.mood and story.mood in fear_moods:
                points[f'Matches your Fear Profile: {story.get_mood_display().lower()}'] += 2
            if story.author_id in followed:
                points[f'By {story.author.username}, who you follow'] += 2
            if not points:
                continue
            total = sum(points.values()) + min(story.views, 1000) / 1000   # popularity: at most +1
            scored.append((total, story, points.most_common(1)[0][0]))

        # Highest score first; the id breaks ties so the order is always the same.
        scored.sort(key=lambda item: (-item[0], item[1].id))
        top = scored[:MAX_RESULTS]
        cards = StoryCardSerializer([story for _, story, _ in top], many=True, context={'request': request}).data
        for card, (_, _, reason) in zip(cards, top):
            card['reason'] = reason
        return Response(cards)
