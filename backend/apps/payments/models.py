from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedUUIDModel


class Payment(TimeStampedUUIDModel):
    class PaymentType(models.TextChoices):
        DEPOSIT = "deposit", "Deposit"
        BALANCE = "balance", "Balance"
        FULL = "full", "Full"
        REFUND = "refund", "Refund"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        SUCCESSFUL = "successful", "Successful"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    class FundState(models.TextChoices):
        PENDING = "pending", "Pending"
        HELD = "held", "Held"
        RELEASE_PENDING = "release_pending", "Release Pending"
        RELEASED = "released", "Released"
        REFUND_PENDING = "refund_pending", "Refund Pending"
        REFUNDED = "refunded", "Refunded"
        DISPUTED = "disputed", "Disputed"

    booking = models.ForeignKey("bookings.Booking", on_delete=models.CASCADE, related_name="payments")
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payments_made")
    payment_type = models.CharField(max_length=16, choices=PaymentType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency_code = models.CharField(max_length=3, default="GHS")
    provider = models.CharField(max_length=100, blank=True)
    provider_reference = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    fund_state = models.CharField(max_length=20, choices=FundState.choices, default=FundState.PENDING)
    provider_fee_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    metadata_json = models.JSONField(default=dict, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["booking", "status", "fund_state"]),
            models.Index(fields=["payer", "status"]),
            models.Index(fields=["provider", "provider_reference"]),
        ]


class Payout(TimeStampedUUIDModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REVERSED = "reversed", "Reversed"

    class PayoutMethod(models.TextChoices):
        MOBILE_MONEY = "mobile_money", "Mobile Money"
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"

    class TriggerReason(models.TextChoices):
        COMPLETION_RELEASE = "completion_release", "Completion Release"
        LATE_CANCELLATION_COMPENSATION = "late_cancellation_compensation", "Late Cancellation Compensation"
        CLIENT_NO_SHOW_COMPENSATION = "client_no_show_compensation", "Client No Show Compensation"
        ADMIN_RELEASE = "admin_release", "Admin Release"

    booking = models.ForeignKey("bookings.Booking", on_delete=models.CASCADE, related_name="payouts")
    payee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payouts_received")
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    payout_method = models.CharField(max_length=20, choices=PayoutMethod.choices)
    trigger_reason = models.CharField(
        max_length=40,
        choices=TriggerReason.choices,
        default=TriggerReason.COMPLETION_RELEASE,
    )
    idempotency_key = models.CharField(max_length=80, blank=True)
    provider_reference = models.CharField(max_length=255, blank=True)
    metadata_json = models.JSONField(default=dict, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["booking", "status"]),
            models.Index(fields=["payee", "status"]),
            models.Index(fields=["trigger_reason"]),
        ]


class Refund(TimeStampedUUIDModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    class Reason(models.TextChoices):
        CLIENT_FREE_CANCELLATION = "client_free_cancellation", "Client Free Cancellation"
        TALENT_CANCELLED = "talent_cancelled", "Talent Cancelled"
        TALENT_NO_SHOW = "talent_no_show", "Talent No Show"
        BALANCE_OVERPAYMENT = "balance_overpayment", "Balance Overpayment"
        ADMIN_DECISION = "admin_decision", "Admin Decision"

    booking = models.ForeignKey("bookings.Booking", on_delete=models.CASCADE, related_name="refunds")
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="refunds_received")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency_code = models.CharField(max_length=3, default="GHS")
    reason = models.CharField(max_length=40, choices=Reason.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    provider_reference = models.CharField(max_length=255, blank=True)
    metadata_json = models.JSONField(default=dict, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["booking", "status"]),
            models.Index(fields=["recipient", "status"]),
            models.Index(fields=["reason"]),
        ]
