from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.bookings.models import Booking
from apps.payments.models import Payment, Payout


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
            "provider_reference",
            "paid_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


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
    outstanding_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    commission_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payout_due_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payments = PaymentSerializer(many=True)
    payouts = PayoutSerializer(many=True)


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

        successful_payments = booking.payments.filter(status=Payment.Status.SUCCESSFUL)
        deposit_paid = sum(
            payment.amount for payment in successful_payments.filter(payment_type__in=[Payment.PaymentType.DEPOSIT, Payment.PaymentType.FULL])
        )
        balance_paid = sum(
            payment.amount for payment in successful_payments.filter(payment_type__in=[Payment.PaymentType.BALANCE, Payment.PaymentType.FULL])
        )

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

        payment = Payment.objects.create(
            booking=booking,
            payer=payer,
            payment_type=self.validated_data["payment_type"],
            amount=self.validated_data["amount"],
            currency_code=booking.currency_code,
            provider=self.validated_data.get("provider", ""),
            provider_reference=self.validated_data.get("provider_reference", ""),
            status=Payment.Status.SUCCESSFUL,
            paid_at=timezone.now(),
        )

        if payment.payment_type in {Payment.PaymentType.DEPOSIT, Payment.PaymentType.FULL} and booking.status == Booking.Status.AWAITING_DEPOSIT:
            booking.transition_status(
                to_status=Booking.Status.CONFIRMED,
                changed_by=payer,
                reason="Booking confirmed after successful payment.",
            )

        return payment
