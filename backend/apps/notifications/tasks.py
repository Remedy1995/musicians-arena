from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from celery import shared_task

from apps.notifications.models import Notification


@shared_task
def create_notification_task(*, user_id, type, title, body, payload_json=None):
    notification = Notification.objects.create(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        payload_json=payload_json or {},
    )

    unread_count = Notification.objects.filter(user_id=user_id, read_at__isnull=True).count()
    channel_layer = get_channel_layer()
    if channel_layer is not None:
        async_to_sync(channel_layer.group_send)(
            f"notifications_{user_id}",
            {
                "type": "notification.message",
                "payload": {
                    "event": "notification.created",
                    "notification": {
                        "id": str(notification.id),
                        "type": notification.type,
                        "title": notification.title,
                        "body": notification.body,
                        "payload_json": notification.payload_json,
                        "read_at": notification.read_at.isoformat() if notification.read_at else None,
                        "created_at": notification.created_at.isoformat(),
                    },
                    "unread_count": unread_count,
                },
            },
        )
    return notification.id
