from django.urls import path

from apps.messaging.views import (
    ConversationDetailView,
    ConversationListCreateView,
    ConversationMarkReadView,
    ConversationMessageListCreateView,
)


urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation-list-create"),
    path("conversations/<uuid:pk>/", ConversationDetailView.as_view(), name="conversation-detail"),
    path("conversations/<uuid:conversation_id>/messages/", ConversationMessageListCreateView.as_view(), name="conversation-messages"),
    path("conversations/<uuid:conversation_id>/read/", ConversationMarkReadView.as_view(), name="conversation-read"),
]
