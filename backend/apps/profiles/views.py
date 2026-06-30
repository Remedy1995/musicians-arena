from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework import status

from apps.accounts.models import User
from apps.common.throttling import ScopedWriteThrottleMixin
from apps.profiles.filters import TalentProfileFilter
from apps.profiles.models import EventType, TalentCategory, TalentMedia, TalentProfile
from apps.profiles.serializers import (
    EventTypeSerializer,
    MeSerializer,
    TalentCategorySerializer,
    TalentMediaCreateUpdateSerializer,
    TalentMediaSerializer,
    TalentProfileDetailSerializer,
    TalentProfileListSerializer,
    TalentProfileUpdateSerializer,
    UserProfilePhotoUploadSerializer,
    UserProfileSerializer,
)


class TalentCategoryListView(generics.ListAPIView):
    queryset = TalentCategory.objects.order_by("name")
    serializer_class = TalentCategorySerializer
    permission_classes = [permissions.AllowAny]


class EventTypeListView(generics.ListAPIView):
    queryset = EventType.objects.order_by("name")
    serializer_class = EventTypeSerializer
    permission_classes = [permissions.AllowAny]


class TalentProfileListView(generics.ListAPIView):
    serializer_class = TalentProfileListSerializer
    permission_classes = [permissions.AllowAny]
    search_fields = ["user__username", "user__profile__display_name", "user__profile__city", "user__profile__region"]
    ordering_fields = ["average_rating", "review_count", "booking_count", "created_at"]
    filterset_class = TalentProfileFilter

    def get_queryset(self):
        return (
            TalentProfile.objects.select_related("user", "user__profile", "primary_category")
            .prefetch_related("skills__category", "event_types__event_type")
            .filter(user__role=User.Role.TALENT)
            .distinct()
            .order_by("-is_featured", "-average_rating", "-created_at")
        )


class TalentProfileDetailView(generics.RetrieveAPIView):
    serializer_class = TalentProfileDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return TalentProfile.objects.select_related("user", "user__profile", "primary_category").prefetch_related(
            "skills__category",
            "event_types__event_type",
            "media",
        )


class MyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


class MyProfilePhotoUploadView(ScopedWriteThrottleMixin, generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = UserProfilePhotoUploadSerializer
    throttle_scope = "media_upload"

    def get_object(self):
        return self.request.user.profile

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(UserProfileSerializer(profile, context={"request": request}).data, status=status.HTTP_200_OK)


class TalentProfileUpdateView(ScopedWriteThrottleMixin, generics.RetrieveUpdateAPIView):
    serializer_class = TalentProfileUpdateSerializer
    throttle_scope = "profile_write"

    def get_object(self):
        user = self.request.user
        if user.role != User.Role.TALENT:
            raise PermissionDenied("Only talent accounts can manage talent profiles.")
        return user.talent_profile


class TalentMediaListCreateView(ScopedWriteThrottleMixin, generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    queryset = TalentMedia.objects.none()
    throttle_scope = "media_upload"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False) or not self.request.user.is_authenticated:
            return TalentMedia.objects.none()
        user = self.request.user
        if user.role != User.Role.TALENT:
            raise PermissionDenied("Only talent accounts can manage portfolio media.")
        return TalentMedia.objects.filter(talent_profile=user.talent_profile).order_by("sort_order", "-created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TalentMediaCreateUpdateSerializer
        return TalentMediaSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.user.is_authenticated and self.request.user.role == User.Role.TALENT:
            context["talent_profile"] = self.request.user.talent_profile
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        media = serializer.save()
        return Response(TalentMediaSerializer(media, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)


class TalentMediaDetailView(ScopedWriteThrottleMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    queryset = TalentMedia.objects.none()
    throttle_scope = "media_upload"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False) or not self.request.user.is_authenticated:
            return TalentMedia.objects.none()
        user = self.request.user
        if user.role != User.Role.TALENT:
            raise PermissionDenied("Only talent accounts can manage portfolio media.")
        return TalentMedia.objects.filter(talent_profile=user.talent_profile)

    def get_serializer_class(self):
        if self.request.method in {"PATCH", "PUT"}:
            return TalentMediaCreateUpdateSerializer
        return TalentMediaSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["talent_profile"] = self.request.user.talent_profile
        return context

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        media = serializer.save()
        return Response(TalentMediaSerializer(media, context=self.get_serializer_context()).data)

    def perform_destroy(self, instance):
        if instance.file:
            instance.file.delete(save=False)
        instance.delete()
