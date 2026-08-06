from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import User, UserCapability
from apps.profiles.management.commands.seed_marketplace_reference_data import EVENT_TYPES, TALENT_CATEGORIES
from apps.profiles.models import (
    ClientProfile,
    EventType,
    TalentCategory,
    TalentEventType,
    TalentProfile,
    TalentSkill,
    UserProfile,
)
from django.utils.text import slugify


TALENT_NAMES = [
    "Kwame Mensah",
    "Ama Owusu",
    "Kojo Asare",
    "Esi Boateng",
    "Yaw Addo",
    "Nana Serwaa",
    "Kofi Antwi",
    "Akosua Boadu",
    "Fiifi Arthur",
    "Adwoa Ofori",
]

ORGANIZER_NAMES = [
    "Grace Chapel",
    "New Dawn Worship Centre",
    "Covenant House",
    "Kingdom Life Church",
    "Harvest Praise Assembly",
    "The Wedding Collective",
    "Accra Events House",
    "Living Springs Church",
    "Ridge Community Chapel",
    "Purpose Centre Ghana",
]


class Command(BaseCommand):
    help = "Create idempotent demo talent and organizer accounts for marketplace testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=10,
            help="Number of accounts to create for each role (maximum 10).",
        )
        parser.add_argument(
            "--password",
            default="DemoPass123!",
            help="Password assigned to every demo account.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        count = options["count"]
        password = options["password"]
        if count < 1 or count > 10:
            raise CommandError("--count must be between 1 and 10.")
        if len(password) < 8:
            raise CommandError("The demo password must be at least 8 characters.")

        categories = self._seed_categories()
        event_types = self._seed_event_types()

        for index in range(count):
            self._seed_talent(index, password, categories, event_types)
            self._seed_organizer(index, password)

        self.stdout.write(self.style.SUCCESS(f"Seeded {count} demo talents and {count} demo organizers."))
        self.stdout.write(f"Demo password: {password}")

    def _seed_categories(self):
        return [
            TalentCategory.objects.get_or_create(slug=slugify(name), defaults={"name": name})[0]
            for name in TALENT_CATEGORIES
        ]

    def _seed_event_types(self):
        return [
            EventType.objects.get_or_create(slug=slugify(name), defaults={"name": name})[0]
            for name in EVENT_TYPES
        ]

    def _upsert_user(self, username, email, phone, role, display_name, password):
        user, _ = User.objects.get_or_create(username=username)
        user.email = email
        user.phone = phone
        user.role = role
        user.status = User.Status.ACTIVE
        user.is_active = True
        user.set_password(password)
        user.save(update_fields=["email", "phone", "role", "status", "is_active", "password", "updated_at"])
        UserCapability.objects.get_or_create(
            user=user,
            capability=(
                UserCapability.Capability.TALENT
                if role == User.Role.TALENT
                else UserCapability.Capability.ORGANIZER
            ),
        )
        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                "display_name": display_name,
                "first_name": display_name.split(" ", 1)[0],
                "last_name": display_name.split(" ", 1)[-1],
                "city": "Accra",
                "region": "Greater Accra",
                "country": "Ghana",
            },
        )
        return user

    def _seed_talent(self, index, password, categories, event_types):
        name = TALENT_NAMES[index]
        category = categories[index % len(categories)]
        user = self._upsert_user(
            username=f"demo_talent_{index + 1:02d}",
            email=f"demo.talent.{index + 1:02d}@musiciansarena.test",
            phone=f"233550000{index + 1:03d}",
            role=User.Role.TALENT,
            display_name=name,
            password=password,
        )
        talent, _ = TalentProfile.objects.update_or_create(
            user=user,
            defaults={
                "stage_name": name,
                "years_of_experience": 3 + index,
                "primary_category": category,
                "fixed_price_min": 300 + (index * 25),
                "fixed_price_max": 900 + (index * 50),
                "hourly_rate_min": 100 + (index * 10),
                "hourly_rate_max": 250 + (index * 15),
                "travel_radius_km": 50,
                "response_time_minutes": 60,
                "is_featured": index < 3,
            },
        )
        TalentSkill.objects.get_or_create(talent_profile=talent, category=category)
        for event_type in event_types[index % len(event_types) : (index % len(event_types)) + 2]:
            TalentEventType.objects.get_or_create(talent_profile=talent, event_type=event_type)

    def _seed_organizer(self, index, password):
        name = ORGANIZER_NAMES[index]
        user = self._upsert_user(
            username=f"demo_organizer_{index + 1:02d}",
            email=f"demo.organizer.{index + 1:02d}@musiciansarena.test",
            phone=f"233240000{index + 1:03d}",
            role=User.Role.CLIENT,
            display_name=name,
            password=password,
        )
        ClientProfile.objects.update_or_create(
            user=user,
            defaults={
                "organization_name": name,
                "client_type": ClientProfile.ClientType.CHURCH if index < 5 else ClientProfile.ClientType.EVENT_PLANNER,
            },
        )
