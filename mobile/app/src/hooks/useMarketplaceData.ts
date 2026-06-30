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
      const me = await api.me(token);
      const [talentsResult, gigsResult, bookingsResult, conversationsResult, notificationsResult, unreadResult, categoriesResult, eventTypesResult] =
        await Promise.allSettled([
          api.talents(),
          api.gigs(token),
          api.bookings(token),
          api.conversations(token),
          api.notifications(token),
          api.unreadNotificationCount(token),
          api.talentCategories(),
          api.eventTypes(),
        ]);

      const [talentProfileResult, talentMediaResult] =
        me.role === "talent"
          ? await Promise.allSettled([api.talentMe(token), api.talentMedia(token)])
          : [null, null];

      setData((current) => ({
        me,
        talents: talentsResult?.status === "fulfilled" ? talentsResult.value : current.talents,
        gigs: gigsResult?.status === "fulfilled" ? gigsResult.value : current.gigs,
        bookings: bookingsResult?.status === "fulfilled" ? bookingsResult.value : current.bookings,
        conversations: conversationsResult?.status === "fulfilled" ? conversationsResult.value : current.conversations,
        notifications: notificationsResult?.status === "fulfilled" ? notificationsResult.value : current.notifications,
        unreadCount: unreadResult?.status === "fulfilled" ? unreadResult.value.unread_count : current.unreadCount,
        categories: categoriesResult?.status === "fulfilled" ? categoriesResult.value : current.categories,
        eventTypes: eventTypesResult?.status === "fulfilled" ? eventTypesResult.value : current.eventTypes,
        talentProfile:
          talentProfileResult && talentProfileResult.status === "fulfilled"
            ? talentProfileResult.value
            : me.role === "talent"
              ? current.talentProfile
              : null,
        talentMedia:
          talentMediaResult && talentMediaResult.status === "fulfilled"
            ? talentMediaResult.value
            : me.role === "talent"
              ? current.talentMedia
              : [],
      }));

      const criticalFailure =
        gigsResult.status === "rejected"
          ? gigsResult.reason
          : bookingsResult.status === "rejected"
            ? bookingsResult.reason
            : null;

      setError(criticalFailure instanceof Error ? criticalFailure.message : null);
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
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let isMounted = true;

    const connect = () => {
      socket = new WebSocket(`${apiConfig.wsBaseUrl}/ws/notifications/?token=${token}`);

      socket.onopen = () => {
        reconnectAttempts = 0;
      };

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

      socket.onclose = () => {
        if (!isMounted) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 8000);
        reconnectAttempts += 1;
        reconnectTimeout = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      socket?.close();
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
