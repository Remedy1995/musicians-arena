from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.bookings.models import Booking
from apps.payments.models import Payment, Payout, Refund
from apps.payments.services import (
    build_payment_summary_payload,
    create_successful_held_payment,
    payment_totals,
    refresh_booking_after_payment,
)


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "booking",
            "payer",
            "payment_type",
            "amount",
            "currency_code",
            "provider",
            "provider_reference",
            "status",
            "fund_state",
            "provider_fee_amount",
            "metadata_json",
            "paid_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class PayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = [
            "id",
            "booking",
            "payee",
            "gross_amount",
            "commission_amount",
            "net_amount",
            "status",
            "payout_method",
            "trigger_reason",
            "idempotency_key",
            "provider_reference",
            "metadata_json",
            "paid_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = [
            "id",
            "booking",
            "recipient",
            "amount",
            "currency_code",
            "reason",
            "status",
            "provider_reference",
            "metadata_json",
            "processed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class PaystackInitializeSerializer(serializers.Serializer):
    payment_type = serializers.ChoiceField(
        choices=[
            Payment.PaymentType.DEPOSIT,
            Payment.PaymentType.BALANCE,
            Payment.PaymentType.FULL,
        ]
    )


class PaystackVerifySerializer(serializers.Serializer):
    reference = serializers.CharField(max_length=255)


class PaystackCheckoutSerializer(serializers.Serializer):
    payment_id = serializers.UUIDField()
    payment_type = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency_code = serializers.CharField()
    provider = serializers.CharField()
    provider_reference = serializers.CharField()
    authorization_url = serializers.URLField()
    access_code = serializers.CharField()


class BookingPaymentSummarySerializer(serializers.Serializer):
    booking_id = serializers.UUIDField()
    booking_status = serializers.CharField()
    quoted_amount = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    deposit_amount = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    balance_amount = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    currency_code = serializers.CharField()
    deposit_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    held_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    outstanding_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    refund_due_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    talent_compensation_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    commission_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    platform_commission_rate = serializers.CharField()
    projected_commission_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    projected_payout_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payout_due_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payout_released_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    funds_state = serializers.CharField()
    next_step = serializers.CharField()
    balance_due_at = serializers.DateTimeField(allow_null=True)
    completion_confirmation_due_at = serializers.DateTimeField(allow_null=True)
    can_pay_deposit = serializers.BooleanField()
    can_pay_balance = serializers.BooleanField()
    can_confirm_completion = serializers.BooleanField()
    can_report_no_show = serializers.BooleanField()
    payments = PaymentSerializer(many=True)
    payouts = PayoutSerializer(many=True)
    refunds = RefundSerializer(many=True)


class RecordPaymentSerializer(serializers.Serializer):
    payment_type = serializers.ChoiceField(choices=Payment.PaymentType.choices)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    provider = serializers.CharField(required=False, allow_blank=True)
    provider_reference = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        booking: Booking = self.context["booking"]
        payment_type = attrs["payment_type"]
        quoted_amount = booking.quoted_amount or Decimal("0.00")
        deposit_amount = booking.deposit_amount or Decimal("0.00")
        balance_amount = booking.balance_amount or Decimal("0.00")

        totals = payment_totals(booking)
        deposit_paid = totals["deposit_paid"]
        balance_paid = totals["balance_paid"]

        suggested_amount = quoted_amount
        if payment_type == Payment.PaymentType.DEPOSIT:
            if booking.status != Booking.Status.AWAITING_DEPOSIT:
                raise serializers.ValidationError("Deposit payments are only allowed when a booking is awaiting deposit.")
            suggested_amount = deposit_amount
        elif payment_type == Payment.PaymentType.BALANCE:
            if booking.status not in {Booking.Status.CONFIRMED, Booking.Status.IN_PROGRESS, Booking.Status.COMPLETED}:
                raise serializers.ValidationError("Balance payments are only allowed after the booking has been confirmed.")
            suggested_amount = balance_amount
        elif payment_type == Payment.PaymentType.FULL:
            if booking.status not in {Booking.Status.AWAITING_DEPOSIT, Booking.Status.CONFIRMED}:
                raise serializers.ValidationError("Full payments are only allowed before the booking is completed.")
            suggested_amount = quoted_amount
        elif payment_type == Payment.PaymentType.REFUND:
            raise serializers.ValidationError("Refunds are not supported from this endpoint.")

        amount = attrs.get("amount") or suggested_amount
        if amount is None or amount <= 0:
            raise serializers.ValidationError({"amount": "A valid amount is required for this payment type."})

        if payment_type == Payment.PaymentType.DEPOSIT and deposit_amount and deposit_paid + amount > deposit_amount:
            raise serializers.ValidationError({"amount": "Deposit payment exceeds the outstanding deposit amount."})
        if payment_type == Payment.PaymentType.BALANCE and balance_amount and balance_paid + amount > balance_amount:
            raise serializers.ValidationError({"amount": "Balance payment exceeds the outstanding balance amount."})
        if payment_type == Payment.PaymentType.FULL and quoted_amount and amount > quoted_amount:
            raise serializers.ValidationError({"amount": "Full payment exceeds the quoted amount."})

        attrs["amount"] = amount
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        booking: Booking = self.context["booking"]
        payer = self.context["request"].user

        payment = create_successful_held_payment(
            booking=booking,
            payer=payer,
            payment_type=self.validated_data["payment_type"],
            amount=self.validated_data["amount"],
            provider=self.validated_data.get("provider", "manual"),
            provider_reference=self.validated_data.get("provider_reference", ""),
        )

        refresh_booking_after_payment(booking=booking, changed_by=payer)
        return payment


def serialize_booking_payment_summary(booking: Booking, *, user):
    return BookingPaymentSummarySerializer(build_payment_summary_payload(booking, user=user))
