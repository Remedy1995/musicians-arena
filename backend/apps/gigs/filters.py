import django_filters

from apps.gigs.models import Gig


class GigFilter(django_filters.FilterSet):
    event_type = django_filters.UUIDFilter(field_name="event_type_id")
    required_category = django_filters.UUIDFilter(field_name="required_categories__category_id")
    city = django_filters.CharFilter(field_name="city", lookup_expr="iexact")
    region = django_filters.CharFilter(field_name="region", lookup_expr="iexact")
    status = django_filters.CharFilter(field_name="status")
    visibility = django_filters.CharFilter(field_name="visibility")
    is_urgent = django_filters.BooleanFilter(field_name="is_urgent")
    budget_min_gte = django_filters.NumberFilter(field_name="budget_min", lookup_expr="gte")
    budget_max_lte = django_filters.NumberFilter(field_name="budget_max", lookup_expr="lte")
    event_date_from = django_filters.DateFilter(field_name="event_date", lookup_expr="gte")
    event_date_to = django_filters.DateFilter(field_name="event_date", lookup_expr="lte")

    class Meta:
        model = Gig
        fields = [
            "event_type",
            "required_category",
            "city",
            "region",
            "status",
            "visibility",
            "is_urgent",
            "budget_min_gte",
            "budget_max_lte",
            "event_date_from",
            "event_date_to",
        ]
