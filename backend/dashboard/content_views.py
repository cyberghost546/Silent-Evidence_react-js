from datetime import date, datetime

from django.db import transaction
from django.db.models import Count, F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from mailings.models import Newsletter
from moderation.models import Report, Appeal
from sitecontent.models import Challenge, ChallengeEntry, MoodOfDay, Spotlight
from stories.models import Story, Tag, Like, Bookmark, Comment, ReadingHistory
from stories.serializers import StoryWriteSerializer


# ---------------------------------------------------------------
# SCHEDULED STORIES and TAG MANAGER (Admin Dashboard). Admins only.
# ---------------------------------------------------------------

def scheduled_data(story):
    return {
        'id': story.id,
        'title': story.title,
        'author': story.author.username,
        'category': story.category.name if story.category else None,
        'publish_at': story.publish_at,
    }


# GET /api/dashboard/scheduled/  -> stories waiting for their date,
# the soonest first. "Scheduled" = published, not archived, and the
# publish date is still in the future.
class ScheduledStoriesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        stories = (
            Story.objects
            .filter(is_published=True, is_archived=False, publish_at__gt=timezone.now())
            .select_related('author', 'category')
            .order_by('publish_at')
        )
        return Response([scheduled_data(story) for story in stories])


# POST /api/dashboard/scheduled/5/
#   { action: 'now' }                        -> publish right away
#   { action: 'move', publish_at: '...' }    -> another date/time
#   { action: 'cancel' }                     -> back to a draft
class ScheduledStoryActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        story = get_object_or_404(Story, pk=pk)
        action = request.data.get('action')

        if action == 'now':
            story.publish_at = None
        elif action == 'cancel':
            story.is_published = False
            story.publish_at = None
        elif action == 'move':
            # parse_datetime turns "2026-10-31T21:00:00Z" into a real
            # date-time (or None if it's nonsense).
            when = parse_datetime(request.data.get('publish_at') or '')
            if when is None or when <= timezone.now():
                return Response({'detail': 'Pick a date and time in the future.'}, status=400)
            story.publish_at = when
        else:
            return Response({'detail': 'Unknown action.'}, status=400)

        story.save()
        return Response({'id': story.id, 'publish_at': story.publish_at, 'is_published': story.is_published})


# ---------------------------------------------------------------
# TAGS
# ---------------------------------------------------------------

# GET /api/tags/?q=ha  -> the most used tags (for suggestions on
# the Write page). Anyone.
class TagSuggestionsView(APIView):
    def get(self, request):
        tags = Tag.objects.annotate(story_count=Count('stories')).order_by('-story_count', 'name')
        query = (request.query_params.get('q') or '').strip().lower()
        if query:
            tags = tags.filter(name__startswith=query)
        return Response([{'name': tag.name, 'story_count': tag.story_count} for tag in tags[:20]])


# GET /api/dashboard/tags/  -> every tag with how many stories use it
class AdminTagListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        tags = Tag.objects.annotate(story_count=Count('stories')).order_by('name')
        return Response([{'id': tag.id, 'name': tag.name, 'story_count': tag.story_count} for tag in tags])


# PATCH  /api/dashboard/tags/5/  { name }  -> rename
#        (renaming to a name that already exists = merge into it)
# DELETE /api/dashboard/tags/5/            -> remove from every story
class AdminTagDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        tag = get_object_or_404(Tag, pk=pk)
        # Same cleaning as the Write page (StoryWriteSerializer).
        new_name = StoryWriteSerializer.clean_tag(request.data.get('name') or '')
        if not new_name:
            return Response({'detail': 'Give it a name (letters, numbers, dashes).'}, status=400)

        existing = Tag.objects.filter(name=new_name).exclude(pk=tag.pk).first()
        if existing:
            merge_tags(tag, existing)
            return Response({'detail': f'Merged into "{existing.name}".'})

        tag.name = new_name
        tag.save()
        return Response({'detail': f'Renamed to "{new_name}".'})

    def delete(self, request, pk):
        get_object_or_404(Tag, pk=pk).delete()
        return Response(status=204)


# POST /api/dashboard/tags/5/merge/  { into_id }
# "spooky-house" + "haunted-house" -> every story gets the second one,
# and the first disappears.
class MergeTagView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        tag = get_object_or_404(Tag, pk=pk)
        into = get_object_or_404(Tag, pk=request.data.get('into_id'))
        if tag == into:
            return Response({'detail': "Can't merge a tag into itself."}, status=400)
        merge_tags(tag, into)
        return Response({'detail': f'"{tag.name}" merged into "{into.name}".'})


def merge_tags(old, into):
    # .add(*stories) = add every story of the old tag to the new one
    # (a story that already had both just keeps one).
    into.stories.add(*old.stories.all())
    old.delete()


# ---------------------------------------------------------------
# CONTENT CALENDAR
# ---------------------------------------------------------------

# GET /api/dashboard/calendar/?month=2026-10
#   -> { month: '2026-10', events: [ { date, type, title, link } ] }
# Everything that happens (or happened) on a day, from several tables.
class ContentCalendarView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        month_text = request.query_params.get('month') or timezone.localdate().strftime('%Y-%m')
        try:
            year, month = (int(part) for part in month_text.split('-'))
            first = date(year, month, 1)
        except ValueError:
            return Response({'detail': 'Use ?month=YYYY-MM'}, status=400)
        # The first day of the NEXT month (December -> January).
        after = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)

        events = []

        def add(day, kind, title, link):
            # day can be a date or a date-time; the calendar only needs the date.
            if isinstance(day, datetime):
                day = timezone.localtime(day).date()
            events.append({'date': day.isoformat(), 'type': kind, 'title': title, 'link': link})

        # Stories: scheduled ones on their publish date, the others on
        # the day they were written (drafts are left out).
        stories = Story.objects.filter(is_published=True).filter(
            Q(publish_at__date__gte=first, publish_at__date__lt=after)
            | Q(publish_at__isnull=True, created_at__date__gte=first, created_at__date__lt=after)
        )
        now = timezone.now()
        for story in stories:
            if story.publish_at and story.publish_at > now:
                add(story.publish_at, 'scheduled', story.title, '/dashboard/scheduled')
            else:
                add(story.publish_at or story.created_at, 'published', story.title, f'/stories/{story.id}')

        for challenge in Challenge.objects.filter(deadline__date__gte=first, deadline__date__lt=after):
            add(challenge.deadline, 'challenge', f'Deadline: {challenge.title}', '/dashboard/challenges')

        for mood in MoodOfDay.objects.filter(date__gte=first, date__lt=after):
            add(mood.date, 'mood', f'Mood: {mood.get_mood_display()}', '/dashboard/moods')

        for spotlight in Spotlight.objects.filter(starts_on__lt=after, ends_on__gte=first).select_related('story'):
            # Shown on its first day inside this month.
            add(max(spotlight.starts_on, first), 'spotlight', f'Spotlight: {spotlight.story.title}', '/dashboard/spotlight')

        for letter in Newsletter.objects.filter(sent_at__date__gte=first, sent_at__date__lt=after):
            add(letter.sent_at, 'newsletter', f'Newsletter: {letter.subject}', '/dashboard/newsletter')

        events.sort(key=lambda event: event['date'])
        return Response({'month': f'{year}-{month:02d}', 'events': events})


# ---------------------------------------------------------------
# MERGE STORIES - two copies of the same story (someone published
# it twice). Everything on the DUPLICATE moves to the ORIGINAL, then
# the duplicate is deleted.
# ---------------------------------------------------------------

# POST /api/dashboard/stories/merge/  { source_id, target_id }
#   source = the duplicate (deleted), target = the one that stays
class MergeStoriesView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        source = get_object_or_404(Story, pk=request.data.get('source_id'))
        target = get_object_or_404(Story, pk=request.data.get('target_id'))
        if source == target:
            return Response({'detail': 'Pick two different stories.'}, status=400)

        # transaction.atomic = "all or nothing": if anything fails
        # halfway, the database undoes ALL the steps, so we never end
        # up with half the likes moved and the rest lost.
        with transaction.atomic():
            moved = {'likes': 0, 'comments': 0, 'saves': 0}

            # Likes and saves: one per person per story (unique), so
            # only move them for people who have none on the target
            # yet - the rest are duplicates and go with the source.
            for like in Like.objects.filter(story=source):
                if not Like.objects.filter(story=target, user=like.user_id).exists():
                    like.story = target
                    like.save()
                    moved['likes'] += 1
            for saved in Bookmark.objects.filter(story=source):
                if not Bookmark.objects.filter(story=target, user=saved.user_id).exists():
                    saved.story = target
                    saved.save()
                    moved['saves'] += 1

            # Comments can all simply move. .update() = one query.
            moved['comments'] = Comment.objects.filter(story=source).update(story=target)

            # Reports, reading history, challenge entries, spotlights:
            # move what doesn't clash; the rest disappears with the source.
            Report.objects.filter(story=source).update(story=target)
            Appeal.objects.filter(story=source).update(story=target)
            # A challenge the duplicate WON: the original is the winner now.
            # (Without this, deleting the duplicate would empty `winner`.)
            Challenge.objects.filter(winner=source).update(winner=target)
            # Bundles that had the duplicate get the original instead.
            for bundle in source.bundles.all():
                bundle.stories.add(target)
            for row in ReadingHistory.objects.filter(story=source):
                ReadingHistory.objects.get_or_create(user_id=row.user_id, story=target)
            for entry in ChallengeEntry.objects.filter(story=source):
                ChallengeEntry.objects.get_or_create(challenge_id=entry.challenge_id, story=target)
            Spotlight.objects.filter(story=source).update(story=target)

            # Tags: the target gets the tags of both.
            target.tags.add(*source.tags.all())

            # Views add up. F() lets the database do the adding.
            Story.objects.filter(pk=target.pk).update(views=F('views') + source.views)

            source_title = source.title
            source.delete()

        return Response({
            'detail': f'"{source_title}" was merged into "{target.title}".',
            'moved': moved,
        })
