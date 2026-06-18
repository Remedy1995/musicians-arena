from django.urls import re_path

from apps.messaging.consumers import ChatConsumer
from apps.notifications.routing import websocket_urlpatterns as notification_websocket_urlpatterns


websocket_urlpatterns = [
    re_path(r"ws/chat/conversations/(?P<conversation_id>[0-9a-f-]+)/$", ChatConsumer.as_asgi()),
] + notification_websocket_urlpatterns
