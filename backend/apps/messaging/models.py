from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedUUIDModel


class Conversation(TimeStampedUUIDModel):
    class ConversationType(models.TextChoices):
        INQUIRY = "inquiry", "Inquiry"
        BOOKING = "booking", "Booking"
        GIG = "gig", "Gig"

    booking = models.ForeignKey("bookings.Booking", null=True, blank=True, on_delete=models.CASCADE, related_name="conversations")
    gig = models.ForeignKey("gigs.Gig", null=True, blank=True, on_delete=models.CASCADE, related_name="conversations")
    initiated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="initiated_conversations")
    conversation_type = models.CharField(max_length=16, choices=ConversationType.choices, default=ConversationType.INQUIRY)
    last_message_at = models.DateTimeField(null=True, blank=True)


class ConversationParticipant(TimeStampedUUIDModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversation_participants")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("conversation", "user")


class Message(TimeStampedUUIDModel):
    class MessageType(models.TextChoices):
        TEXT = "text", "Text"
        IMAGE = "image", "Image"
        AUDIO = "audio", "Audio"
        SYSTEM = "system", "System"

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="messages_sent")
    message_type = models.CharField(max_length=16, choices=MessageType.choices, default=MessageType.TEXT)
    body = models.TextField(blank=True)
    media_url = models.URLField(blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
