from django.utils import timezone

from apps.messaging.models import Conversation, ConversationParticipant, Message


def get_or_create_conversation(*, initiated_by, participant, conversation_type, booking=None, gig=None):
    conversation = (
        Conversation.objects.filter(
            booking=booking,
            gig=gig,
            conversation_type=conversation_type,
            participants__user=initiated_by,
        )
        .filter(participants__user=participant)
        .distinct()
        .first()
    )
    if conversation:
        return conversation, False

    conversation = Conversation.objects.create(
        initiated_by=initiated_by,
        booking=booking,
        gig=gig,
        conversation_type=conversation_type,
    )
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conversation, user=initiated_by),
            ConversationParticipant(conversation=conversation, user=participant),
        ]
    )
    return conversation, True


def create_system_message(*, conversation, body):
    now = timezone.now()
    message = Message.objects.create(
        conversation=conversation,
        sender=conversation.initiated_by,
        message_type=Message.MessageType.SYSTEM,
        body=body,
        delivered_at=now,
    )
    conversation.last_message_at = message.created_at
    conversation.save(update_fields=["last_message_at", "updated_at"])
    return message
