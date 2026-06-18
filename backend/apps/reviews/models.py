from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedUUIDModel


class Review(TimeStampedUUIDModel):
    booking = models.ForeignKey("bookings.Booking", on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_written")
    reviewee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_received")
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)

    class Meta:
        unique_together = ("booking", "reviewer", "reviewee")
