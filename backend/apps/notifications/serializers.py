from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "title", "body", "payload_json", "read_at", "created_at", "updated_at"]
        read_only_fields = fields


class NotificationUnreadCountSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField()
