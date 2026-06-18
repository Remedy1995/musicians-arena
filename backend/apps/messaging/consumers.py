import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from apps.messaging.models import Conversation, Message


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.room_group_name = f"conversation_{self.conversation_id}"

        if not user or not getattr(user, "is_authenticated", False):
            await self.close(code=4001)
            return

        allowed = await self._is_participant(user.id, self.conversation_id)
        if not allowed:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        payload = json.loads(text_data)
        action = payload.get("action")

        if action == "message.send":
            message = await self._create_message(
                conversation_id=self.conversation_id,
                sender_id=self.scope["user"].id,
                body=payload.get("body", ""),
                message_type=payload.get("message_type", Message.MessageType.TEXT),
                media_url=payload.get("media_url", ""),
            )
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.message",
                    "event": "message.created",
                    "message": message,
                },
            )
        elif action == "message.read":
            await self._mark_read(
                conversation_id=self.conversation_id,
                user_id=self.scope["user"].id,
            )
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.message",
                    "event": "message.read",
                    "conversation_id": self.conversation_id,
                    "user_id": str(self.scope["user"].id),
                    "read_at": timezone.now().isoformat(),
                },
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    @sync_to_async
    def _is_participant(self, user_id, conversation_id):
        return Conversation.objects.filter(id=conversation_id, participants__user_id=user_id).exists()

    @sync_to_async
    def _create_message(self, conversation_id, sender_id, body, message_type, media_url):
        conversation = Conversation.objects.get(id=conversation_id)
        message = Message.objects.create(
            conversation=conversation,
            sender_id=sender_id,
            body=body,
            message_type=message_type,
            media_url=media_url,
            delivered_at=timezone.now(),
        )
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=["last_message_at", "updated_at"])
        return {
            "id": str(message.id),
            "conversation_id": str(conversation.id),
            "sender_id": str(message.sender_id),
            "message_type": message.message_type,
            "body": message.body,
            "media_url": message.media_url,
            "delivered_at": message.delivered_at.isoformat() if message.delivered_at else None,
            "read_at": message.read_at.isoformat() if message.read_at else None,
            "created_at": message.created_at.isoformat(),
        }

    @sync_to_async
    def _mark_read(self, conversation_id, user_id):
        now = timezone.now()
        Message.objects.filter(conversation_id=conversation_id).exclude(sender_id=user_id).filter(read_at__isnull=True).update(
            read_at=now
        )
