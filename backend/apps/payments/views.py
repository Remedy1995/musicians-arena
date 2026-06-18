from decimal import Decimal

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking
from apps.payments.models import Payment, Payout
from apps.payments.serializers import (
    BookingPaymentSummarySerializer,
    PaymentSerializer,
    PayoutSerializer,
    RecordPaymentSerializer,
)


def _get_booking_for_user(user, booking_id):
    booking = generics.get_object_or_404(
        Booking.objects.select_related("client", "talent"),
        id=booking_id,
    )
    if user.id not in {booking.client_id, booking.talent_id}:
        raise PermissionDenied("You do not have access to this booking.")
    return booking


@extend_schema_view(
    get=extend_schema(tags=["Payments"], summary="List payments for the current user"),
)
class PaymentListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Payment.objects.none()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Payment.objects.none()
        return Payment.objects.filter(payer=self.request.user).select_related("booking").order_by("-created_at")


@extend_schema_view(
    get=extend_schema(tags=["Payments"], summary="List payouts for the current user"),
)
class PayoutListView(generics.ListAPIView):
    serializer_class = PayoutSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Payout.objects.none()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Payout.objects.none()
        return Payout.objects.filter(payee=self.request.user).select_related("booking").order_by("-created_at")


@extend_schema(tags=["Payments"], summary="Get booking payment summary", responses=BookingPaymentSummarySerializer)
class BookingPaymentSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):
        booking = _get_booking_for_user(request.user, booking_id)
        successful_payments = booking.payments.filter(status=Payment.Status.SUCCESSFUL).order_by("-created_at")
        payouts = booking.payouts.order_by("-created_at")
        deposit_paid = sum(
            payment.amount for payment in successful_payments.filter(payment_type__in=[Payment.PaymentType.DEPOSIT, Payment.PaymentType.FULL])
        )
        balance_paid = sum(
            payment.amount for payment in successful_payments.filter(payment_type__in=[Payment.PaymentType.BALANCE, Payment.PaymentType.FULL])
        )
        total_paid = sum(payment.amount for payment in successful_payments)
        quoted_amount = booking.quoted_amount or Decimal("0.00")
        outstanding_amount = max(quoted_amount - total_paid, Decimal("0.00"))
        commission_amount = sum((payout.commission_amount for payout in payouts), Decimal("0.00"))
        payout_due_amount = sum(
            (payout.net_amount for payout in payouts.filter(status__in=[Payout.Status.PENDING, Payout.Status.PROCESSING])),
            Decimal("0.00"),
        )

        payload = {
            "booking_id": booking.id,
            "booking_status": booking.status,
            "quoted_amount": booking.quoted_amount,
            "deposit_amount": booking.deposit_amount,
            "balance_amount": booking.balance_amount,
            "currency_code": booking.currency_code,
            "deposit_paid": deposit_paid or Decimal("0.00"),
            "balance_paid": balance_paid or Decimal("0.00"),
            "total_paid": total_paid or Decimal("0.00"),
            "outstanding_amount": outstanding_amount,
            "commission_amount": commission_amount,
            "payout_due_amount": payout_due_amount,
            "payments": successful_payments,
            "payouts": payouts,
        }
        serializer = BookingPaymentSummarySerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(tags=["Payments"], summary="Record a booking payment", request=RecordPaymentSerializer, responses=PaymentSerializer)
class BookingPaymentCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):
        booking = _get_booking_for_user(request.user, booking_id)
        if request.user.id != booking.client_id:
            raise PermissionDenied("Only the booking client can record payments.")
        serializer = RecordPaymentSerializer(data=request.data, context={"request": request, "booking": booking})
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        _sync_payout_for_booking(booking)
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


def _sync_payout_for_booking(booking: Booking):
    successful_payments = booking.payments.filter(status=Payment.Status.SUCCESSFUL)
    total_paid = sum((payment.amount for payment in successful_payments), Decimal("0.00"))
    quoted_amount = booking.quoted_amount or Decimal("0.00")

    if total_paid <= 0 or quoted_amount <= 0:
        return

    gross_amount = min(total_paid, quoted_amount)
    commission_amount = (gross_amount * Decimal("0.10")).quantize(Decimal("0.01"))
    net_amount = gross_amount - commission_amount
    payout_status = Payout.Status.PAID if booking.status == Booking.Status.COMPLETED else Payout.Status.PENDING

    Payout.objects.update_or_create(
        booking=booking,
        payee=booking.talent,
        defaults={
            "gross_amount": gross_amount,
            "commission_amount": commission_amount,
            "net_amount": net_amount,
            "status": payout_status,
            "payout_method": Payout.PayoutMethod.MOBILE_MONEY,
        },
    )
