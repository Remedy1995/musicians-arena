import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiConfig } from "../config/api";
import { ChatSocketPayload } from "../services/realtime/types";

type UseConversationSocketProps = {
  token: string;
  conversationId: string | null;
  enabled?: boolean;
  onEvent?: (event: ChatSocketPayload) => void;
};

export function useConversationSocket({ token, conversationId, enabled = true, onEvent }: UseConversationSocketProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef<typeof onEvent>(onEvent);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [connected, setConnected] = useState(false);

  const socketUrl = useMemo(() => {
    if (!conversationId) return null;
    return `${apiConfig.wsBaseUrl}/ws/chat/conversations/${conversationId}/?token=${token}`;
  }, [conversationId, token]);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !socketUrl) return;

    let isMounted = true;

    const connect = () => {
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        if (isMounted) {
          setConnected(true);
        }
      };

      socket.onmessage = (messageEvent) => {
        const payload = JSON.parse(messageEvent.data) as ChatSocketPayload;
        onEventRef.current?.(payload);
      };

      socket.onclose = () => {
        if (!isMounted) return;
        setConnected(false);
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 8000);
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        if (isMounted) {
          setConnected(false);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled, socketUrl]);

  const sendTextMessage = useCallback((body: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    socketRef.current.send(
      JSON.stringify({
        action: "message.send",
        message_type: "text",
        body,
      }),
    );
    return true;
  }, []);

  const markRead = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    socketRef.current.send(
      JSON.stringify({
        action: "message.read",
      }),
    );
    return true;
  }, []);

  return {
    connected,
    sendTextMessage,
    markRead,
  };
}
