from django.urls import path

from apps.bookings.views import (
    BookingActionView,
    BookingCounterOfferView,
    BookingDetailView,
    BookingDisputeDetailView,
    BookingDisputeListCreateView,
    BookingListCreateView,
)


urlpatterns = [
    path("", BookingListCreateView.as_view(), name="booking-list-create"),
    path("<uuid:pk>/", BookingDetailView.as_view(), name="booking-detail"),
    path("<uuid:pk>/action/", BookingActionView.as_view(), name="booking-action"),
    path("<uuid:pk>/counteroffer/", BookingCounterOfferView.as_view(), name="booking-counteroffer"),
    path("<uuid:booking_pk>/disputes/", BookingDisputeListCreateView.as_view(), name="booking-dispute-list-create"),
    path("<uuid:booking_pk>/disputes/<uuid:pk>/", BookingDisputeDetailView.as_view(), name="booking-dispute-detail"),
]
