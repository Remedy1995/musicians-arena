import { useCallback, useEffect, useState } from "react";

import { apiConfig } from "../config/api";
import { api } from "../services/api";
import {
  BookingItem,
  ConversationItem,
  EventType,
  GigListItem,
  MeResponse,
  NotificationItem,
  TalentCategory,
  TalentMediaItem,
  TalentProfileMe,
  TalentListItem,
} from "../services/api/types";
import { ChatSocketPayload, NotificationSocketPayload, toMessageItem } from "../services/realtime/types";

type MarketplaceDataState = {
  me: MeResponse | null;
  talents: TalentListItem[];
  gigs: GigListItem[];
  bookings: BookingItem[];
  conversations: ConversationItem[];
  notifications: NotificationItem[];
  unreadCount: number;
  categories: TalentCategory[];
  eventTypes: EventType[];
  talentProfile: TalentProfileMe | null;
  talentMedia: TalentMediaItem[];
};

const initialState: MarketplaceDataState = {
  me: null,
  talents: [],
  gigs: [],
  bookings: [],
  conversations: [],
  notifications: [],
  unreadCount: 0,
  categories: [],
  eventTypes: [],
  talentProfile: null,
  talentMedia: [],
};

export function useMarketplaceData(token: string) {
  const [data, setData] = useState<MarketplaceDataState>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, talents, gigs, bookings, conversations, notifications, unread, categories, eventTypes] = await Promise.all([
        api.me(token),
        api.talents(),
        api.gigs(token),
        api.bookings(token),
        api.conversations(token),
        api.notifications(token),
        api.unreadNotificationCount(token),
        api.talentCategories(),
        api.eventTypes(),
      ]);
      const [talentProfile, talentMedia] =
        me.role === "talent"
          ? await Promise.all([api.talentMe(token), api.talentMedia(token)])
          : [null, []];

      setData({
        me,
        talents,
        gigs,
        bookings,
        conversations,
        notifications,
        unreadCount: unread.unread_count,
        categories,
        eventTypes,
        talentProfile,
        talentMedia,
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to load marketplace data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const socket = new WebSocket(`${apiConfig.wsBaseUrl}/ws/notifications/?token=${token}`);

    socket.onmessage = (messageEvent) => {
      const payload = JSON.parse(messageEvent.data) as NotificationSocketPayload;
      if (payload.event === "notification.created" && payload.notification) {
        setData((current) => ({
          ...current,
          notifications: [payload.notification as NotificationItem, ...current.notifications].slice(0, 30),
          unreadCount: typeof payload.unread_count === "number" ? payload.unread_count : current.unreadCount + 1,
        }));
      }
    };

    return () => {
      socket.close();
    };
  }, [token]);

  const applyChatEvent = useCallback((event: ChatSocketPayload) => {
    if (event.event === "message.created") {
      setData((current) => ({
        ...current,
        conversations: current.conversations.map((conversation) =>
          conversation.id === event.message.conversation_id
            ? {
                ...conversation,
                last_message_at: event.message.created_at,
                last_message: toMessageItem(event.message),
              }
            : conversation,
        ),
      }));
      return;
    }

    if (event.event === "message.read") {
      setData((current) => ({
        ...current,
        conversations: current.conversations.map((conversation) =>
          conversation.id === event.conversation_id && conversation.last_message
            ? {
                ...conversation,
                last_message: {
                  ...conversation.last_message,
                  read_at: event.read_at,
                },
              }
            : conversation,
        ),
      }));
    }
  }, []);

  const markNotificationReadLocal = useCallback((notificationId: string) => {
    setData((current) => {
      const notifications = current.notifications.map((notification) =>
        notification.id === notificationId && !notification.read_at
          ? {
              ...notification,
              read_at: new Date().toISOString(),
            }
          : notification,
      );

      return {
        ...current,
        notifications,
        unreadCount: notifications.filter((notification) => !notification.read_at).length,
      };
    });
  }, []);

  return {
    ...data,
    loading,
    error,
    refresh,
    applyChatEvent,
    markNotificationReadLocal,
  };
}
