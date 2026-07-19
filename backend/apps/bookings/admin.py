from django.contrib import admin

from apps.bookings.models import Booking, BookingOffer, BookingStatusHistory, Dispute


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("title", "client", "talent", "status", "event_date", "quoted_amount", "cancellation_policy")
    list_filter = ("status", "cancellation_policy", "currency_code", "event_date")
    search_fields = ("title", "client__username", "talent__username", "city", "region")
    readonly_fields = ("payment_policy_json",)


@admin.register(BookingOffer)
class BookingOfferAdmin(admin.ModelAdmin):
    list_display = ("booking", "proposed_by", "amount", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("booking__title", "proposed_by__username")


@admin.register(BookingStatusHistory)
class BookingStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("booking", "from_status", "to_status", "changed_by", "created_at")
    list_filter = ("from_status", "to_status")
    search_fields = ("booking__title", "changed_by__username", "reason")


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = ("booking", "raised_by", "dispute_type", "status", "created_at")
    list_filter = ("dispute_type", "status")
    search_fields = ("booking__title", "raised_by__username", "description")
