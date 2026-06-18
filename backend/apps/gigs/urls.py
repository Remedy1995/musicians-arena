from django.urls import path

from apps.gigs.views import (
    GigInterestConvertToBookingView,
    GigDetailView,
    GigInterestCreateView,
    GigInterestStatusUpdateView,
    GigListCreateView,
    MyGigListView,
)


urlpatterns = [
    path("", GigListCreateView.as_view(), name="gig-list-create"),
    path("mine/", MyGigListView.as_view(), name="my-gigs"),
    path("<uuid:pk>/", GigDetailView.as_view(), name="gig-detail"),
    path("<uuid:gig_id>/interests/", GigInterestCreateView.as_view(), name="gig-interest-create"),
    path("interests/<uuid:pk>/", GigInterestStatusUpdateView.as_view(), name="gig-interest-status-update"),
    path("interests/<uuid:pk>/convert-to-booking/", GigInterestConvertToBookingView.as_view(), name="gig-interest-convert"),
]
