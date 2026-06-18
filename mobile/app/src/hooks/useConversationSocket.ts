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

    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
    };

    socket.onmessage = (messageEvent) => {
      const payload = JSON.parse(messageEvent.data) as ChatSocketPayload;
      onEventRef.current?.(payload);
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onerror = () => {
      setConnected(false);
    };

    return () => {
      socket.close();
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
