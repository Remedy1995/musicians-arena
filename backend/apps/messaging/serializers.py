from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User
from apps.messaging.models import Conversation, ConversationParticipant, Message
from apps.messaging.services import get_or_create_conversation


class ConversationParticipantSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    display_name = serializers.CharField(source="user.profile.display_name", read_only=True)
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = ConversationParticipant
        fields = ["id", "user_id", "username", "display_name", "profile_image_url", "joined_at"]

    @extend_schema_field(OpenApiTypes.URI)
    def get_profile_image_url(self, obj):
        profile = getattr(obj.user, "profile", None)
        if not profile:
            return None
        request = self.context.get("request")
        if profile.profile_image:
            url = profile.profile_image.url
            return request.build_absolute_uri(url) if request else url
        return profile.profile_image_url


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(source="sender.id", read_only=True)
    sender_username = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender_id",
            "sender_username",
            "message_type",
            "body",
            "media_url",
            "delivered_at",
            "read_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "conversation",
            "sender_id",
            "sender_username",
            "delivered_at",
            "read_at",
            "created_at",
        ]


class ConversationSerializer(serializers.ModelSerializer):
    participants = ConversationParticipantSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "booking",
            "gig",
            "initiated_by",
            "conversation_type",
            "last_message_at",
            "created_at",
            "participants",
            "last_message",
        ]
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_last_message(self, obj):
        message = obj.messages.select_related("sender").order_by("-created_at").first()
        if not message:
            return None
        return MessageSerializer(message).data


class ConversationCreateSerializer(serializers.Serializer):
    participant_user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source="participant")
    booking_id = serializers.PrimaryKeyRelatedField(
        queryset=Conversation._meta.get_field("booking").remote_field.model.objects.all(),
        source="booking",
        required=False,
        allow_null=True,
    )
    conversation_type = serializers.ChoiceField(
        choices=Conversation.ConversationType.choices,
        default=Conversation.ConversationType.INQUIRY,
    )

    def validate(self, attrs):
        request_user = self.context["request"].user
        participant = attrs["participant"]
        if participant.id == request_user.id:
            raise serializers.ValidationError("You cannot create a conversation with yourself.")
        return attrs

    def create(self, validated_data):
        request_user = self.context["request"].user
        participant = validated_data["participant"]
        booking = validated_data.get("booking")
        conversation_type = validated_data["conversation_type"]
        conversation, _ = get_or_create_conversation(
            initiated_by=request_user,
            participant=participant,
            booking=booking,
            conversation_type=conversation_type,
        )
        return conversation


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["message_type", "body", "media_url"]

    def validate(self, attrs):
        message_type = attrs.get("message_type", Message.MessageType.TEXT)
        if message_type == Message.MessageType.TEXT and not attrs.get("body"):
            raise serializers.ValidationError({"body": "Text messages require a body."})
        return attrs

    def create(self, validated_data):
        conversation = self.context["conversation"]
        user = self.context["request"].user
        now = timezone.now()
        message = Message.objects.create(
            conversation=conversation,
            sender=user,
            delivered_at=now,
            **validated_data,
        )
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=["last_message_at", "updated_at"])
        return message
