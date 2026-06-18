from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedUUIDModel


class Gig(TimeStampedUUIDModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_REVIEW = "in_review", "In Review"
        CLOSED = "closed", "Closed"
        CANCELLED = "cancelled", "Cancelled"

    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        VERIFIED_ONLY = "verified_only", "Verified Only"

    organizer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="gigs_created")
    event_type = models.ForeignKey("profiles.EventType", null=True, blank=True, on_delete=models.SET_NULL, related_name="gigs")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.PUBLIC)
    event_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    venue_name = models.CharField(max_length=255, blank=True)
    venue_address = models.TextField()
    city = models.CharField(max_length=120)
    region = models.CharField(max_length=120)
    budget_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency_code = models.CharField(max_length=3, default="GHS")
    is_urgent = models.BooleanField(default=False)

    def __str__(self):
        return self.title


class GigTalentCategory(TimeStampedUUIDModel):
    gig = models.ForeignKey(Gig, on_delete=models.CASCADE, related_name="required_categories")
    category = models.ForeignKey("profiles.TalentCategory", on_delete=models.CASCADE, related_name="gig_requirements")

    class Meta:
        unique_together = ("gig", "category")


class GigInterest(TimeStampedUUIDModel):
    class Status(models.TextChoices):
        INTERESTED = "interested", "Interested"
        SHORTLISTED = "shortlisted", "Shortlisted"
        INVITED = "invited", "Invited"
        DECLINED = "declined", "Declined"

    gig = models.ForeignKey(Gig, on_delete=models.CASCADE, related_name="interests")
    talent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="gig_interests")
    talent_profile = models.ForeignKey("profiles.TalentProfile", on_delete=models.CASCADE, related_name="gig_interests")
    note = models.TextField(blank=True)
    proposed_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INTERESTED)

    class Meta:
        unique_together = ("gig", "talent")

    def __str__(self):
        return f"{self.gig_id}:{self.talent_id}:{self.status}"
