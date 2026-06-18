import { MessageItem, NotificationItem } from "../api/types";

export type NotificationSocketPayload = {
  event: string;
  notification?: NotificationItem;
  unread_count?: number;
};

export type ChatMessageCreatedPayload = {
  type: "chat.message";
  event: "message.created";
  message: {
    id: string;
    conversation_id: string;
    sender_id: string;
    message_type: string;
    body: string;
    media_url: string | null;
    delivered_at: string | null;
    read_at: string | null;
    created_at: string;
  };
};

export type ChatMessageReadPayload = {
  type: "chat.message";
  event: "message.read";
  conversation_id: string;
  user_id: string;
  read_at: string;
};

export type ChatSocketPayload = ChatMessageCreatedPayload | ChatMessageReadPayload;

export function toMessageItem(payload: ChatMessageCreatedPayload["message"]): MessageItem {
  return {
    id: payload.id,
    conversation: payload.conversation_id,
    sender_id: payload.sender_id,
    sender_username: "",
    message_type: payload.message_type,
    body: payload.body,
    media_url: payload.media_url,
    delivered_at: payload.delivered_at,
    read_at: payload.read_at,
    created_at: payload.created_at,
  };
}
