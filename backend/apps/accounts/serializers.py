from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from apps.accounts.models import User
from apps.profiles.models import ClientProfile, TalentProfile, UserProfile


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "phone", "role", "status"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "role",
            "password",
            "display_name",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        display_name = validated_data.pop("display_name")
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        UserProfile.objects.create(
            user=user,
            display_name=display_name,
        )

        if user.role == User.Role.TALENT:
            TalentProfile.objects.create(user=user)
        else:
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
