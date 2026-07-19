from django.contrib import admin

from apps.payments.models import Payment, Payout, Refund


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("booking", "payer", "payment_type", "amount", "currency_code", "status", "fund_state", "paid_at")
    list_filter = ("payment_type", "status", "fund_state", "currency_code")
    search_fields = ("booking__title", "payer__username", "provider_reference")


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ("booking", "payee", "gross_amount", "net_amount", "status", "trigger_reason", "payout_method", "paid_at")
    list_filter = ("status", "trigger_reason", "payout_method")
    search_fields = ("booking__title", "payee__username", "provider_reference")


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ("booking", "recipient", "amount", "currency_code", "reason", "status", "processed_at")
    list_filter = ("reason", "status", "currency_code")
    search_fields = ("booking__title", "recipient__username", "provider_reference")
