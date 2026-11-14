from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.accounts.models import User, UserCapability, VerificationRecord


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        "username",
        "email",
        "phone",
        "role",
        "status",
        "is_staff",
        "date_joined",
    )
    list_filter = ("role", "status", "is_staff", "is_active")
    search_fields = ("username", "email", "phone", "first_name", "last_name")
    ordering = ("-date_joined",)
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "Marketplace account",
            {
                "fields": (
                    "phone",
                    "role",
                    "status",
                    "phone_verified_at",
                    "email_verified_at",
                )
            },
        ),
    )


@admin.register(UserCapability)
class UserCapabilityAdmin(admin.ModelAdmin):
    list_display = ("user", "capability", "created_at", "updated_at")
    list_filter = ("capability",)
    search_fields = ("user__username", "user__email", "user__phone")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(VerificationRecord)
class VerificationRecordAdmin(admin.ModelAdmin):
    list_display = ("user", "verification_type", "status", "reviewed_by", "reviewed_at")
    list_filter = ("verification_type", "status")
    search_fields = ("user__username", "user__email", "reviewed_by__username", "document_url")
    autocomplete_fields = ("user", "reviewed_by")
    readonly_fields = ("created_at", "updated_at")
