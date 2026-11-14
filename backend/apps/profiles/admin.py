from django.contrib import admin

from apps.profiles.models import (
    ClientProfile,
    EventType,
    Favorite,
    TalentAvailability,
    TalentCategory,
    TalentEventType,
    TalentMedia,
    TalentProfile,
    TalentSkill,
    UserProfile,
)


@admin.register(TalentSkill)
class TalentSkillAdmin(admin.ModelAdmin):
    list_display = ("talent_profile", "category", "skill_level", "updated_at")
    list_filter = ("skill_level", "category")
    search_fields = (
        "talent_profile__user__username",
        "talent_profile__user__email",
        "talent_profile__stage_name",
        "category__name",
    )
    autocomplete_fields = ("talent_profile", "category")


@admin.register(TalentEventType)
class TalentEventTypeAdmin(admin.ModelAdmin):
    list_display = ("talent_profile", "event_type", "updated_at")
    list_filter = ("event_type",)
    search_fields = (
        "talent_profile__user__username",
        "talent_profile__user__email",
        "talent_profile__stage_name",
        "event_type__name",
    )
    autocomplete_fields = ("talent_profile", "event_type")


@admin.register(TalentMedia)
class TalentMediaAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "talent_profile",
        "media_type",
        "visibility",
        "processing_status",
        "sort_order",
        "updated_at",
    )
    list_filter = ("media_type", "visibility", "processing_status")
    search_fields = (
        "title",
        "description",
        "talent_profile__user__username",
        "talent_profile__user__email",
        "talent_profile__stage_name",
    )
    autocomplete_fields = ("talent_profile",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(TalentAvailability)
class TalentAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("talent_profile", "availability_type", "start_at", "end_at", "updated_at")
    list_filter = ("availability_type", "start_at", "end_at")
    search_fields = (
        "talent_profile__user__username",
        "talent_profile__user__email",
        "talent_profile__stage_name",
    )
    autocomplete_fields = ("talent_profile",)


class TalentSkillInline(admin.TabularInline):
    model = TalentSkill
    extra = 0
    autocomplete_fields = ("category",)
    show_change_link = True


class TalentEventTypeInline(admin.TabularInline):
    model = TalentEventType
    extra = 0
    autocomplete_fields = ("event_type",)
    show_change_link = True


class TalentMediaInline(admin.TabularInline):
    model = TalentMedia
    extra = 0
    fields = (
        "title",
        "media_type",
        "visibility",
        "processing_status",
        "sort_order",
        "storage_url",
        "file",
    )
    show_change_link = True


class TalentAvailabilityInline(admin.TabularInline):
    model = TalentAvailability
    extra = 0
    fields = ("availability_type", "start_at", "end_at", "recurrence_rule")
    show_change_link = True


@admin.register(TalentProfile)
class TalentProfileAdmin(admin.ModelAdmin):
    list_display = (
        "display_name",
        "username",
        "primary_category",
        "is_featured",
        "average_rating",
        "booking_count",
        "verified_at",
        "updated_at",
    )
    list_filter = ("is_featured", "primary_category", "verified_at", "created_at")
    search_fields = (
        "stage_name",
        "user__username",
        "user__email",
        "user__phone",
        "user__profile__display_name",
        "user__profile__city",
        "user__profile__region",
    )
    list_select_related = ("user", "user__profile", "primary_category")
    autocomplete_fields = ("user", "primary_category")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            "Talent identity",
            {"fields": ("user", "stage_name", "primary_category", "years_of_experience")},
        ),
        (
            "Rates and service area",
            {
                "fields": (
                    "hourly_rate_min",
                    "hourly_rate_max",
                    "fixed_price_min",
                    "fixed_price_max",
                    "travel_radius_km",
                    "response_time_minutes",
                )
            },
        ),
        (
            "Marketplace trust",
            {
                "fields": (
                    "average_rating",
                    "review_count",
                    "booking_count",
                    "reliability_score",
                    "verified_at",
                    "is_featured",
                )
            },
        ),
        ("Audit", {"fields": ("created_at", "updated_at")}),
    )
    inlines = (TalentSkillInline, TalentEventTypeInline, TalentMediaInline, TalentAvailabilityInline)

    @admin.display(description="Display name", ordering="user__profile__display_name")
    def display_name(self, obj):
        return obj.user.profile.display_name if hasattr(obj.user, "profile") else obj.stage_name or obj.user.username

    @admin.display(description="Username", ordering="user__username")
    def username(self, obj):
        return obj.user.username


@admin.register(TalentCategory)
class TalentCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "updated_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created_at", "updated_at")


@admin.register(EventType)
class EventTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "updated_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created_at", "updated_at")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "city", "region", "country", "updated_at")
    search_fields = ("display_name", "user__username", "user__email", "city", "region", "country")
    list_filter = ("country", "region")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = ("organization_name", "user", "client_type", "location", "updated_at")
    list_filter = ("client_type",)
    search_fields = ("organization_name", "location", "user__username", "user__email")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("client", "talent", "created_at")
    search_fields = ("client__username", "client__email", "talent__username", "talent__email")
    autocomplete_fields = ("client", "talent")
    readonly_fields = ("created_at", "updated_at")
