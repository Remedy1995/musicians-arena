import django_filters

from apps.profiles.models import TalentProfile


class TalentProfileFilter(django_filters.FilterSet):
    primary_category = django_filters.UUIDFilter(field_name="primary_category_id")
    skill_category = django_filters.UUIDFilter(field_name="skills__category_id")
    event_type = django_filters.UUIDFilter(field_name="event_types__event_type_id")
    city = django_filters.CharFilter(field_name="user__profile__city", lookup_expr="iexact")
    region = django_filters.CharFilter(field_name="user__profile__region", lookup_expr="iexact")
    country = django_filters.CharFilter(field_name="user__profile__country", lookup_expr="iexact")
    is_featured = django_filters.BooleanFilter(field_name="is_featured")
    is_verified = django_filters.BooleanFilter(method="filter_is_verified")
    min_rating = django_filters.NumberFilter(field_name="average_rating", lookup_expr="gte")
    min_reliability = django_filters.NumberFilter(field_name="reliability_score", lookup_expr="gte")
    min_experience = django_filters.NumberFilter(field_name="years_of_experience", lookup_expr="gte")
    max_hourly_rate = django_filters.NumberFilter(field_name="hourly_rate_max", lookup_expr="lte")
    min_hourly_rate = django_filters.NumberFilter(field_name="hourly_rate_min", lookup_expr="gte")
    max_fixed_price = django_filters.NumberFilter(field_name="fixed_price_max", lookup_expr="lte")
    min_fixed_price = django_filters.NumberFilter(field_name="fixed_price_min", lookup_expr="gte")

    class Meta:
        model = TalentProfile
        fields = [
            "primary_category",
            "skill_category",
            "event_type",
            "city",
            "region",
            "country",
            "is_featured",
            "is_verified",
            "min_rating",
            "min_reliability",
            "min_experience",
            "max_hourly_rate",
            "min_hourly_rate",
            "max_fixed_price",
            "min_fixed_price",
        ]

    def filter_is_verified(self, queryset, name, value):
        if value:
            return queryset.filter(verified_at__isnull=False)
        return queryset.filter(verified_at__isnull=True)
