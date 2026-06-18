from django.conf import settings
from django.contrib import admin
from django.conf.urls.static import static
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


api_v1_patterns = [
    path("", include("apps.common.urls")),
    path("auth/", include("apps.accounts.urls")),
    path("profiles/", include("apps.profiles.urls")),
    path("bookings/", include("apps.bookings.urls")),
    path("gigs/", include("apps.gigs.urls")),
    path("payments/", include("apps.payments.urls")),
    path("messaging/", include("apps.messaging.urls")),
    path("notifications/", include("apps.notifications.urls")),
]


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/", include((api_v1_patterns, "api-v1"))),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
