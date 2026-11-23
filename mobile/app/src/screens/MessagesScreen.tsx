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
import { PageHeader } from "../components/PageHeader";
import { ModalCloseButton } from "../components/ModalCloseButton";
import { ModalSurface } from "../components/ModalSurface";
import { ProfileAvatar } from "../components/ProfileAvatar";
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
  onWorkspacePress?: () => void;
  marketplace: ReturnType<typeof useMarketplaceData>;
};

export function MessagesScreen({
  role,
  currentUser,
  marketplace,
  token,
  focusedConversationId,
  setFocusedConversationId,
  onWorkspacePress,
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
  const selectedConversationParticipant = useMemo(
    () => getConversationParticipant(selectedConversation, currentUser.id),
    [currentUser.id, selectedConversation],
  );
  const selectedConversationName = useMemo(
    () => selectedConversationParticipant?.display_name || selectedConversationParticipant?.username || "Conversation",
    [selectedConversationParticipant],
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
      <PageHeader
        title="Messages"
        body={
          role === "client"
            ? "Move from discovery into real coordination without leaving the platform."
            : "Respond quickly to shortlists, invites, and booking follow-ups."
        }
        workspaceLabel={role === "client" ? "Organizer" : "Talent"}
        onWorkspacePress={onWorkspacePress}
      />

      <View style={styles.section}>
        <SectionHeader title="Recent conversations" action={connected ? "Live" : "Standard sync"} />
        <View style={styles.list}>
          {marketplace.conversations.map((item) => {
            const other = getConversationParticipant(item, currentUser.id);
            const otherName = other?.display_name || other?.username || (role === "client" ? "the talent" : "the organizer");
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
                  imageUri={other?.profile_image_url}
                  message={getConversationPreview(item, role, otherName)}
                  time={item.last_message_at ? item.last_message_at.slice(11, 16) : "Now"}
                  unread={item.last_message?.read_at ? 0 : item.last_message ? 1 : 0}
                  badge={getConversationTypeLabel(item.conversation_type)}
                />
              </Pressable>
            );
          })}
          {marketplace.error ? <Text style={styles.error}>{marketplace.error}</Text> : null}
          {!marketplace.loading && marketplace.conversations.length === 0 ? <Text style={styles.empty}>No conversations yet.</Text> : null}
        </View>
      </View>

      <Modal animationType="slide" visible={detailOpen} onRequestClose={() => setDetailOpen(false)}>
        <ModalSurface style={styles.modalScreen}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <ProfileAvatar
                label={selectedConversationName}
                imageUri={selectedConversationParticipant?.profile_image_url}
                size={52}
                borderRadius={theme.radius.lg}
              />
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
            <ModalCloseButton onPress={() => setDetailOpen(false)} accessibilityLabel="Close conversation" />
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
        </ModalSurface>
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

function getConversationParticipant(conversation: ConversationItem | null, currentUserId: string) {
  if (!conversation) return null;
  return conversation.participants.find((participant) => participant.user_id !== currentUserId) ?? conversation.participants[0] ?? null;
}

function getConversationPreview(conversation: ConversationItem, role: UserRole, otherName: string) {
  const body = conversation.last_message?.body?.trim();
  if (!body) return "No messages yet";
  if (conversation.last_message?.message_type !== "system") return body;

  if (role === "client") {
    if (/invited to the opportunity gig/i.test(body)) {
      return `You invited ${otherName} to this opportunity.`;
    }
    if (/invitation response/i.test(body)) {
      return `${otherName} responded to your invitation.`;
    }
    if (/converted into a booking request/i.test(body)) {
      return `${otherName}'s opportunity moved to a booking request.`;
    }
    if (/shortlisted for gig/i.test(body)) {
      return `${otherName} was shortlisted for your opportunity.`;
    }
  }

  if (role === "talent") {
    if (/invited/i.test(body)) {
      return "You've been invited to an opportunity.";
    }
    if (/invitation response/i.test(body)) {
      return "Your invitation response was sent.";
    }
    if (/converted into a booking request/i.test(body)) {
      return "Your opportunity interest moved to a booking request.";
    }
    if (/shortlisted for gig/i.test(body)) {
      return "You've been shortlisted for an opportunity.";
    }
  }

  return body;
}

function getConversationTypeLabel(conversationType: string) {
  switch (conversationType) {
    case "gig":
      return "Opportunity";
    case "booking":
      return "Booking";
    case "inquiry":
      return "Direct";
    default:
      return conversationType;
  }
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
  section: {
    gap: theme.spacing[4],
  },
  list: {
    gap: theme.spacing[2],
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
    paddingHorizontal: 0,
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[1],
  },
  modalKeyboard: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: theme.spacing[4],
    paddingHorizontal: theme.layout.screenPadding,
    gap: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.semanticColors.borderSoft,
  },
  modalHeaderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
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
    backgroundColor: theme.semanticColors.success,
  },
  modalSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  chatShell: {
    flex: 1,
    backgroundColor: theme.semanticColors.background,
  },
  threadScroll: {
    flex: 1,
  },
  messageList: {
    gap: theme.spacing[2],
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: theme.spacing[4],
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
    color: theme.semanticColors.textOnDarkMuted,
  },
  detailComposer: {
    borderTopWidth: 1,
    borderTopColor: theme.semanticColors.borderSoft,
    backgroundColor: theme.semanticColors.surface,
    paddingHorizontal: theme.layout.screenPadding,
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
    borderColor: theme.semanticColors.borderSoft,
    backgroundColor: theme.semanticColors.surfaceMuted,
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
