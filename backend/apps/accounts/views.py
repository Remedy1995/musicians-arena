from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserCapability
from apps.accounts.serializers import AddCapabilitySerializer, AuthResponseSerializer, LoginSerializer, RegisterSerializer, UserSummarySerializer
from apps.profiles.models import ClientProfile, TalentProfile, TalentSkill, UserProfile
from apps.common.throttling import ScopedWriteThrottleMixin


class RegisterView(ScopedWriteThrottleMixin, generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AuthResponseSerializer.from_user(user), status=status.HTTP_201_CREATED)


class LoginView(ScopedWriteThrottleMixin, APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_login"

    @extend_schema(tags=["Auth"], summary="Log in", request=LoginSerializer, responses=AuthResponseSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(AuthResponseSerializer.from_user(serializer.validated_data["user"]))


class AddCapabilityView(ScopedWriteThrottleMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "profile_write"

    @extend_schema(tags=["Auth"], summary="Add a capability to the current account", request=AddCapabilitySerializer, responses=UserSummarySerializer)
    def post(self, request):
        serializer = AddCapabilitySerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        capability = serializer.validated_data["capability"]
        UserCapability.objects.create(user=request.user, capability=capability)
        if capability == UserCapability.Capability.TALENT:
            display_name = serializer.validated_data["display_name"]
            categories = serializer.validated_data["skill_category_ids"]
            profile, _ = UserProfile.objects.get_or_create(user=request.user, defaults={"display_name": display_name})
            if profile.display_name != display_name:
                profile.display_name = display_name
                profile.save(update_fields=["display_name", "updated_at"])
            talent_profile, _ = TalentProfile.objects.get_or_create(
                user=request.user,
                defaults={"primary_category": categories[0]},
            )
            talent_profile.primary_category = categories[0]
            talent_profile.save(update_fields=["primary_category", "updated_at"])
            TalentSkill.objects.bulk_create(
                [TalentSkill(talent_profile=talent_profile, category=category) for category in categories],
                ignore_conflicts=True,
            )
        else:
            ClientProfile.objects.get_or_create(
                user=request.user,
                defaults={
                    "organization_name": serializer.validated_data["organization_name"],
                    "location": serializer.validated_data["organization_location"],
                    "description": serializer.validated_data["organization_description"],
                },
            )
        return Response(UserSummarySerializer(request.user).data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=["Auth"], summary="Get current authenticated user", responses=UserSummarySerializer)
    def get(self, request):
        return Response(AuthResponseSerializer.from_user(request.user)["user"])
