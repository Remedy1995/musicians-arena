from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedUUIDModel


class Booking(TimeStampedUUIDModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COUNTERED = "countered", "Countered"
        AWAITING_DEPOSIT = "awaiting_deposit", "Awaiting Deposit"
        CONFIRMED = "confirmed", "Confirmed"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        DISPUTED = "disputed", "Disputed"
        REFUNDED = "refunded", "Refunded"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="client_bookings")
    talent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="talent_bookings")
    event_type = models.ForeignKey("profiles.EventType", null=True, blank=True, on_delete=models.SET_NULL)
    gig = models.ForeignKey("gigs.Gig", null=True, blank=True, on_delete=models.SET_NULL, related_name="bookings")
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDING)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    event_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    venue_name = models.CharField(max_length=255, blank=True)
    venue_address = models.TextField()
    city = models.CharField(max_length=120)
    region = models.CharField(max_length=120)
    budget_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    quoted_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    balance_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency_code = models.CharField(max_length=3, default="GHS")
    accepted_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title

    def transition_status(self, *, to_status, changed_by, reason=""):
        previous_status = self.status
        self.status = to_status

        if to_status == self.Status.AWAITING_DEPOSIT:
            self.accepted_at = timezone.now()
        elif to_status == self.Status.CONFIRMED:
            self.confirmed_at = timezone.now()
        elif to_status == self.Status.COMPLETED:
            self.completed_at = timezone.now()
        elif to_status == self.Status.CANCELLED:
            self.cancelled_at = timezone.now()

        self.save()
        BookingStatusHistory.objects.create(
            booking=self,
            from_status=previous_status,
            to_status=to_status,
            changed_by=changed_by,
            reason=reason,
        )

    class Meta:
        indexes = [
            models.Index(fields=["client", "status", "event_date"]),
            models.Index(fields=["talent", "status", "event_date"]),
            models.Index(fields=["gig"]),
        ]


class BookingStatusHistory(TimeStampedUUIDModel):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=50, blank=True)
    to_status = models.CharField(max_length=50)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="booking_status_changes")
    reason = models.TextField(blank=True)


class BookingOffer(TimeStampedUUIDModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="offers")
    proposed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="booking_offers")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    responded_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.booking_id}:{self.amount}:{self.status}"


class Dispute(TimeStampedUUIDModel):
    class DisputeType(models.TextChoices):
        NO_SHOW = "no_show", "No Show"
        PAYMENT = "payment", "Payment"
        QUALITY = "quality", "Quality"
        MISCONDUCT = "misconduct", "Misconduct"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        UNDER_REVIEW = "under_review", "Under Review"
        RESOLVED = "resolved", "Resolved"
        REJECTED = "rejected", "Rejected"

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="disputes")
    raised_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="raised_disputes")
    dispute_type = models.CharField(max_length=20, choices=DisputeType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    description = models.TextField()
    resolution_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="resolved_disputes",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["booking", "status"]),
            models.Index(fields=["raised_by", "status"]),
        ]
