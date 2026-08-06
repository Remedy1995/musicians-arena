from django.urls import path

from apps.notifications.views import NotificationListView, NotificationMarkReadView, NotificationUnreadCountView, PushDeviceRegisterView


urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("devices/", PushDeviceRegisterView.as_view(), name="push-device-register"),
    path("<uuid:pk>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
]
