import { memo, useEffect, useMemo, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { UserRole } from "../AppShell";
import { useConversationSocket } from "../hooks/useConversationSocket";
import { useMarketplaceData } from "../hooks/useMarketplaceData";
import { ConversationItem, MessageItem, UserSummary } from "../services/api/types";
import { api } from "../services/api";
import { ApiError } from "../services/api/client";
import { toMessageItem } from "../services/realtime/types";
import { ConversationCard } from "../components/ConversationCard";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { theme } from "../theme/theme";

type MessagesScreenProps = {
  role: UserRole;
  currentUser: UserSummary;
  token: string;
  onExit: () => void;
  onSignOut: () => void;
  focusedConversationId: string | null;
  setFocusedConversationId: (conversationId: string | null) => void;
  focusedBookingId: string | null;
  setFocusedBookingId: (bookingId: string | null) => void;
  marketplace: ReturnType<typeof useMarketplaceData>;
};

export function MessagesScreen({
  role,
  currentUser,
  marketplace,
  token,
  focusedConversationId,
  setFocusedConversationId,
}: MessagesScreenProps) {
  const [detailDraft, setDetailDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null);
  const firstConversation = useMemo(() => marketplace.conversations[0] ?? null, [marketplace.conversations]);
  const activeConversationId = selectedConversationId ?? firstConversation?.id ?? null;
  const selectedConversation = useMemo(
    () => marketplace.conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [marketplace.conversations, selectedConversationId],
  );
  const selectedConversationName = useMemo(
    () => getConversationName(selectedConversation, currentUser.id),
    [currentUser.id, selectedConversation],
  );
  const chatSocket = useConversationSocket({
    token,
    conversationId: activeConversationId,
    enabled: Boolean(activeConversationId),
    onEvent: (event) => {
      marketplace.applyChatEvent(event);
      if (event.event === "message.created" && selectedConversationId && event.message.conversation_id === selectedConversationId) {
        setSelectedMessages((current) => {
          if (current.some((message) => message.id === event.message.id)) {
            return current;
          }

          return [...current, toMessageItem(event.message)];
        });
      }
      if (event.event === "message.read" && selectedConversationId && event.conversation_id === selectedConversationId) {
        setSelectedMessages((current) =>
          current.map((message) =>
            message.sender_id !== event.user_id && !message.read_at
              ? {
                  ...message,
                  read_at: event.read_at,
                }
              : message,
          ),
        );
      }
    },
  });
  const { connected, markRead, sendTextMessage } = chatSocket;

  useEffect(() => {
    if (!focusedConversationId) return;
    const exists = marketplace.conversations.some((conversation) => conversation.id === focusedConversationId);
    if (exists) {
      setSelectedConversationId(focusedConversationId);
      setDetailOpen(true);
      setFocusedConversationId(null);
    }
  }, [focusedConversationId, marketplace.conversations, setFocusedConversationId]);

  useEffect(() => {
    if (!detailOpen || !selectedConversationId) return;

    void (async () => {
      const shouldShowLoader = loadedConversationId !== selectedConversationId || selectedMessages.length === 0;
      if (shouldShowLoader) {
        setLoadingMessages(true);
      }
      try {
        const messages = (await api.conversationMessages(token, selectedConversationId)) as MessageItem[];
        setSelectedMessages(messages);
        setLoadedConversationId(selectedConversationId);
        const marked = markRead();
        if (!marked) {
          await api.markConversationRead(token, selectedConversationId);
        }
      } catch (caught) {
        setSendError(caught instanceof Error ? caught.message : "Unable to load conversation.");
      } finally {
        if (shouldShowLoader) {
          setLoadingMessages(false);
        }
      }
    })();
  }, [detailOpen, loadedConversationId, markRead, selectedConversationId, selectedMessages.length, token]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.body}>
          {role === "client"
            ? "Move from discovery into real coordination without leaving the platform."
            : "Respond quickly to shortlists, invites, and booking follow-ups."}
        </Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent conversations" action={connected ? "Live" : "Standard sync"} />
        <View style={styles.list}>
          {marketplace.conversations.map((item) => {
            const other = item.participants.find((participant) => participant.user_id !== currentUser.id) ?? item.participants[0];
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelectedConversationId(item.id);
                  setDetailOpen(true);
                }}
              >
                <ConversationCard
                  name={other?.display_name || other?.username || "Conversation"}
                  message={item.last_message?.body || "No messages yet"}
                  time={item.last_message_at ? item.last_message_at.slice(11, 16) : "Now"}
                  unread={item.last_message?.read_at ? 0 : item.last_message ? 1 : 0}
                  badge={item.conversation_type}
                />
              </Pressable>
            );
          })}
          {marketplace.error ? <Text style={styles.error}>{marketplace.error}</Text> : null}
          {!marketplace.loading && marketplace.conversations.length === 0 ? <Text style={styles.empty}>No conversations yet.</Text> : null}
        </View>
      </View>

      <Modal animationType="slide" visible={detailOpen} onRequestClose={() => setDetailOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalScreen}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <View style={styles.modalAvatar}>
                <Text style={styles.modalAvatarText}>{getInitials(selectedConversationName)}</Text>
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{selectedConversationName}</Text>
                <View style={styles.modalSubtitleRow}>
                  <View style={styles.modalPresenceDot} />
                  <Text style={styles.modalSubtitle}>
                    {selectedConversation?.conversation_type === "booking" ? "Booking conversation" : "Direct conversation"}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable onPress={() => setDetailOpen(false)} style={styles.modalCloseButton}>
              <MaterialCommunityIcons name="close" size={18} color={theme.semanticColors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.chatShell}>
            <ConversationThread currentUserId={currentUser.id} loadingMessages={loadingMessages} selectedMessages={selectedMessages} />
            <ConversationComposer
              detailDraft={detailDraft}
              onChangeDraft={setDetailDraft}
              sending={sending}
              sendError={sendError}
              onSend={() => {
                void handleSendToConversation(selectedConversation);
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );

  async function handleSendToConversation(conversation: ConversationItem | null) {
    if (!conversation) return;
    if (!detailDraft.trim()) {
      setSendError("Enter a message first.");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const sentViaSocket = sendTextMessage(detailDraft.trim());
      if (!sentViaSocket) {
        await api.sendMessage(token, conversation.id, {
          message_type: "text",
          body: detailDraft.trim(),
        });
        const messages = (await api.conversationMessages(token, conversation.id)) as MessageItem[];
        setSelectedMessages(messages);
        await marketplace.refresh();
      }
      setDetailDraft("");
    } catch (caught) {
      setSendError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }
}

function getConversationName(conversation: ConversationItem | null, currentUserId: string) {
  if (!conversation) return "Conversation";
  const other = conversation.participants.find((participant) => participant.user_id !== currentUserId) ?? conversation.participants[0];
  return other?.display_name || other?.username || "Conversation";
}

const ConversationThread = memo(function ConversationThread({
  currentUserId,
  loadingMessages,
  selectedMessages,
}: {
  currentUserId: string;
  loadingMessages: boolean;
  selectedMessages: MessageItem[];
}) {
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (loadingMessages) return;

    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 40);

    return () => clearTimeout(timer);
  }, [loadingMessages, selectedMessages.length]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.threadScroll}
      contentContainerStyle={styles.messageList}
      onContentSizeChange={() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }}
    >
      {loadingMessages ? <Text style={styles.empty}>Loading messages...</Text> : null}
      {selectedMessages.map((message) => {
        const mine = message.sender_id === currentUserId;
        return (
          <View key={message.id} style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : undefined]}>{message.body || "Media message"}</Text>
              <Text style={[styles.bubbleMeta, mine ? styles.bubbleMetaMine : undefined]}>
                {message.created_at.slice(11, 16)}
                {message.read_at ? " • Read" : ""}
              </Text>
            </View>
          </View>
        );
      })}
      {!loadingMessages && selectedMessages.length === 0 ? <Text style={styles.empty}>No messages in this conversation yet.</Text> : null}
    </ScrollView>
  );
});

const ConversationComposer = memo(function ConversationComposer({
  detailDraft,
  onChangeDraft,
  sending,
  sendError,
  onSend,
}: {
  detailDraft: string;
  onChangeDraft: (value: string) => void;
  sending: boolean;
  sendError: string | null;
  onSend: () => void;
}) {
  const hasDraft = detailDraft.trim().length > 0;

  return (
    <View style={styles.detailComposer}>
      {sendError ? <Text style={styles.error}>{sendError}</Text> : null}
      <View style={styles.composerCard}>
        <View style={styles.composerField}>
          <TextInput
            value={detailDraft}
            onChangeText={onChangeDraft}
            multiline
            placeholder="Type a message"
            placeholderTextColor={theme.semanticColors.textMuted}
            style={styles.composerInput}
            textAlignVertical="center"
          />
        </View>
        {hasDraft ? (
          <Pressable onPress={onSend} disabled={sending} style={[styles.sendButton, sending ? styles.sendButtonDisabled : undefined]}>
            <MaterialCommunityIcons name={sending ? "loading" : "send"} size={18} color={theme.semanticColors.textOnDark} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing[3],
    paddingTop: theme.spacing[3],
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["3xl"],
    lineHeight: theme.typography.lineHeight["3xl"],
    color: theme.semanticColors.textPrimary,
  },
  body: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.semanticColors.textSecondary,
  },
  section: {
    gap: theme.spacing[4],
  },
  list: {
    gap: theme.spacing[4],
  },
  error: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.danger,
  },
  empty: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textMuted,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: theme.semanticColors.background,
    paddingHorizontal: theme.spacing[1],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[1],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: theme.spacing[5],
    paddingBottom: theme.spacing[4],
    paddingHorizontal: theme.spacing[3],
    gap: theme.spacing[4],
  },
  modalHeaderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  modalAvatar: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.ink[900],
  },
  modalAvatarText: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textOnDark,
  },
  modalHeaderText: {
    flex: 1,
    gap: theme.spacing[1],
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
    color: theme.semanticColors.textPrimary,
  },
  modalSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  modalPresenceDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: "#2FB579",
  },
  modalSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  chatShell: {
    flex: 1,
    borderRadius: theme.radius.xl,
    overflow: "hidden",
    backgroundColor: theme.colors.stone[50],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    shadowColor: "#20160D",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  threadScroll: {
    flex: 1,
  },
  messageList: {
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[4],
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleRowMine: {
    justifyContent: "flex-end",
  },
  bubbleRowOther: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    gap: 2,
    shadowColor: "#0B1220",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  bubbleMine: {
    backgroundColor: theme.semanticColors.primary,
    borderTopRightRadius: theme.radius.sm,
  },
  bubbleOther: {
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    borderTopLeftRadius: theme.radius.sm,
  },
  bubbleText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textPrimary,
  },
  bubbleTextMine: {
    color: theme.semanticColors.textOnDark,
  },
  bubbleMeta: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.semanticColors.textMuted,
  },
  bubbleMetaMine: {
    color: "rgba(255,255,255,0.68)",
  },
  detailComposer: {
    borderTopWidth: 1,
    borderTopColor: theme.semanticColors.borderSoft,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: theme.spacing[3],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[3],
  },
  composerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  composerField: {
    flex: 1,
  },
  composerInput: {
    minHeight: 40,
    maxHeight: 84,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "#E6DCCF",
    backgroundColor: "#FFFDF9",
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[2],
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.semanticColors.textPrimary,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semanticColors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
});

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
