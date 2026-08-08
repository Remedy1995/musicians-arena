from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, UserCapability
from apps.profiles.models import ClientProfile, UserProfile


class OrganizerProfileUpdateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="profile_organizer",
            email="profile-organizer@example.com",
            phone="233200000200",
            password="Password123",
        )
        UserCapability.objects.create(user=self.user, capability=UserCapability.Capability.ORGANIZER)
        UserProfile.objects.create(user=self.user, display_name="Organizer")
        ClientProfile.objects.create(user=self.user, organization_name="Old name")
        self.client.force_authenticate(self.user)

    def test_organizer_profile_details_can_be_edited(self):
        response = self.client.patch(
            "/api/v1/profiles/me/",
            {
                "organizer_profile": {
                    "organization_name": "New organization name",
                    "location": "Kumasi",
                    "description": "We organize live music programs.",
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        profile = ClientProfile.objects.get(user=self.user)
        self.assertEqual(profile.organization_name, "New organization name")
        self.assertEqual(profile.location, "Kumasi")
        self.assertEqual(profile.description, "We organize live music programs.")
