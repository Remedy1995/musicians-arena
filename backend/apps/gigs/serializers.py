from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User
from apps.gigs.models import Gig, GigInterest, GigTalentCategory
from apps.profiles.models import TalentCategory
from apps.bookings.models import Booking


class GigTalentCategorySerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="category.id", read_only=True)
    name = serializers.CharField(source="category.name", read_only=True)
    slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = GigTalentCategory
        fields = ["id", "name", "slug"]


class GigInterestSerializer(serializers.ModelSerializer):
    talent_id = serializers.UUIDField(source="talent.id", read_only=True)
    talent_username = serializers.CharField(source="talent.username", read_only=True)
    display_name = serializers.CharField(source="talent.profile.display_name", read_only=True)
    profile_image_url = serializers.SerializerMethodField()
    has_active_booking = serializers.SerializerMethodField()

    class Meta:
        model = GigInterest
        fields = [
            "id",
            "talent_id",
            "talent_username",
            "display_name",
            "profile_image_url",
            "note",
            "proposed_amount",
            "status",
            "has_active_booking",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "talent_id",
            "talent_username",
            "display_name",
            "profile_image_url",
            "status",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(OpenApiTypes.URI)
    def get_profile_image_url(self, obj):
        profile = getattr(obj.talent, "profile", None)
        if not profile:
            return None
        request = self.context.get("request")
        if profile.profile_image:
            url = profile.profile_image.url
            return request.build_absolute_uri(url) if request else url
        return profile.profile_image_url

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_has_active_booking(self, obj):
        return obj.gig.bookings.filter(talent=obj.talent).exclude(
            status__in=[Booking.Status.CANCELLED, Booking.Status.REFUNDED]
        ).exists()


class GigListSerializer(serializers.ModelSerializer):
    organizer_id = serializers.UUIDField(source="organizer.id", read_only=True)
    organizer_name = serializers.CharField(source="organizer.profile.display_name", read_only=True)
    event_type_name = serializers.CharField(source="event_type.name", read_only=True)
    required_categories = GigTalentCategorySerializer(many=True, read_only=True)
    interests_count = serializers.IntegerField(read_only=True)
    my_interest_status = serializers.SerializerMethodField()
    my_interest_id = serializers.SerializerMethodField()

    class Meta:
        model = Gig
        fields = [
            "id",
            "organizer_id",
            "organizer_name",
            "event_type",
            "event_type_name",
            "title",
            "description",
            "status",
            "visibility",
            "event_date",
            "start_time",
            "end_time",
            "city",
            "region",
            "budget_min",
            "budget_max",
            "currency_code",
            "is_urgent",
            "required_categories",
            "interests_count",
            "my_interest_status",
            "my_interest_id",
            "created_at",
        ]
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.STR)
    def get_my_interest_status(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != User.Role.TALENT:
            return None
        interest = obj.interests.filter(talent=request.user).only("status").first()
        return interest.status if interest else None

    @extend_schema_field(OpenApiTypes.UUID)
    def get_my_interest_id(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != User.Role.TALENT:
            return None
        interest = obj.interests.filter(talent=request.user).only("id").first()
        return str(interest.id) if interest else None


class GigDetailSerializer(GigListSerializer):
    requirements = serializers.CharField()
    venue_name = serializers.CharField()
    venue_address = serializers.CharField()
    interests = serializers.SerializerMethodField()

    class Meta(GigListSerializer.Meta):
        fields = GigListSerializer.Meta.fields + [
            "requirements",
            "venue_name",
            "venue_address",
            "interests",
        ]

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_interests(self, obj):
        request = self.context.get("request")
        if request and request.user.id == obj.organizer_id:
            return GigInterestSerializer(
                obj.interests.select_related("talent", "talent__profile").all(),
                many=True,
                context=self.context,
            ).data
        return []


class GigCreateUpdateSerializer(serializers.ModelSerializer):
    required_category_ids = serializers.PrimaryKeyRelatedField(
        queryset=TalentCategory.objects.all(),
        many=True,
        write_only=True,
    )

    class Meta:
        model = Gig
        fields = [
            "event_type",
            "title",
            "description",
            "requirements",
            "visibility",
            "event_date",
            "start_time",
            "end_time",
            "venue_name",
            "venue_address",
            "city",
            "region",
            "budget_min",
            "budget_max",
            "currency_code",
            "is_urgent",
            "required_category_ids",
        ]

    def validate(self, attrs):
        start_time = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end_time = attrs.get("end_time", getattr(self.instance, "end_time", None))
        budget_min = attrs.get("budget_min", getattr(self.instance, "budget_min", None))
        budget_max = attrs.get("budget_max", getattr(self.instance, "budget_max", None))
        event_date = attrs.get("event_date", getattr(self.instance, "event_date", None))

        if end_time and start_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        if budget_min is not None and budget_max is not None and budget_min > budget_max:
            raise serializers.ValidationError("Minimum budget cannot be greater than maximum budget.")
        if event_date and event_date < timezone.localdate():
            raise serializers.ValidationError({"event_date": "Event date cannot be in the past."})
        return attrs

    def create(self, validated_data):
        categories = validated_data.pop("required_category_ids", [])
        gig = Gig.objects.create(organizer=self.context["request"].user, **validated_data)
        GigTalentCategory.objects.bulk_create(
            [GigTalentCategory(gig=gig, category=category) for category in categories]
        )
        return gig

    def update(self, instance, validated_data):
        categories = validated_data.pop("required_category_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if categories is not None:
            instance.required_categories.exclude(category__in=categories).delete()
            existing_ids = set(instance.required_categories.values_list("category_id", flat=True))
            for category in categories:
                if category.id not in existing_ids:
                    GigTalentCategory.objects.create(gig=instance, category=category)
        return instance


class GigInterestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GigInterest
        fields = ["note", "proposed_amount"]

    def create(self, validated_data):
        request = self.context["request"]
        gig = self.context["gig"]
        return GigInterest.objects.create(
            gig=gig,
            talent=request.user,
            talent_profile=request.user.talent_profile,
            **validated_data,
        )


class GigInterestStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = GigInterest
        fields = ["status"]

    def validate_status(self, value):
        if value not in {
            GigInterest.Status.SHORTLISTED,
            GigInterest.Status.INVITED,
            GigInterest.Status.DECLINED,
        }:
            raise serializers.ValidationError("Invalid organizer action for gig interest.")
        return value


class GigInterestConversionSerializer(serializers.Serializer):
    quoted_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    deposit_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    balance_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        interest = self.context["interest"]
        if interest.status == GigInterest.Status.DECLINED:
            raise serializers.ValidationError("Declined interests cannot be converted into bookings.")
        existing_booking = interest.gig.bookings.filter(talent=interest.talent).exclude(
            status__in=[Booking.Status.CANCELLED, Booking.Status.REFUNDED]
        ).first()
        if existing_booking:
            raise serializers.ValidationError("This talent already has a booking for this gig.")

        quoted_amount = attrs.get("quoted_amount") or interest.proposed_amount
        deposit_amount = attrs.get("deposit_amount")
        balance_amount = attrs.get("balance_amount")

        if quoted_amount is not None and quoted_amount <= 0:
            raise serializers.ValidationError({"quoted_amount": "Quoted amount must be greater than zero."})
        if deposit_amount is not None and deposit_amount < 0:
            raise serializers.ValidationError({"deposit_amount": "Deposit amount cannot be negative."})
        if balance_amount is not None and balance_amount < 0:
            raise serializers.ValidationError({"balance_amount": "Balance amount cannot be negative."})
        if quoted_amount is not None and deposit_amount is not None and balance_amount is not None:
            if deposit_amount + balance_amount != quoted_amount:
                raise serializers.ValidationError("Deposit and balance amounts must add up to the quoted amount.")
        return attrs

    def create(self, validated_data):
        interest = self.context["interest"]
        request_user = self.context["request"].user
        gig = interest.gig
        return Booking.objects.create(
            client=request_user,
            talent=interest.talent,
            gig=gig,
            event_type=gig.event_type,
            title=gig.title,
            description=validated_data.get("notes") or gig.description,
            event_date=gig.event_date,
            start_time=gig.start_time,
            end_time=gig.end_time,
            venue_name=gig.venue_name,
            venue_address=gig.venue_address,
            city=gig.city,
            region=gig.region,
            budget_min=gig.budget_min,
            budget_max=gig.budget_max,
            quoted_amount=validated_data.get("quoted_amount") or interest.proposed_amount,
            deposit_amount=validated_data.get("deposit_amount"),
            balance_amount=validated_data.get("balance_amount"),
            currency_code=gig.currency_code,
            status=Booking.Status.PENDING,
        )
