from django.urls import path

from apps.profiles.views import (
    EventTypeListView,
    MyProfileView,
    TalentCategoryListView,
    TalentMediaDetailView,
    TalentMediaListCreateView,
    TalentProfileDetailView,
    TalentProfileListView,
    TalentProfileUpdateView,
)


urlpatterns = [
    path("me/", MyProfileView.as_view(), name="my-profile"),
    path("talent/me/", TalentProfileUpdateView.as_view(), name="my-talent-profile"),
    path("categories/", TalentCategoryListView.as_view(), name="talent-categories"),
    path("event-types/", EventTypeListView.as_view(), name="event-types"),
    path("talents/", TalentProfileListView.as_view(), name="talent-list"),
    path("talents/<uuid:pk>/", TalentProfileDetailView.as_view(), name="talent-detail"),
    path("talent/me/media/", TalentMediaListCreateView.as_view(), name="talent-media-list-create"),
    path("talent/me/media/<uuid:pk>/", TalentMediaDetailView.as_view(), name="talent-media-detail"),
]
