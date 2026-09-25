from rest_framework import serializers

from .models import ContactMessage


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        # is_handled is NOT here - visitors can't mark their own
        # message as answered.
        fields = ['id', 'name', 'email', 'subject', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']
