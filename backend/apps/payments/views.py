from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import json

from apps.bookings.models import Booking
from apps.payments.models import Payment, Payout
from apps.payments.serializers import (
    BookingPaymentSummarySerializer,
    PaymentSerializer,
    PayoutSerializer,
    RecordPaymentSerializer,
    PaystackCheckoutSerializer,
    PaystackInitializeSerializer,
    PaystackVerifySerializer,
    serialize_booking_payment_summary,
)
from apps.payments.services import (
    PaystackError,
    initialize_paystack_payment,
    process_paystack_webhook,
    verify_paystack_payment,
    verify_paystack_signature,
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
        serializer = serialize_booking_payment_summary(booking, user=request.user)
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
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Payments"],
    summary="Initialize a Paystack checkout for a booking payment",
    request=PaystackInitializeSerializer,
    responses=PaystackCheckoutSerializer,
)
class PaystackInitializeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):
        booking = _get_booking_for_user(request.user, booking_id)
        if request.user.id != booking.client_id:
            raise PermissionDenied("Only the booking organizer can pay for this booking.")
        serializer = PaystackInitializeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment, checkout = initialize_paystack_payment(
                booking=booking,
                payer=request.user,
                payment_type=serializer.validated_data["payment_type"],
            )
        except PaystackError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        payload = {
            "payment_id": payment.id,
            "payment_type": payment.payment_type,
            "amount": payment.amount,
            "currency_code": payment.currency_code,
            "provider": payment.provider,
            "provider_reference": payment.provider_reference,
            "authorization_url": checkout.get("authorization_url", ""),
            "access_code": checkout.get("access_code", ""),
        }
        return Response(PaystackCheckoutSerializer(payload).data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Payments"],
    summary="Verify a Paystack checkout and place funds on hold",
    request=PaystackVerifySerializer,
    responses=PaymentSerializer,
)
class PaystackVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):
        booking = _get_booking_for_user(request.user, booking_id)
        serializer = PaystackVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = Payment.objects.filter(
            booking=booking,
            provider="paystack",
            provider_reference=serializer.validated_data["reference"],
        ).first()
        if not payment:
            return Response({"detail": "Paystack payment reference was not found for this booking."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.id != payment.payer_id:
            raise PermissionDenied("Only the payment organizer can verify this checkout.")
        try:
            payment = verify_paystack_payment(payment=payment)
        except PaystackError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PaymentSerializer(payment).data, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
@extend_schema(exclude=True)
class PaystackWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not verify_paystack_signature(raw_body=request.body, signature=request.headers.get("x-paystack-signature", "")):
            return Response({"detail": "Invalid webhook signature."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            payload = json.loads(request.body.decode("utf-8"))
            process_paystack_webhook(payload=payload)
        except (json.JSONDecodeError, PaystackError):
            # Acknowledge only validly signed payloads; Paystack will retry if processing fails.
            return Response({"detail": "Webhook could not be processed."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"status": True}, status=status.HTTP_200_OK)
