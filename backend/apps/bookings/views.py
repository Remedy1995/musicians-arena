from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.bookings.models import Booking
from apps.bookings.serializers import (
    BookingActionSerializer,
    BookingOfferSerializer,
    BookingSerializer,
    BookingStatusUpdateSerializer,
    CounterOfferSerializer,
    DisputeCreateSerializer,
    DisputeResolutionSerializer,
    DisputeSerializer,
)
from apps.common.throttling import ScopedWriteThrottleMixin
from apps.notifications.services import notify_booking_action, notify_booking_created


@extend_schema_view(
    get=extend_schema(tags=["Bookings"], summary="List bookings"),
    post=extend_schema(tags=["Bookings"], summary="Create booking"),
)
class BookingListCreateView(ScopedWriteThrottleMixin, generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    queryset = Booking.objects.none()
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "booking_create"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Booking.objects.none()
        user = self.request.user
        if user.role == User.Role.TALENT:
            return Booking.objects.filter(talent=user).select_related("client", "talent", "event_type")
        return Booking.objects.filter(client=user).select_related("client", "talent", "event_type")

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.CLIENT:
            raise PermissionDenied("Only clients can create bookings.")
        booking = serializer.save()
        notify_booking_created(booking=booking)


class BookingDetailView(ScopedWriteThrottleMixin, generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "booking_action_write"

    def get_queryset(self):
        user = self.request.user
        return Booking.objects.filter(Q(client=user) | Q(talent=user)).select_related("client", "talent", "event_type")

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return BookingStatusUpdateSerializer
        return BookingSerializer

    def perform_update(self, serializer):
        booking = self.get_object()
        user = self.request.user

        if user.id not in {booking.client_id, booking.talent_id}:
            raise PermissionDenied("You do not have access to this booking.")

        serializer.save()


class BookingActionView(ScopedWriteThrottleMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "booking_action_write"

    @extend_schema(
        tags=["Bookings"],
        summary="Perform a booking action",
        request=BookingActionSerializer,
        responses=BookingSerializer,
    )
    def post(self, request, pk):
        booking = self._get_booking(request.user, pk)
        serializer = BookingActionSerializer(data=request.data, context={"request": request, "booking": booking})
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data["action"]
        if action in {"accept", "reject"} and not self._can_accept_or_reject(booking, request.user):
            raise PermissionDenied("You cannot accept or reject this booking in its current state.")
        if action in {"cancel", "confirm"} and request.user.id != booking.client_id:
            raise PermissionDenied("Only the client can cancel or confirm this booking.")

        booking = serializer.save()
        if action == "accept":
            notify_booking_action(booking=booking, action="accept")
        elif action == "reject":
            notify_booking_action(booking=booking, action="reject")
        elif action == "cancel":
            notify_booking_action(booking=booking, action="cancel")
        elif action == "confirm":
            notify_booking_action(booking=booking, action="confirm")
        return Response(BookingSerializer(booking, context={"request": request}).data)

    def _get_booking(self, user, pk):
        booking = generics.get_object_or_404(
            Booking.objects.select_related("client", "talent", "event_type"),
            Q(pk=pk) & (Q(client=user) | Q(talent=user)),
        )
        return booking

    def _can_accept_or_reject(self, booking, user):
        if booking.status == Booking.Status.PENDING:
            return user.id == booking.talent_id

        latest_offer = booking.offers.order_by("-created_at").first()
        if not latest_offer or latest_offer.status != "pending":
            return False

        return booking.status in {Booking.Status.COUNTERED, Booking.Status.DISPUTED} and latest_offer.proposed_by_id != user.id


class BookingCounterOfferView(ScopedWriteThrottleMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "booking_action_write"

    @extend_schema(
        tags=["Bookings"],
        summary="Submit a booking counteroffer",
        request=CounterOfferSerializer,
        responses=BookingOfferSerializer,
    )
    def post(self, request, pk):
        booking = generics.get_object_or_404(
            Booking.objects.select_related("client", "talent", "event_type"),
            Q(pk=pk) & (Q(client=request.user) | Q(talent=request.user)),
        )
        serializer = CounterOfferSerializer(data=request.data, context={"request": request, "booking": booking})
        serializer.is_valid(raise_exception=True)
        counteroffer = serializer.save()
        notify_booking_action(booking=booking, action="counter")
        return Response(BookingOfferSerializer(counteroffer).data)


class BookingDisputeListCreateView(ScopedWriteThrottleMixin, generics.ListCreateAPIView):
    queryset = Booking.objects.none()
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "booking_action_write"

    def get_booking(self):
        return generics.get_object_or_404(
            Booking.objects.select_related("client", "talent", "event_type"),
            Q(pk=self.kwargs["booking_pk"]) & (Q(client=self.request.user) | Q(talent=self.request.user)),
        )

    def get_queryset(self):
        booking = self.get_booking()
        return booking.disputes.select_related("raised_by", "resolved_by").order_by("-created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return DisputeCreateSerializer
        return DisputeSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["booking"] = self.get_booking()
        return context


class BookingDisputeDetailView(ScopedWriteThrottleMixin, generics.RetrieveUpdateAPIView):
    queryset = Booking.objects.none()
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "booking_action_write"

    def get_queryset(self):
        filters = Q(pk=self.kwargs["booking_pk"])
        if self.request.user.role != User.Role.ADMIN:
            filters &= Q(client=self.request.user) | Q(talent=self.request.user)
        base = generics.get_object_or_404(Booking.objects.select_related("client", "talent"), filters)
        return base.disputes.select_related("raised_by", "resolved_by")

    def get_serializer_class(self):
        if self.request.method in {"PATCH", "PUT"}:
            return DisputeResolutionSerializer
        return DisputeSerializer

    def update(self, request, *args, **kwargs):
        if request.user.role != User.Role.ADMIN:
            raise PermissionDenied("Only admin accounts can resolve disputes.")
        return super().update(request, *args, **kwargs)
