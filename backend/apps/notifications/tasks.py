import json
import urllib.error
import urllib.request

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.notifications.models import Notification, PushDevice


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
    if settings.EXPO_PUSH_ENABLED:
        deliver_expo_push_notification_task.delay(str(notification.id))
    return notification.id


@shared_task(bind=True, max_retries=3)
def deliver_expo_push_notification_task(self, notification_id):
    notification = Notification.objects.get(id=notification_id)
    devices = list(PushDevice.objects.filter(user=notification.user, is_active=True))
    if not devices:
        return {"sent": 0, "invalid": 0}

    messages = [
        {
            "to": device.expo_push_token,
            "title": notification.title,
            "body": notification.body,
            "sound": "default",
            "data": {
                "notification_id": str(notification.id),
                **(notification.payload_json or {}),
            },
        }
        for device in devices
    ]
    headers = {"Content-Type": "application/json"}
    if settings.EXPO_PUSH_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {settings.EXPO_PUSH_ACCESS_TOKEN}"
    request = urllib.request.Request(
        settings.EXPO_PUSH_URL,
        data=json.dumps(messages).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=settings.EXPO_PUSH_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 10)

    invalid_tokens = []
    for device, result in zip(devices, payload.get("data", [])):
        details = result.get("details", {}) if isinstance(result, dict) else {}
        if details.get("error") in {"DeviceNotRegistered", "InvalidCredentials"}:
            invalid_tokens.append(device.expo_push_token)

    if invalid_tokens:
        PushDevice.objects.filter(expo_push_token__in=invalid_tokens).update(is_active=False, last_seen_at=timezone.now())

    return {
        "sent": len(devices) - len(invalid_tokens),
        "invalid": len(invalid_tokens),
    }
