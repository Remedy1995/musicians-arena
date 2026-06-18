from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedUUIDModel


class Notification(TimeStampedUUIDModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    body = models.TextField()
    payload_json = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
