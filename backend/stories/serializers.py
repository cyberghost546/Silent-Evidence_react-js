import re

from django.utils import timezone
from rest_framework import serializers

from moderation.content_filter import check_text, BLOCKED_MESSAGE
from .models import Story, Comment, LastWord, CoAuthorInvite, Tag, wpm_for


# Everything a story CARD needs - not the full body, which could be
# thousands of words the homepage never shows.
class StoryCardSerializer(serializers.ModelSerializer):
    # author and category are ForeignKeys, so by default DRF would
    # send their id numbers (author: 3). React wants the names.

    # source='author.username' = "follow the link to the user, then
    # take the username".
    author = serializers.CharField(source='author.username')

    # A category can be empty (null), and "null.name" would crash.
    # A SerializerMethodField lets us write that check ourselves:
    # DRF calls get_<fieldname>() and sends whatever it returns.
    category = serializers.SerializerMethodField()

    # reading_time depends on who is reading (Slow / Average / Fast
    # on the Settings page), so we work it out in get_reading_time().
    reading_time = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = ['id', 'title', 'excerpt', 'cover_image', 'category', 'author', 'reading_time', 'views', 'created_at']

    # self.context['request'] is there because the view passes it
    # (generic views do it by themselves). .get() + the check keep it
    # from crashing if someone ever forgets.
    def get_reading_time(self, story):
        request = self.context.get('request')
        if request is None:
            return story.reading_time()

        # For a LIST of 20 cards this runs 20 times, but the reader is
        # the same person every time. So look their speed up once and
        # remember it on the serializer (self.wpm) - one database
        # query instead of 20.
        if not hasattr(self, 'wpm'):
            self.wpm = wpm_for(request.user)
        return story.reading_time(self.wpm)

    def get_category(self, story):
        if story.category:
            return story.category.name
        return None

    # to_representation() builds the final JSON. We let DRF do its
    # normal job first, then fix up one thing: if there's no uploaded
    # cover but the author pasted a link, send the link instead. Every
    # card and story page already shows `cover_image`, so they all
    # work without any React changes.
    def to_representation(self, story):
        data = super().to_representation(story)
        if not data['cover_image'] and story.cover_image_url:
            data['cover_image'] = story.cover_image_url
        return data


# Everything the STORY PAGE needs: the card fields + the full text +
# the category's slug (for the "Home / Paranormal / ..." links) +
# the counts and "did YOU like / save this?".
#
# It INHERITS from StoryCardSerializer - "a StoryDetailSerializer is
# a StoryCardSerializer, plus a bit more". So author, category and
# reading_time don't have to be written again.
class StoryDetailSerializer(StoryCardSerializer):
    category_slug = serializers.SerializerMethodField()
    word_count = serializers.ReadOnlyField()
    like_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()
    saved = serializers.SerializerMethodField()
    coauthors = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()

    # Meta inherits too: same model, and the card's field list with
    # more added on the end.
    class Meta(StoryCardSerializer.Meta):
        fields = StoryCardSerializer.Meta.fields + [
            'body', 'category_slug', 'word_count', 'like_count', 'comment_count', 'liked', 'saved',
            'coauthors', 'tags',
            # From the Write a Story page. The story page doesn't show
            # these yet, but they're here for when it does.
            'language', 'video_url', 'audio_url', 'location', 'latitude', 'longitude',
            'mood', 'content_rating', 'content_warnings',
        ]

    def get_category_slug(self, story):
        if story.category:
            return story.category.slug
        return None

    # story.likes / story.comments exist because of related_name on
    # the Like and Comment ForeignKeys (models.py).
    def get_like_count(self, story):
        return story.likes.count()

    def get_comment_count(self, story):
        # Hidden comments (Moderation) don't count.
        return story.comments.filter(is_hidden=False).count()

    # "Did the person looking at this page like it?" - so the heart
    # shows filled in. The view passes the request in `context`
    # automatically, which is how we know who's asking.
    # Logged out = can't have liked it = False.
    def get_liked(self, story):
        user = self.context['request'].user
        if not user.is_authenticated:
            return False
        # .exists() asks the database "is there at least one row?"
        # without loading it - the cheapest possible check.
        return story.likes.filter(user=user).exists()

    def get_saved(self, story):
        user = self.context['request'].user
        if not user.is_authenticated:
            return False
        return story.bookmarks.filter(user=user).exists()

    # ['night_owl'] - people who ACCEPTED a co-author invite.
    # story.invites exists because of related_name on CoAuthorInvite.
    # ['lighthouse', 'vhs'] - the story's tag names.
    def get_tags(self, story):
        return [tag.name for tag in story.tags.all()]

    def get_coauthors(self, story):
        accepted = story.invites.filter(status='accepted').order_by('to_user__username')
        return [invite.to_user.username for invite in accepted]


# ---------------------------------------------------------------
# For WRITING a story (the Write a Story page).
#
# A separate serializer from the ones above, because writing and
# reading need different fields: the page sends a category ID, but
# the cards want the category NAME back.
#
# Not in the list on purpose: author (set in the view from who's
# logged in), views, and the Story of the Day/Week ticks - a visitor
# must never be able to set those themselves.
# ---------------------------------------------------------------
class StoryWriteSerializer(serializers.ModelSerializer):
    # TAGS: the Write page sends up to 5 words, e.g. ['lighthouse', 'VHS'].
    # A ListField = "a list of these". write_only: it only goes IN -
    # the story page gets `tags` from StoryDetailSerializer instead.
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=30), write_only=True, required=False, max_length=5,
    )

    class Meta:
        model = Story
        fields = [
            'id', 'title', 'excerpt', 'body', 'category', 'cover_image', 'cover_image_url',
            'language', 'video_url', 'audio_url', 'location', 'latitude', 'longitude',
            'mood', 'content_rating', 'content_warnings', 'publish_at', 'is_published',
            'tag_names',
        ]
        # The model allows a story without a category (so deleting a
        # category doesn't delete its stories), but a NEW story must
        # pick one. extra_kwargs changes a field's rules without
        # writing the whole field out again.
        extra_kwargs = {
            'category': {'required': True, 'allow_null': False},
            # About 15,000 words - more than any story needs, and it
            # stops someone from posting megabytes of text.
            'body': {'max_length': 100_000},
        }

    # ImageField already checks it's a real image; this checks the size.
    # (Same 5 MB limit as avatars in accounts/serializers.py.)
    def validate_cover_image(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('The image must be smaller than 5 MB.')
        return value

    # validate() runs after every field was checked on its own, so
    # it's the place for rules about TWO fields together.
    # `data` is a dict of the cleaned values.
    def validate(self, data):
        latitude = data.get('latitude')
        longitude = data.get('longitude')

        # One without the other can't be put on a map.
        if (latitude is None) != (longitude is None):
            raise serializers.ValidationError({'latitude': ['Enter both latitude and longitude, or neither.']})

        if latitude is not None and not -90 <= latitude <= 90:
            raise serializers.ValidationError({'latitude': ['Latitude must be between -90 and 90.']})

        if longitude is not None and not -180 <= longitude <= 180:
            raise serializers.ValidationError({'longitude': ['Longitude must be between -180 and 180.']})

        # CONTENT FILTER (Admin Dashboard -> Content Filter): a banned
        # word in the title, excerpt or text = refused. ("flag" words
        # are allowed - StoryCreateView reports them to the admins.)
        text = ' '.join([data.get('title', ''), data.get('excerpt', ''), data.get('body', '')] + data.get('tag_names', []))
        if check_text(text)[0] == 'block':
            raise serializers.ValidationError({'body': [BLOCKED_MESSAGE]})

        return data

    # "  Cursed Object! " -> "cursed-object". Lower case, spaces become
    # dashes, and only letters, numbers and dashes are kept.
    @staticmethod
    def clean_tag(name):
        name = re.sub(r'\s+', '-', name.strip().lower())
        return re.sub(r'[^a-z0-9-]', '', name).strip('-')

    # create() makes the Story. A ManyToMany (tags) can only be set
    # AFTER the story exists (it needs an id), so we take tag_names
    # out first, let DRF create the story, then attach the tags.
    def create(self, validated_data):
        tag_names = validated_data.pop('tag_names', [])
        story = super().create(validated_data)

        tags = []
        for name in tag_names:
            cleaned = self.clean_tag(name)
            if cleaned:
                # get_or_create: reuse the tag if it exists, else make it.
                tag, _ = Tag.objects.get_or_create(name=cleaned)
                tags.append(tag)
        story.tags.set(tags)
        return story


class CommentSerializer(serializers.ModelSerializer):
    # read_only: shown in the answer, but can't be sent in. The view
    # fills in the author from whoever is logged in - otherwise anyone
    # could post a comment "as" someone else.
    author = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = Comment
        # parent: the id of the comment this answers (or null). Sent in
        # when replying, and shown so React can put replies under it.
        fields = ['id', 'author', 'body', 'created_at', 'parent']
        extra_kwargs = {'parent': {'required': False, 'allow_null': True}}

    # validate_<field> runs by itself during is_valid(). A blocked word
    # (Content Filter) refuses the comment.
    def validate_body(self, value):
        if check_text(value)[0] == 'block':
            raise serializers.ValidationError(BLOCKED_MESSAGE)
        return value


# One quote on the Last Words wall. Same shape as a comment:
# the author's NAME goes out, and it can't be set by the visitor.
class LastWordSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = LastWord
        fields = ['id', 'author', 'body', 'created_at']

    # DRF's CharField already trims spaces off the ends and refuses an
    # empty quote, and max_length=280 on the model becomes a "no more
    # than 280 characters" check by itself. We only add the Content
    # Filter, like on comments.
    def validate_body(self, value):
        if check_text(value)[0] == 'block':
            raise serializers.ValidationError(BLOCKED_MESSAGE)
        return value


# ---------------------------------------------------------------
# One row on the MY STORIES page: your own stories, drafts too.
# Only what the table shows - no body.
# ---------------------------------------------------------------
class MyStorySerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = [
            'id', 'title', 'category', 'is_published', 'publish_at', 'status',
            'views', 'like_count', 'comment_count', 'created_at',
        ]

    def get_category(self, story):
        return story.category.name if story.category else None

    def get_like_count(self, story):
        return story.likes.count()

    def get_comment_count(self, story):
        # Hidden comments (Moderation) don't count.
        return story.comments.filter(is_hidden=False).count()

    # One word for the coloured badge:
    #   'archived'  - taken off the site by an admin
    #   'draft'     - not published
    #   'scheduled' - published, but the publish date is still to come
    #   'published' - live, anyone can read it
    def get_status(self, story):
        if story.is_archived:
            return 'archived'
        if not story.is_published:
            return 'draft'
        if story.publish_at and story.publish_at > timezone.now():
            return 'scheduled'
        return 'published'


# ---------------------------------------------------------------
# One co-author invite, for the Co-author Invites page.
# ---------------------------------------------------------------
class CoAuthorInviteSerializer(serializers.ModelSerializer):
    story_id = serializers.IntegerField(source='story.id', read_only=True)
    story_title = serializers.CharField(source='story.title', read_only=True)
    from_user = serializers.CharField(source='from_user.username', read_only=True)
    to_user = serializers.CharField(source='to_user.username', read_only=True)

    class Meta:
        model = CoAuthorInvite
        fields = ['id', 'story_id', 'story_title', 'from_user', 'to_user', 'status', 'created_at']
