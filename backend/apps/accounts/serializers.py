from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from apps.accounts.models import User, UserCapability
from apps.profiles.models import ClientProfile, TalentProfile, UserProfile


class UserSummarySerializer(serializers.ModelSerializer):
    capabilities = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "phone", "role", "status", "capabilities"]

    def get_capabilities(self, obj):
        return obj.capability_values()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(write_only=True)
    capabilities = serializers.ListField(
        child=serializers.ChoiceField(choices=UserCapability.Capability.values),
        required=False,
        allow_empty=False,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "role",
            "capabilities",
            "password",
            "display_name",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {"role": {"required": False}}

    def validate(self, attrs):
        requested = attrs.get("capabilities")
        legacy_role = attrs.get("role")
        if not requested:
            requested = [
                UserCapability.Capability.TALENT
                if legacy_role == User.Role.TALENT
                else UserCapability.Capability.ORGANIZER
            ]
        attrs["capabilities"] = list(dict.fromkeys(requested))
        return attrs

    def create(self, validated_data):
        display_name = validated_data.pop("display_name")
        password = validated_data.pop("password")
        capabilities = validated_data.pop("capabilities", [])
        validated_data["role"] = (
            User.Role.TALENT
            if capabilities[0] == UserCapability.Capability.TALENT
            else User.Role.CLIENT
        )

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        UserCapability.objects.bulk_create(
            [UserCapability(user=user, capability=capability) for capability in capabilities]
        )

        UserProfile.objects.create(
            user=user,
            display_name=display_name,
        )

        if UserCapability.Capability.TALENT in capabilities:
            TalentProfile.objects.create(user=user)
        if UserCapability.Capability.ORGANIZER in capabilities:
            ClientProfile.objects.create(user=user)

        Token.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs["username"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Invalid username or password.")
        attrs["user"] = user
        return attrs


class AddCapabilitySerializer(serializers.Serializer):
    capability = serializers.ChoiceField(choices=UserCapability.Capability.values)

    def validate_capability(self, value):
        if UserCapability.objects.filter(user=self.context["request"].user, capability=value).exists():
            raise serializers.ValidationError("This capability is already enabled on your account.")
        return value


class AuthResponseSerializer(serializers.Serializer):
    token = serializers.CharField()
    user = UserSummarySerializer()

    @staticmethod
    def from_user(user):
        token, _ = Token.objects.get_or_create(user=user)
        return {
            "token": token.key,
            "user": UserSummarySerializer(user).data,
        }
