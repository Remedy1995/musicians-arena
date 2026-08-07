from django.test import TestCase

from apps.accounts.models import User, UserCapability
from apps.accounts.serializers import RegisterSerializer
from apps.profiles.models import ClientProfile, TalentProfile


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
