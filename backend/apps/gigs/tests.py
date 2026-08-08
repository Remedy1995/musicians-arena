from datetime import date, time
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, UserCapability
from apps.gigs.models import Gig, GigInterest
from apps.profiles.models import ClientProfile, TalentCategory, TalentProfile, UserProfile


class GigInvitationFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organizer = User.objects.create_user(
            username="organizer_one",
            email="organizer@example.com",
            phone="233200000001",
            password="Password123",
        )
        self.talent = User.objects.create_user(
            username="talent_one",
            email="talent@example.com",
            phone="233200000002",
            password="Password123",
        )
        UserCapability.objects.create(user=self.organizer, capability=UserCapability.Capability.ORGANIZER)
        UserCapability.objects.create(user=self.talent, capability=UserCapability.Capability.TALENT)
        UserProfile.objects.create(user=self.organizer, display_name="Grace Chapel")
        UserProfile.objects.create(user=self.talent, display_name="Ama Keys")
        ClientProfile.objects.create(user=self.organizer, organization_name="Grace Chapel", location="Accra", description="A church community")
        category = TalentCategory.objects.create(name="Keyboardist", slug="keyboardist")
        TalentProfile.objects.create(user=self.talent, primary_category=category)
        self.gig = Gig.objects.create(
            organizer=self.organizer,
            title="Sunday worship service",
            description="Lead keys for the morning service.",
            requirements="Comfortable with live worship sets.",
            event_date=date(2026, 9, 6),
            start_time=time(8, 0),
            venue_address="Grace Chapel, Accra",
            city="Accra",
            region="Greater Accra",
            budget_min="500.00",
            budget_max="800.00",
        )

    @patch("apps.gigs.views.notify_gig_invitation_sent")
    def test_organizer_can_invite_talent_to_open_gig(self, notify_invitation):
        self.client.force_authenticate(self.organizer)

        response = self.client.post(
            f"/api/v1/gigs/{self.gig.id}/invitations/",
            {"talent_id": str(self.talent.id), "note": "Your keyboard experience looks like a strong fit."},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        interest = GigInterest.objects.get(gig=self.gig, talent=self.talent)
        self.assertEqual(interest.status, GigInterest.Status.INVITED)
        self.assertEqual(interest.initiated_by, GigInterest.InitiatedBy.ORGANIZER)
        self.assertEqual(response.data["interest"]["status"], GigInterest.Status.INVITED)
        self.assertIsNotNone(response.data["conversation"])
        notify_invitation.assert_called_once_with(interest=interest)

    @patch("apps.gigs.views.notify_gig_invitation_response")
    def test_invited_talent_can_accept_invitation(self, notify_response):
        interest = GigInterest.objects.create(
            gig=self.gig,
            talent=self.talent,
            talent_profile=self.talent.talent_profile,
            initiated_by=GigInterest.InitiatedBy.ORGANIZER,
            status=GigInterest.Status.INVITED,
            note="Please confirm your availability.",
        )
        self.client.force_authenticate(self.talent)

        response = self.client.patch(
            f"/api/v1/gigs/interests/{interest.id}/response/",
            {"status": GigInterest.Status.INVITE_ACCEPTED},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        interest.refresh_from_db()
        self.assertEqual(interest.status, GigInterest.Status.INVITE_ACCEPTED)
        self.assertEqual(response.data["interest"]["status"], GigInterest.Status.INVITE_ACCEPTED)
        notify_response.assert_called_once_with(interest=interest)

    def test_invitation_response_is_only_available_to_invited_talent(self):
        interest = GigInterest.objects.create(
            gig=self.gig,
            talent=self.talent,
            talent_profile=self.talent.talent_profile,
            initiated_by=GigInterest.InitiatedBy.TALENT,
            status=GigInterest.Status.INTERESTED,
        )
        self.client.force_authenticate(self.talent)

        response = self.client.patch(
            f"/api/v1/gigs/interests/{interest.id}/response/",
            {"status": GigInterest.Status.INVITE_ACCEPTED},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        interest.refresh_from_db()
        self.assertEqual(interest.status, GigInterest.Status.INTERESTED)
