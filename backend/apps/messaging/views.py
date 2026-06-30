from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.throttling import ScopedWriteThrottleMixin
from apps.messaging.models import Conversation, Message
from apps.messaging.serializers import (
    ConversationCreateSerializer,
    ConversationSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)
from apps.notifications.services import notify_new_message


@extend_schema_view(
    get=extend_schema(tags=["Messaging"], summary="List user conversations"),
    post=extend_schema(tags=["Messaging"], summary="Create a conversation"),
)
class ConversationListCreateView(ScopedWriteThrottleMixin, generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Conversation.objects.none()
    throttle_scope = "message_start"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Conversation.objects.none()
        return (
            Conversation.objects.filter(participants__user=self.request.user)
            .select_related("initiated_by", "booking")
            .prefetch_related("participants__user__profile", "messages")
            .distinct()
            .order_by("-last_message_at", "-created_at")
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ConversationCreateSerializer
        return ConversationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = serializer.save()
        return Response(ConversationSerializer(conversation, context={"request": request}).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Messaging"], summary="Retrieve a conversation")
class ConversationDetailView(generics.RetrieveAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Conversation.objects.filter(participants__user=self.request.user)
            .select_related("initiated_by", "booking")
            .prefetch_related("participants__user__profile", "messages")
            .distinct()
        )


@extend_schema_view(
    get=extend_schema(tags=["Messaging"], summary="List conversation messages"),
    post=extend_schema(tags=["Messaging"], summary="Send a conversation message"),
)
class ConversationMessageListCreateView(ScopedWriteThrottleMixin, generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Message.objects.none()
    throttle_scope = "message_write"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Message.objects.none()
        conversation = self._get_conversation()
        return Message.objects.filter(conversation=conversation).select_related("sender").order_by("created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MessageCreateSerializer
        return MessageSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["conversation"] = self._get_conversation()
        return context

    def perform_create(self, serializer):
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        notify_new_message(message=message)
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

    def _get_conversation(self):
        conversation = generics.get_object_or_404(
            Conversation.objects.filter(participants__user=self.request.user).distinct(),
            id=self.kwargs["conversation_id"],
        )
        return conversation


@extend_schema(tags=["Messaging"], summary="Mark unread messages as read")
class ConversationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Messaging"],
        summary="Mark unread conversation messages as read",
        request=None,
        responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
    )
    def post(self, request, conversation_id):
        conversation = generics.get_object_or_404(
            Conversation.objects.filter(participants__user=request.user).distinct(),
            id=conversation_id,
        )
        now = timezone.now()
        updated_count = (
            Message.objects.filter(conversation=conversation)
            .exclude(sender=request.user)
            .filter(read_at__isnull=True)
            .update(read_at=now)
        )
        return Response({"conversation_id": str(conversation.id), "updated_count": updated_count}, status=status.HTTP_200_OK)
