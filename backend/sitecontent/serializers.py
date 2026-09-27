from rest_framework import serializers

from categories.models import Category
from stories.models import Story
from .models import Announcement, WritingPrompt, Challenge, Bundle, MoodOfDay


# ---------------------------------------------------------------
# ModelSerializers: DRF reads the fields from the model, checks the
# data (max_length, choices, required...) and saves it. For simple
# "add / edit / delete" admin pages that's all we need.
# ---------------------------------------------------------------

class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'message', 'link_url', 'link_label', 'style', 'is_active', 'created_at']


class WritingPromptSerializer(serializers.ModelSerializer):
    class Meta:
        model = WritingPrompt
        fields = ['id', 'text', 'is_active', 'created_at']


class ChallengeSerializer(serializers.ModelSerializer):
    # Extra, read-only fields worked out per challenge.
    is_open = serializers.SerializerMethodField()
    entry_count = serializers.SerializerMethodField()
    winner_title = serializers.SerializerMethodField()

    # Writing: the admin sends winner_id (a story's id) or '' for none.
    # PrimaryKeyRelatedField checks that the story really exists.
    # source='winner' = "this sets the `winner` field on the model".
    winner_id = serializers.PrimaryKeyRelatedField(
        source='winner', queryset=Story.objects.all(), allow_null=True, required=False,
    )

    class Meta:
        model = Challenge
        fields = ['id', 'title', 'theme', 'deadline', 'is_open', 'entry_count', 'winner_id', 'winner_title', 'created_at']

    def get_is_open(self, challenge):
        return challenge.is_open()

    def get_entry_count(self, challenge):
        return challenge.entries.count()

    def get_winner_title(self, challenge):
        return challenge.winner.title if challenge.winner else None


class BundleSerializer(serializers.ModelSerializer):
    # Read: how many stories. Write: the list of story ids.
    story_count = serializers.SerializerMethodField()
    story_ids = serializers.PrimaryKeyRelatedField(
        source='stories', queryset=Story.objects.all(), many=True, required=False,
    )

    class Meta:
        model = Bundle
        fields = ['id', 'title', 'slug', 'description', 'is_published', 'story_ids', 'story_count', 'created_at']

    def get_story_count(self, bundle):
        return bundle.stories.count()


class AdminCategorySerializer(serializers.ModelSerializer):
    # How many stories use it (so the admin sees what a delete affects).
    story_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'color', 'story_count']

    def get_story_count(self, category):
        return category.stories.count()


class MoodOfDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = MoodOfDay
        fields = ['id', 'date', 'mood', 'note']
