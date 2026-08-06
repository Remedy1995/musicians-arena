from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.notifications.models import PushDevice


class PushDeviceRegistrationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="push_user",
            email="push@example.com",
            password="Password123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_registering_the_same_token_reuses_one_device(self):
        payload = {
            "expo_push_token": "ExponentPushToken[test-token]",
            "platform": "android",
            "device_name": "Test handset",
        }

        first_response = self.client.post("/api/v1/notifications/devices/", payload, format="json")
        second_response = self.client.post(
            "/api/v1/notifications/devices/",
            {**payload, "device_name": "Updated handset"},
            format="json",
        )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(PushDevice.objects.filter(user=self.user).count(), 1)
        self.assertEqual(PushDevice.objects.get(user=self.user).device_name, "Updated handset")
