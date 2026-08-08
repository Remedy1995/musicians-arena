from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, UserCapability
from apps.accounts.serializers import RegisterSerializer
from apps.profiles.models import ClientProfile, TalentCategory, TalentProfile, TalentSkill


class RegistrationCapabilityTests(TestCase):
    def test_registration_can_create_both_capabilities_and_profiles(self):
        serializer = RegisterSerializer(
            data={
                "username": "multi_role_user",
                "email": "multi@example.com",
                "phone": "233200000099",
                "capabilities": ["talent", "organizer"],
                "password": "Password123",
                "display_name": "Multi Role User",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(set(user.capability_values()), {"talent", "organizer"})
        self.assertTrue(TalentProfile.objects.filter(user=user).exists())
        self.assertTrue(ClientProfile.objects.filter(user=user).exists())
        self.assertEqual(UserCapability.objects.filter(user=user).count(), 2)

    def test_legacy_role_registration_still_maps_to_one_capability(self):
        serializer = RegisterSerializer(
            data={
                "username": "legacy_talent_user",
                "email": "legacy@example.com",
                "phone": "233200000098",
                "role": User.Role.TALENT,
                "password": "Password123",
                "display_name": "Legacy Talent User",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.capability_values(), ["talent"])
        self.assertTrue(TalentProfile.objects.filter(user=user).exists())
        self.assertFalse(ClientProfile.objects.filter(user=user).exists())

    def test_registration_creates_a_neutral_account_without_a_profile(self):
        serializer = RegisterSerializer(
            data={
                "username": "neutral_user",
                "email": "neutral@example.com",
                "phone": "233200000097",
                "password": "Password123",
                "display_name": "Neutral User",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.role, User.Role.ACCOUNT)
        self.assertEqual(user.capability_values(), [])
        self.assertFalse(TalentProfile.objects.filter(user=user).exists())
        self.assertFalse(ClientProfile.objects.filter(user=user).exists())


class CapabilityDueDiligenceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="multi_workspace_user",
            email="workspace@example.com",
            phone="233200000100",
            password="Password123",
        )
        self.keyboardist = TalentCategory.objects.create(name="Keyboardist", slug="keyboardist")
        self.bassist = TalentCategory.objects.create(name="Bassist", slug="bassist")

    def test_organizer_setup_persists_organization_due_diligence(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/v1/auth/capabilities/",
            {
                "capability": "organizer",
                "organization_name": "Grace Chapel",
                "organization_location": "East Legon, Accra",
                "organization_description": "A church that hosts worship services and community events.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        profile = ClientProfile.objects.get(user=self.user)
        self.assertEqual(profile.organization_name, "Grace Chapel")
        self.assertEqual(profile.location, "East Legon, Accra")
        self.assertIn("community events", profile.description)

    def test_talent_setup_persists_display_name_and_all_categories(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/v1/auth/capabilities/",
            {
                "capability": "talent",
                "display_name": "Ama Keys",
                "skill_category_ids": [str(self.keyboardist.id), str(self.bassist.id)],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.user.refresh_from_db()
        self.assertEqual(self.user.profile.display_name, "Ama Keys")
        self.assertEqual(
            set(TalentSkill.objects.filter(talent_profile=self.user.talent_profile).values_list("category_id", flat=True)),
            {self.keyboardist.id, self.bassist.id},
        )
