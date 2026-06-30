from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.bookings.models import Booking, BookingOffer, Dispute


def booking_is_legacy_negotiation(booking: Booking) -> bool:
    return booking.status == Booking.Status.DISPUTED and booking.offers.exists()


class BookingSerializer(serializers.ModelSerializer):
    client_id = serializers.UUIDField(source="client.id", read_only=True)
    talent_id = serializers.PrimaryKeyRelatedField(
        source="talent",
        queryset=Booking._meta.get_field("talent").remote_field.model.objects.filter(role="talent"),
        write_only=True,
    )
    client = serializers.SerializerMethodField(read_only=True)
    talent = serializers.SerializerMethodField(read_only=True)
    latest_offer = serializers.SerializerMethodField(read_only=True)
    offer_history = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "client_id",
            "client",
            "talent_id",
            "talent",
            "event_type",
            "status",
            "title",
            "description",
            "event_date",
            "start_time",
            "end_time",
            "venue_name",
            "venue_address",
            "city",
            "region",
            "budget_min",
            "budget_max",
            "quoted_amount",
            "deposit_amount",
            "balance_amount",
            "currency_code",
            "latest_offer",
            "offer_history",
            "accepted_at",
            "confirmed_at",
            "completed_at",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "client_id",
            "status",
            "accepted_at",
            "confirmed_at",
            "completed_at",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_client(self, obj):
        return {
            "id": str(obj.client_id),
            "username": obj.client.username,
        }

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_talent(self, obj):
        return {
            "id": str(obj.talent_id),
            "username": obj.talent.username,
        }

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_latest_offer(self, obj):
        latest_offer = obj.offers.order_by("-created_at").first()
        if not latest_offer:
            return None
        return BookingOfferSerializer(latest_offer).data

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_offer_history(self, obj):
        offers = obj.offers.order_by("created_at")
        return BookingOfferSerializer(offers, many=True).data

    def create(self, validated_data):
        if validated_data["talent"].id == self.context["request"].user.id:
            raise serializers.ValidationError("A client cannot create a booking for themselves.")
        validated_data["client"] = self.context["request"].user
        return super().create(validated_data)

    def validate(self, attrs):
        event_date = attrs.get("event_date")
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")
        budget_min = attrs.get("budget_min")
        budget_max = attrs.get("budget_max")

        if end_time and start_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        if budget_min is not None and budget_max is not None and budget_min > budget_max:
            raise serializers.ValidationError("Minimum budget cannot be greater than maximum budget.")
        if event_date and event_date < timezone.localdate():
            raise serializers.ValidationError({"event_date": "Event date cannot be in the past."})
        return attrs


class BookingStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ["status", "quoted_amount", "deposit_amount", "balance_amount"]


class BookingOfferSerializer(serializers.ModelSerializer):
    proposed_by_id = serializers.UUIDField(source="proposed_by.id", read_only=True)

    class Meta:
        model = BookingOffer
        fields = ["id", "proposed_by_id", "amount", "notes", "status", "responded_at", "created_at"]
        read_only_fields = ["id", "proposed_by_id", "status", "responded_at", "created_at"]


class BookingActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["accept", "reject", "cancel", "confirm"])
    reason = serializers.CharField(required=False, allow_blank=True)
    quoted_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    deposit_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    balance_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    def validate(self, attrs):
        action = attrs["action"]
        booking = self.context["booking"]
        negotiation_statuses = {Booking.Status.PENDING, Booking.Status.COUNTERED}
        if booking_is_legacy_negotiation(booking):
            negotiation_statuses.add(Booking.Status.DISPUTED)

        if action == "accept":
            required = ["quoted_amount", "deposit_amount", "balance_amount"]
            missing = [field for field in required if attrs.get(field) is None]
            if missing:
                raise serializers.ValidationError(
                    {field: "This field is required when accepting a booking." for field in missing}
                )
            if booking.status not in negotiation_statuses:
                raise serializers.ValidationError("Only pending or countered bookings can be accepted.")
            quoted_amount = attrs["quoted_amount"]
            deposit_amount = attrs["deposit_amount"]
            balance_amount = attrs["balance_amount"]
            if deposit_amount < 0 or balance_amount < 0 or quoted_amount <= 0:
                raise serializers.ValidationError("Quoted, deposit, and balance amounts must be valid positive values.")
            if deposit_amount + balance_amount != quoted_amount:
                raise serializers.ValidationError("Deposit and balance amounts must add up to the quoted amount.")
        elif action == "reject":
            if booking.status not in negotiation_statuses:
                raise serializers.ValidationError("Only pending or countered bookings can be rejected.")
        elif action == "cancel":
            cancellable_statuses = {
                Booking.Status.PENDING,
                Booking.Status.COUNTERED,
                Booking.Status.AWAITING_DEPOSIT,
                Booking.Status.CONFIRMED,
            }
            if booking_is_legacy_negotiation(booking):
                cancellable_statuses.add(Booking.Status.DISPUTED)
            if booking.status not in cancellable_statuses:
                raise serializers.ValidationError("This booking cannot be cancelled in its current state.")
        elif action == "confirm":
            if booking.status != Booking.Status.AWAITING_DEPOSIT:
                raise serializers.ValidationError("Only bookings awaiting deposit can be confirmed.")
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        booking = self.context["booking"]
        user = self.context["request"].user
        action = self.validated_data["action"]
        reason = self.validated_data.get("reason", "")
        pending_offer = booking.offers.filter(status=BookingOffer.Status.PENDING).order_by("-created_at").first()

        if action == "accept":
            if pending_offer and pending_offer.proposed_by_id != user.id:
                pending_offer.status = BookingOffer.Status.ACCEPTED
                pending_offer.responded_at = timezone.now()
                pending_offer.save(update_fields=["status", "responded_at", "updated_at"])
            booking.quoted_amount = self.validated_data["quoted_amount"]
            booking.deposit_amount = self.validated_data["deposit_amount"]
            booking.balance_amount = self.validated_data["balance_amount"]
            booking.transition_status(
                to_status=Booking.Status.AWAITING_DEPOSIT,
                changed_by=user,
                reason=reason or "Booking accepted by talent.",
            )
        elif action == "reject":
            if pending_offer and pending_offer.proposed_by_id != user.id:
                pending_offer.status = BookingOffer.Status.REJECTED
                pending_offer.responded_at = timezone.now()
                pending_offer.save(update_fields=["status", "responded_at", "updated_at"])
            booking.transition_status(
                to_status=Booking.Status.CANCELLED,
                changed_by=user,
                reason=reason or "Booking rejected.",
            )
        elif action == "cancel":
            booking.transition_status(
                to_status=Booking.Status.CANCELLED,
                changed_by=user,
                reason=reason or "Booking cancelled.",
            )
        elif action == "confirm":
            booking.transition_status(
                to_status=Booking.Status.CONFIRMED,
                changed_by=user,
                reason=reason or "Booking confirmed.",
            )
        return booking


class CounterOfferSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        booking = self.context["booking"]
        user = self.context["request"].user

        if booking.status not in {Booking.Status.PENDING, Booking.Status.COUNTERED, Booking.Status.AWAITING_DEPOSIT} and not booking_is_legacy_negotiation(booking):
            raise serializers.ValidationError("Counteroffers are not allowed for this booking in its current state.")

        latest_offer = booking.offers.order_by("-created_at").first()
        if latest_offer and latest_offer.status == BookingOffer.Status.PENDING and latest_offer.proposed_by_id == user.id:
            raise serializers.ValidationError("Your latest counteroffer is still waiting for a response.")
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        booking = self.context["booking"]
        user = self.context["request"].user
        latest_offer = booking.offers.order_by("-created_at").first()

        if latest_offer and latest_offer.status == BookingOffer.Status.PENDING and latest_offer.proposed_by_id != user.id:
            latest_offer.status = BookingOffer.Status.REJECTED
            latest_offer.responded_at = timezone.now()
            latest_offer.save(update_fields=["status", "responded_at", "updated_at"])

        booking_offer = BookingOffer.objects.create(
            booking=booking,
            proposed_by=user,
            amount=self.validated_data["amount"],
            notes=self.validated_data.get("notes", ""),
        )
        booking.transition_status(
            to_status=Booking.Status.COUNTERED,
            changed_by=user,
            reason="Counteroffer submitted.",
        )
        return booking_offer


class DisputeSerializer(serializers.ModelSerializer):
    raised_by_id = serializers.UUIDField(source="raised_by.id", read_only=True)
    resolved_by_id = serializers.UUIDField(source="resolved_by.id", read_only=True)

    class Meta:
        model = Dispute
        fields = [
            "id",
            "booking",
            "raised_by_id",
            "dispute_type",
            "status",
            "description",
            "resolution_notes",
            "resolved_by_id",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "booking",
            "raised_by_id",
            "status",
            "resolved_by_id",
            "resolved_at",
            "created_at",
            "updated_at",
        ]


class DisputeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispute
        fields = ["dispute_type", "description"]

    def validate(self, attrs):
        booking = self.context["booking"]
        active_dispute_exists = booking.disputes.filter(
            status__in=[Dispute.Status.OPEN, Dispute.Status.UNDER_REVIEW]
        ).exists()
        if active_dispute_exists:
            raise serializers.ValidationError("This booking already has an active dispute.")
        if booking.status == Booking.Status.CANCELLED:
            raise serializers.ValidationError("Cancelled bookings cannot have new disputes opened.")
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        booking = self.context["booking"]
        user = self.context["request"].user
        dispute = Dispute.objects.create(
            booking=booking,
            raised_by=user,
            status=Dispute.Status.OPEN,
            **validated_data,
        )
        if booking.status in {
            Booking.Status.CONFIRMED,
            Booking.Status.IN_PROGRESS,
            Booking.Status.COMPLETED,
        }:
            booking.transition_status(
                to_status=Booking.Status.DISPUTED,
                changed_by=user,
                reason=f"Dispute opened: {dispute.dispute_type}.",
            )
        return dispute


class DisputeResolutionSerializer(serializers.ModelSerializer):
    booking_status = serializers.ChoiceField(
        choices=[
            Booking.Status.CONFIRMED,
            Booking.Status.COMPLETED,
            Booking.Status.CANCELLED,
            Booking.Status.REFUNDED,
        ],
        required=False,
    )

    class Meta:
        model = Dispute
        fields = ["status", "resolution_notes", "booking_status"]

    def validate(self, attrs):
        status_value = attrs.get("status")
        if status_value not in {Dispute.Status.UNDER_REVIEW, Dispute.Status.RESOLVED, Dispute.Status.REJECTED}:
            raise serializers.ValidationError("Invalid dispute transition.")
        if status_value in {Dispute.Status.RESOLVED, Dispute.Status.REJECTED} and not attrs.get("resolution_notes"):
            raise serializers.ValidationError({"resolution_notes": "Resolution notes are required."})
        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        booking_status = validated_data.pop("booking_status", None)
        user = self.context["request"].user

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if instance.status in {Dispute.Status.RESOLVED, Dispute.Status.REJECTED}:
            instance.resolved_by = user
            instance.resolved_at = timezone.now()
        instance.save()

        if booking_status and instance.booking.status != booking_status:
            instance.booking.transition_status(
                to_status=booking_status,
                changed_by=user,
                reason=f"Dispute updated to {instance.status}.",
            )
        return instance
