from django.contrib import admin

from apps.payments.models import Payment, Payout


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("booking", "payer", "payment_type", "amount", "currency_code", "status", "paid_at")
    list_filter = ("payment_type", "status", "currency_code")
    search_fields = ("booking__title", "payer__username", "provider_reference")


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ("booking", "payee", "gross_amount", "net_amount", "status", "payout_method", "paid_at")
    list_filter = ("status", "payout_method")
    search_fields = ("booking__title", "payee__username", "provider_reference")
