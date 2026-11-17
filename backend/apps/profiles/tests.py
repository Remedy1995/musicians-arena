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

    def test_missing_user_profile_is_recreated_for_profile_reads(self):
        UserProfile.objects.filter(user=self.user).delete()

        response = self.client.get("/api/v1/profiles/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["display_name"], self.user.username)
        self.assertTrue(UserProfile.objects.filter(user=self.user).exists())


class TalentProfileRecoveryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="recoverable_talent",
            email="recoverable-talent@example.com",
            phone="233200000202",
            password="Password123",
        )
        UserCapability.objects.create(user=self.user, capability=UserCapability.Capability.TALENT)
        self.client.force_authenticate(self.user)

    def test_missing_talent_profile_is_recreated_for_profile_reads(self):
        response = self.client.get("/api/v1/profiles/talent/me/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(TalentProfile.objects.filter(user=self.user).exists())
        self.assertTrue(UserProfile.objects.filter(user=self.user).exists())

    def test_missing_talent_profile_returns_an_empty_media_list(self):
        response = self.client.get("/api/v1/profiles/talent/me/media/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])


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


class RoleAwareContactDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organizer = User.objects.create_user(
            username="contact_organizer",
            email="organizer-contact@example.com",
            phone="233200000210",
            password="Password123",
        )
        self.talent_user = User.objects.create_user(
            username="contact_talent",
            email="talent-contact@example.com",
            phone="233200000211",
            password="Password123",
        )
        UserCapability.objects.create(user=self.organizer, capability=UserCapability.Capability.ORGANIZER)
        UserCapability.objects.create(user=self.talent_user, capability=UserCapability.Capability.TALENT)
        UserProfile.objects.create(user=self.organizer, display_name="Contact Organizer")
        UserProfile.objects.create(user=self.talent_user, display_name="Contact Talent")
        self.talent = TalentProfile.objects.create(user=self.talent_user)

    def test_organizer_can_see_talent_contact_on_talent_detail(self):
        self.client.force_authenticate(self.organizer)

        response = self.client.get(f"/api/v1/profiles/talents/{self.talent.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["contact"], {
            "email": "talent-contact@example.com",
            "phone": "233200000211",
        })

    def test_public_talent_detail_does_not_expose_contact(self):
        response = self.client.get(f"/api/v1/profiles/talents/{self.talent.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["contact"])
