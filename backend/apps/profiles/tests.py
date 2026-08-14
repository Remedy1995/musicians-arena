from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, UserCapability
from apps.profiles.models import ClientProfile, TalentCategory, TalentProfile, TalentSkill, UserProfile


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


class TalentDirectoryFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.keyboardist = TalentCategory.objects.create(name="Keyboardist", slug="keyboardist")
        self.bassist = TalentCategory.objects.create(name="Bassist", slug="bassist")
        self.user = User.objects.create_user(
            username="multi_skill_talent",
            email="multi-skill@example.com",
            phone="233200000201",
            password="Password123",
        )
        UserCapability.objects.create(user=self.user, capability=UserCapability.Capability.TALENT)
        UserProfile.objects.create(user=self.user, display_name="Multi Skill Talent")
        self.talent = TalentProfile.objects.create(user=self.user, primary_category=self.keyboardist)
        TalentSkill.objects.create(talent_profile=self.talent, category=self.keyboardist)
        TalentSkill.objects.create(talent_profile=self.talent, category=self.bassist)

    def test_skill_filter_matches_any_talent_skill_not_only_primary(self):
        response = self.client.get(f"/api/v1/profiles/talents/?skill_category={self.bassist.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [str(self.talent.id)])

    def test_text_search_matches_display_name(self):
        response = self.client.get("/api/v1/profiles/talents/?search=multi%20skill")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [str(self.talent.id)])
