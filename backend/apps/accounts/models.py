from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.common.models import TimeStampedUUIDModel


class User(TimeStampedUUIDModel, AbstractUser):
    class Role(models.TextChoices):
        CLIENT = "client", "Client"
        TALENT = "talent", "Talent"
        ADMIN = "admin", "Admin"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        PENDING_VERIFICATION = "pending_verification", "Pending Verification"

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CLIENT)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING_VERIFICATION)
    phone_verified_at = models.DateTimeField(null=True, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)

    REQUIRED_FIELDS = ["email"]

    def __str__(self):
        return self.username


class VerificationRecord(TimeStampedUUIDModel):
    class VerificationType(models.TextChoices):
        IDENTITY = "identity", "Identity"
        PAYMENT = "payment", "Payment"
        PROFESSIONAL = "professional", "Professional"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="verification_records")
    verification_type = models.CharField(max_length=32, choices=VerificationType.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    document_url = models.URLField(blank=True)
    reviewed_by = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_verifications",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user_id}:{self.verification_type}:{self.status}"
