from rest_framework import serializers

from apps.notifications.models import Notification, PushDevice


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "title", "body", "payload_json", "read_at", "created_at", "updated_at"]
        read_only_fields = fields


class NotificationUnreadCountSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField()


class PushDeviceSerializer(serializers.ModelSerializer):
    # Registration is idempotent: the same device token is refreshed on each login.
    expo_push_token = serializers.CharField(max_length=255)

    class Meta:
        model = PushDevice
        fields = ["id", "expo_push_token", "platform", "device_name", "is_active", "last_seen_at", "created_at", "updated_at"]
        read_only_fields = ["id", "is_active", "last_seen_at", "created_at", "updated_at"]
