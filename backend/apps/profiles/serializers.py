from django.conf import settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts.models import User
from apps.profiles.models import EventType, TalentCategory, TalentEventType, TalentMedia, TalentProfile, TalentSkill, UserProfile


class TalentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TalentCategory
        fields = ["id", "name", "slug"]


class EventTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventType
        fields = ["id", "name", "slug"]


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "display_name",
            "first_name",
            "last_name",
            "profile_image_url",
            "cover_image_url",
            "bio",
            "city",
            "region",
            "country",
            "timezone",
        ]
        read_only_fields = ["id"]


class TalentMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TalentMedia
        fields = [
            "id",
            "media_type",
            "storage_url",
            "file_url",
            "thumbnail_url",
            "mime_type",
            "file_size_bytes",
            "title",
            "description",
            "sort_order",
            "visibility",
            "processing_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "storage_url",
            "file_url",
            "mime_type",
            "file_size_bytes",
            "processing_status",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(OpenApiTypes.URI)
    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file:
            url = obj.file.url
            return request.build_absolute_uri(url) if request else url
        if obj.storage_url:
            return obj.storage_url
        return ""


class TalentMediaCreateUpdateSerializer(serializers.ModelSerializer):
    file = serializers.FileField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = TalentMedia
        fields = [
            "media_type",
            "file",
            "storage_url",
            "thumbnail_url",
            "title",
            "description",
            "sort_order",
            "visibility",
        ]

    def validate(self, attrs):
        file = attrs.get("file")
        storage_url = attrs.get("storage_url")
        instance = getattr(self, "instance", None)

        if not file and not storage_url and not instance:
            raise serializers.ValidationError("Provide either a file upload or an existing storage URL.")
        if file and storage_url:
            raise serializers.ValidationError("Provide either a file upload or a storage URL, not both.")
        return attrs

    def validate_file(self, value):
        media_type = self.initial_data.get("media_type") or getattr(self.instance, "media_type", None)
        if not media_type:
            raise serializers.ValidationError("Media type is required when uploading a file.")

        max_bytes_by_type = {
            TalentMedia.MediaType.IMAGE: settings.MEDIA_MAX_IMAGE_BYTES,
            TalentMedia.MediaType.AUDIO: settings.MEDIA_MAX_AUDIO_BYTES,
            TalentMedia.MediaType.VIDEO: settings.MEDIA_MAX_VIDEO_BYTES,
        }
        allowed_content_types = {
            TalentMedia.MediaType.IMAGE: {"image/jpeg", "image/png", "image/webp"},
            TalentMedia.MediaType.AUDIO: {"audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4"},
            TalentMedia.MediaType.VIDEO: {"video/mp4", "video/quicktime", "video/webm"},
        }

        if value.size > max_bytes_by_type[media_type]:
            raise serializers.ValidationError("Uploaded file exceeds the size limit for this media type.")
        content_type = getattr(value, "content_type", "")
        if content_type and content_type not in allowed_content_types[media_type]:
            raise serializers.ValidationError("Unsupported file type for this media category.")
        return value

    def create(self, validated_data):
        upload = validated_data.pop("file", None)
        talent_profile = self.context["talent_profile"]
        media = TalentMedia(
            talent_profile=talent_profile,
            processing_status=TalentMedia.ProcessingStatus.PENDING,
            **validated_data,
        )
        if upload:
            media.file = upload
            media.mime_type = getattr(upload, "content_type", "") or media.mime_type
            media.file_size_bytes = upload.size
            media.processing_status = TalentMedia.ProcessingStatus.READY
        else:
            media.processing_status = TalentMedia.ProcessingStatus.READY
        media.save()
        if media.file and not media.storage_url:
            media.storage_url = self._build_file_url(media)
            media.save(update_fields=["storage_url", "updated_at"])
        return media

    def update(self, instance, validated_data):
        upload = validated_data.pop("file", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if upload:
            if instance.file:
                instance.file.delete(save=False)
            instance.file = upload
            instance.mime_type = getattr(upload, "content_type", "") or instance.mime_type
            instance.file_size_bytes = upload.size
            instance.processing_status = TalentMedia.ProcessingStatus.READY
        elif instance.storage_url:
            instance.processing_status = TalentMedia.ProcessingStatus.READY
        instance.save()
        if instance.file:
            instance.storage_url = self._build_file_url(instance)
            instance.save(update_fields=["storage_url", "updated_at"])
        return instance

    def _build_file_url(self, instance):
        request = self.context.get("request")
        url = instance.file.url
        return request.build_absolute_uri(url) if request else url


class TalentProfileListSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    display_name = serializers.CharField(source="user.profile.display_name", read_only=True)
    city = serializers.CharField(source="user.profile.city", read_only=True)
    region = serializers.CharField(source="user.profile.region", read_only=True)
    bio = serializers.CharField(source="user.profile.bio", read_only=True)
    primary_category = TalentCategorySerializer(read_only=True)

    class Meta:
        model = TalentProfile
        fields = [
            "id",
            "user_id",
            "username",
            "display_name",
            "city",
            "region",
            "bio",
            "stage_name",
            "years_of_experience",
            "primary_category",
            "hourly_rate_min",
            "hourly_rate_max",
            "fixed_price_min",
            "fixed_price_max",
            "average_rating",
            "review_count",
            "booking_count",
            "is_featured",
        ]


class TalentProfileDetailSerializer(TalentProfileListSerializer):
    profile = UserProfileSerializer(source="user.profile", read_only=True)
    skills = serializers.SerializerMethodField()
    event_types = serializers.SerializerMethodField()
    media = TalentMediaSerializer(many=True, read_only=True)

    class Meta(TalentProfileListSerializer.Meta):
        fields = TalentProfileListSerializer.Meta.fields + [
            "travel_radius_km",
            "response_time_minutes",
            "reliability_score",
            "verified_at",
            "profile",
            "skills",
            "event_types",
            "media",
        ]

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_skills(self, obj):
        return [
            {
                "id": str(skill.category_id),
                "name": skill.category.name,
                "slug": skill.category.slug,
                "skill_level": skill.skill_level,
            }
            for skill in obj.skills.select_related("category").all()
        ]

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_event_types(self, obj):
        return [
            {
                "id": str(item.event_type_id),
                "name": item.event_type.name,
                "slug": item.event_type.slug,
            }
            for item in obj.event_types.select_related("event_type").all()
        ]


class TalentProfileUpdateSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(source="user.profile")
    skill_category_ids = serializers.PrimaryKeyRelatedField(
        queryset=TalentCategory.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    event_type_ids = serializers.PrimaryKeyRelatedField(
        queryset=EventType.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )

    class Meta:
        model = TalentProfile
        fields = [
            "stage_name",
            "years_of_experience",
            "primary_category",
            "hourly_rate_min",
            "hourly_rate_max",
            "fixed_price_min",
            "fixed_price_max",
            "travel_radius_km",
            "profile",
            "skill_category_ids",
            "event_type_ids",
        ]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("user", {}).get("profile", {})
        skill_categories = validated_data.pop("skill_category_ids", None)
        event_types = validated_data.pop("event_type_ids", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        profile = instance.user.profile
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()

        if skill_categories is not None:
            instance.skills.exclude(category__in=skill_categories).delete()
            existing_skill_ids = set(instance.skills.values_list("category_id", flat=True))
            for category in skill_categories:
                if category.id not in existing_skill_ids:
                    TalentSkill.objects.create(
                        talent_profile=instance,
                        category=category,
                    )

        if event_types is not None:
            instance.event_types.exclude(event_type__in=event_types).delete()
            existing_event_type_ids = set(instance.event_types.values_list("event_type_id", flat=True))
            for event_type in event_types:
                if event_type.id not in existing_event_type_ids:
                    TalentEventType.objects.create(
                        talent_profile=instance,
                        event_type=event_type,
                    )

        return instance


class MeSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ["id", "username", "email", "phone", "role", "status", "profile"]
        read_only_fields = ["id", "role", "status"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        profile = instance.profile
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()

        return instance
