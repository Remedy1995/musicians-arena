from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.profiles.models import EventType, TalentCategory


TALENT_CATEGORIES = [
    "Keyboardist",
    "Bassist",
    "Drummer",
    "Guitarist",
    "Trumpeter",
    "Saxophonist",
    "Vocalist",
    "DJ",
    "MC",
    "Sound Engineer",
]

EVENT_TYPES = [
    "Church Service",
    "All Night Service",
    "31st Night",
    "Wedding",
    "Outdooring",
    "Funeral",
    "Corporate Event",
    "Concert",
    "Recording Session",
]


class Command(BaseCommand):
    help = "Seed talent categories and event types for Musician's Arena."

    def handle(self, *args, **options):
        for name in TALENT_CATEGORIES:
            TalentCategory.objects.get_or_create(
                slug=slugify(name),
                defaults={"name": name},
            )

        for name in EVENT_TYPES:
            EventType.objects.get_or_create(
                slug=slugify(name),
                defaults={"name": name},
            )

        self.stdout.write(self.style.SUCCESS("Marketplace reference data seeded successfully."))
