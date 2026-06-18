from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.accounts.models import User
from apps.bookings.serializers import BookingSerializer
from apps.gigs.filters import GigFilter
from apps.gigs.models import Gig, GigInterest
from apps.gigs.serializers import (
    GigCreateUpdateSerializer,
    GigDetailSerializer,
    GigInterestCreateSerializer,
    GigInterestConversionSerializer,
    GigInterestSerializer,
    GigInterestStatusSerializer,
    GigListSerializer,
)
from apps.messaging.models import Conversation
from apps.messaging.serializers import ConversationSerializer
from apps.messaging.services import create_system_message, get_or_create_conversation
from apps.notifications.services import (
    notify_gig_interest_converted_to_booking,
    notify_gig_interest_status_changed,
    notify_gig_interest_submitted,
)


@extend_schema_view(
    get=extend_schema(tags=["Gigs"], summary="List public gigs"),
    post=extend_schema(tags=["Gigs"], summary="Create a public gig"),
)
class GigListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    queryset = Gig.objects.none()
    search_fields = ["title", "description", "city", "region", "requirements"]
    ordering_fields = ["event_date", "created_at", "budget_max"]
    filterset_class = GigFilter

    def get_queryset(self):
        queryset = (
            Gig.objects.select_related("organizer", "organizer__profile", "event_type")
            .prefetch_related("required_categories__category")
            .annotate(interests_count=Count("interests", distinct=True))
            .order_by("-is_urgent", "event_date", "-created_at")
        )
        user = self.request.user
        if not user.is_authenticated:
            return queryset.filter(status=Gig.Status.OPEN, visibility=Gig.Visibility.PUBLIC)

        if user.role == User.Role.TALENT:
            queryset = queryset.filter(status=Gig.Status.OPEN).filter(
                Q(visibility=Gig.Visibility.PUBLIC) | Q(visibility=Gig.Visibility.VERIFIED_ONLY, organizer__isnull=False)
            )
            return queryset.distinct()

        return queryset.filter(status=Gig.Status.OPEN)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return GigCreateUpdateSerializer
            
        return GigListSerializer

    def create(self, request, *args, **kwargs):
        if request.user.role != User.Role.CLIENT:
            raise PermissionDenied("Only client accounts can create gigs.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        gig = serializer.save()
        return Response(GigDetailSerializer(gig, context={"request": request}).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Gigs"], summary="List gigs created by the organizer")
class MyGigListView(generics.ListAPIView):
    serializer_class = GigListSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Gig.objects.none()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Gig.objects.none()
        if self.request.user.role != User.Role.CLIENT:
            raise PermissionDenied("Only client accounts can view organizer gigs.")
        return (
            Gig.objects.filter(organizer=self.request.user)
            .select_related("organizer", "organizer__profile", "event_type")
            .prefetch_related("required_categories__category")
            .annotate(interests_count=Count("interests", distinct=True))
            .order_by("-created_at")
        )


@extend_schema_view(
    get=extend_schema(tags=["Gigs"], summary="Retrieve a gig"),
    patch=extend_schema(tags=["Gigs"], summary="Update an organizer gig"),
)
class GigDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    queryset = Gig.objects.none()

    def get_queryset(self):
        return (
            Gig.objects.select_related("organizer", "organizer__profile", "event_type")
            .prefetch_related("required_categories__category", "interests__talent", "interests__talent__profile")
            .annotate(interests_count=Count("interests", distinct=True))
        )

    def get_serializer_class(self):
        if self.request.method in {"PATCH", "PUT"}:
            return GigCreateUpdateSerializer
        return GigDetailSerializer

    def update(self, request, *args, **kwargs):
        gig = self.get_object()
        if request.user.id != gig.organizer_id:
            raise PermissionDenied("Only the organizer can update this gig.")
        serializer = self.get_serializer(gig, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        gig = serializer.save()
        return Response(GigDetailSerializer(gig, context={"request": request}).data)


@extend_schema(tags=["Gigs"], summary="Talent shows interest in a public gig")
class GigInterestCreateView(generics.CreateAPIView):
    serializer_class = GigInterestCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if request.user.role != User.Role.TALENT:
            raise PermissionDenied("Only talent accounts can show interest in gigs.")

        gig = generics.get_object_or_404(
            Gig.objects.prefetch_related("required_categories__category"),
            id=self.kwargs["gig_id"],
            status=Gig.Status.OPEN,
        )

        if GigInterest.objects.filter(gig=gig, talent=request.user).exists():
            raise ValidationError("You have already shown interest in this gig.")

        required_ids = set(gig.required_categories.values_list("category_id", flat=True))
        talent_skill_ids = set(request.user.talent_profile.skills.values_list("category_id", flat=True))
        if request.user.talent_profile.primary_category_id:
            talent_skill_ids.add(request.user.talent_profile.primary_category_id)
        if required_ids and not required_ids.intersection(talent_skill_ids):
            raise ValidationError("Your profile does not meet the required talent categories for this gig.")

        serializer = self.get_serializer(data=request.data, context={"request": request, "gig": gig})
        serializer.is_valid(raise_exception=True)
        interest = serializer.save()
        notify_gig_interest_submitted(organizer=gig.organizer, interest=interest)
        return Response(GigInterestSerializer(interest).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Gigs"], summary="Organizer updates interest status")
class GigInterestStatusUpdateView(generics.UpdateAPIView):
    serializer_class = GigInterestStatusSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = GigInterest.objects.select_related("gig", "talent", "talent__profile")

    def update(self, request, *args, **kwargs):
        interest = self.get_object()
        if request.user.id != interest.gig.organizer_id:
            raise PermissionDenied("Only the organizer can manage gig interests.")
        serializer = self.get_serializer(interest, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        notify_gig_interest_status_changed(interest=interest)

        conversation_payload = None
        if interest.status in {GigInterest.Status.SHORTLISTED, GigInterest.Status.INVITED}:
            conversation, created = get_or_create_conversation(
                initiated_by=request.user,
                participant=interest.talent,
                gig=interest.gig,
                conversation_type=Conversation.ConversationType.GIG,
            )
            if created:
                create_system_message(
                    conversation=conversation,
                    body=f"You have been {interest.status} for gig: {interest.gig.title}.",
                )
            conversation_payload = ConversationSerializer(conversation).data

        return Response(
            {
                "interest": GigInterestSerializer(interest).data,
                "conversation": conversation_payload,
            }
        )


@extend_schema(tags=["Gigs"], summary="Convert a gig interest into a booking")
class GigInterestConvertToBookingView(generics.CreateAPIView):
    serializer_class = GigInterestConversionSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = GigInterest.objects.select_related("gig", "talent", "talent__profile", "gig__event_type")

    def create(self, request, *args, **kwargs):
        interest = self.get_object()
        if request.user.id != interest.gig.organizer_id:
            raise PermissionDenied("Only the organizer can convert gig interests into bookings.")
        serializer = self.get_serializer(data=request.data, context={"request": request, "interest": interest})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        notify_gig_interest_converted_to_booking(interest=interest, booking=booking)
        conversation, created = get_or_create_conversation(
            initiated_by=request.user,
            participant=interest.talent,
            booking=booking,
            gig=interest.gig,
            conversation_type=Conversation.ConversationType.BOOKING,
        )
        if created:
            create_system_message(
                conversation=conversation,
                body=f"Gig interest for '{interest.gig.title}' has been converted into a booking request.",
            )
        return Response(
            {
                "booking": BookingSerializer(booking).data,
                "conversation": ConversationSerializer(conversation).data,
            },
            status=status.HTTP_201_CREATED,
        )
