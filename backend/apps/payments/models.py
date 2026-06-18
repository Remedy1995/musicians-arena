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

    booking = models.ForeignKey("bookings.Booking", on_delete=models.CASCADE, related_name="payments")
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payments_made")
    payment_type = models.CharField(max_length=16, choices=PaymentType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency_code = models.CharField(max_length=3, default="GHS")
    provider = models.CharField(max_length=100, blank=True)
    provider_reference = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)


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

    booking = models.ForeignKey("bookings.Booking", on_delete=models.CASCADE, related_name="payouts")
    payee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payouts_received")
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    payout_method = models.CharField(max_length=20, choices=PayoutMethod.choices)
    provider_reference = models.CharField(max_length=255, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
