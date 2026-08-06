from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification, PushDevice
from apps.notifications.serializers import NotificationSerializer, NotificationUnreadCountSerializer, PushDeviceSerializer
from apps.common.throttling import ScopedWriteThrottleMixin


@extend_schema_view(
    get=extend_schema(tags=["Notifications"], summary="List user notifications"),
)
class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Notification.objects.none()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")


@extend_schema(tags=["Notifications"], summary="Mark notification as read")
class NotificationMarkReadView(generics.UpdateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def patch(self, request, *args, **kwargs):
        notification = self.get_object()
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at", "updated_at"])
        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)


@extend_schema(tags=["Notifications"], summary="Get unread notification count", responses=NotificationUnreadCountSerializer)
class NotificationUnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        unread_count = Notification.objects.filter(user=request.user, read_at__isnull=True).count()
        return Response({"unread_count": unread_count}, status=status.HTTP_200_OK)


class PushDeviceRegisterView(ScopedWriteThrottleMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "profile_write"

    @extend_schema(
        tags=["Notifications"],
        summary="Register a native push device for the current user",
        request=PushDeviceSerializer,
        responses=PushDeviceSerializer,
    )
    def post(self, request):
        serializer = PushDeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        device, _ = PushDevice.objects.update_or_create(
            expo_push_token=values["expo_push_token"],
            defaults={
                "user": request.user,
                "platform": values["platform"],
                "device_name": values.get("device_name", ""),
                "is_active": True,
                "last_seen_at": timezone.now(),
            },
        )
        return Response(PushDeviceSerializer(device).data, status=status.HTTP_200_OK)
