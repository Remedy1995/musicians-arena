from pathlib import Path

from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedUUIDModel


def talent_media_upload_to(instance, filename):
    extension = Path(filename).suffix.lower()
    return f"talent-media/{instance.talent_profile.user_id}/{instance.id or 'pending'}{extension}"


class UserProfile(TimeStampedUUIDModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    display_name = models.CharField(max_length=150)
    profile_image_url = models.URLField(blank=True)
    cover_image_url = models.URLField(blank=True)
    bio = models.TextField(blank=True)
    city = models.CharField(max_length=120, blank=True)
    region = models.CharField(max_length=120, blank=True)
    country = models.CharField(max_length=120, default="Ghana")
    timezone = models.CharField(max_length=60, default="Africa/Accra")

    def __str__(self):
        return self.display_name

    class Meta:
        indexes = [
            models.Index(fields=["city", "region", "country"]),
            models.Index(fields=["display_name"]),
        ]


class TalentCategory(TimeStampedUUIDModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)

    class Meta:
        verbose_name_plural = "talent categories"

    def __str__(self):
        return self.name


class EventType(TimeStampedUUIDModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)

    def __str__(self):
        return self.name


class ClientProfile(TimeStampedUUIDModel):
    class ClientType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        CHURCH = "church", "Church"
        EVENT_PLANNER = "event_planner", "Event Planner"
        CORPORATE = "corporate", "Corporate"
        STUDIO = "studio", "Studio"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="client_profile")
    organization_name = models.CharField(max_length=255, blank=True)
    client_type = models.CharField(max_length=32, choices=ClientType.choices, default=ClientType.INDIVIDUAL)

    def __str__(self):
        return self.organization_name or self.user.username


class TalentProfile(TimeStampedUUIDModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="talent_profile")
    stage_name = models.CharField(max_length=150, blank=True)
    years_of_experience = models.PositiveIntegerField(default=0)
    primary_category = models.ForeignKey(
        TalentCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="primary_talents",
    )
    hourly_rate_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    hourly_rate_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    fixed_price_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    fixed_price_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    travel_radius_km = models.PositiveIntegerField(default=0)
    response_time_minutes = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)
    booking_count = models.PositiveIntegerField(default=0)
    verified_at = models.DateTimeField(null=True, blank=True)
    reliability_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_featured = models.BooleanField(default=False)

    def __str__(self):
        return self.stage_name or self.user.username

    class Meta:
        indexes = [
            models.Index(fields=["primary_category", "is_featured"]),
            models.Index(fields=["average_rating", "reliability_score"]),
            models.Index(fields=["created_at"]),
        ]


class TalentSkill(TimeStampedUUIDModel):
    class SkillLevel(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"
        EXPERT = "expert", "Expert"

    talent_profile = models.ForeignKey(TalentProfile, on_delete=models.CASCADE, related_name="skills")
    category = models.ForeignKey(TalentCategory, on_delete=models.CASCADE, related_name="talent_skills")
    skill_level = models.CharField(max_length=20, choices=SkillLevel.choices, default=SkillLevel.INTERMEDIATE)

    class Meta:
        unique_together = ("talent_profile", "category")


class TalentEventType(TimeStampedUUIDModel):
    talent_profile = models.ForeignKey(TalentProfile, on_delete=models.CASCADE, related_name="event_types")
    event_type = models.ForeignKey(EventType, on_delete=models.CASCADE, related_name="talent_profiles")

    class Meta:
        unique_together = ("talent_profile", "event_type")


class TalentMedia(TimeStampedUUIDModel):
    class MediaType(models.TextChoices):
        IMAGE = "image", "Image"
        AUDIO = "audio", "Audio"
        VIDEO = "video", "Video"

    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        PRIVATE = "private", "Private"

    class ProcessingStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    talent_profile = models.ForeignKey(TalentProfile, on_delete=models.CASCADE, related_name="media")
    media_type = models.CharField(max_length=16, choices=MediaType.choices)
    storage_url = models.URLField(blank=True)
    file = models.FileField(upload_to=talent_media_upload_to, blank=True)
    mime_type = models.CharField(max_length=120, blank=True)
    file_size_bytes = models.PositiveBigIntegerField(null=True, blank=True)
    thumbnail_url = models.URLField(blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    visibility = models.CharField(max_length=16, choices=Visibility.choices, default=Visibility.PUBLIC)
    processing_status = models.CharField(
        max_length=16,
        choices=ProcessingStatus.choices,
        default=ProcessingStatus.PENDING,
    )

    class Meta:
        ordering = ["sort_order", "-created_at"]
        indexes = [
            models.Index(fields=["talent_profile", "visibility", "sort_order"]),
            models.Index(fields=["processing_status"]),
        ]


class TalentAvailability(TimeStampedUUIDModel):
    class AvailabilityType(models.TextChoices):
        AVAILABLE = "available", "Available"
        UNAVAILABLE = "unavailable", "Unavailable"
        TENTATIVE = "tentative", "Tentative"

    talent_profile = models.ForeignKey(TalentProfile, on_delete=models.CASCADE, related_name="availability_blocks")
    availability_type = models.CharField(max_length=16, choices=AvailabilityType.choices)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    recurrence_rule = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["talent_profile", "start_at", "end_at"]),
            models.Index(fields=["availability_type"]),
        ]


class Favorite(TimeStampedUUIDModel):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    talent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorited_by")

    class Meta:
        unique_together = ("client", "talent")
