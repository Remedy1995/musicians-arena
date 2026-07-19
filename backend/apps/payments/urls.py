from django.urls import path

from apps.payments.views import (
    BookingPaymentCreateView,
    BookingPaymentSummaryView,
    PaystackInitializeView,
    PaystackVerifyView,
    PaystackWebhookView,
    PaymentListView,
    PayoutListView,
)


urlpatterns = [
    path("", PaymentListView.as_view(), name="payment-list"),
    path("payouts/", PayoutListView.as_view(), name="payout-list"),
    path("bookings/<uuid:booking_id>/summary/", BookingPaymentSummaryView.as_view(), name="booking-payment-summary"),
    path("bookings/<uuid:booking_id>/pay/", BookingPaymentCreateView.as_view(), name="booking-payment-create"),
    path("bookings/<uuid:booking_id>/paystack/initialize/", PaystackInitializeView.as_view(), name="paystack-initialize"),
    path("bookings/<uuid:booking_id>/paystack/verify/", PaystackVerifyView.as_view(), name="paystack-verify"),
    path("paystack/webhook/", PaystackWebhookView.as_view(), name="paystack-webhook"),
]
