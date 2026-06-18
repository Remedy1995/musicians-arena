import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { UserRole } from "../AppShell";
import { useMarketplaceData } from "../hooks/useMarketplaceData";
import { BookingPaymentSummary, DisputeItem, UserSummary } from "../services/api/types";
import { api } from "../services/api";
import { ApiError } from "../services/api/client";
import { BookingCard } from "../components/BookingCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { SecondaryButton } from "../components/SecondaryButton";
import { TextField } from "../components/TextField";
import { theme } from "../theme/theme";

type BookingsScreenProps = {
  role: UserRole;
  currentUser: UserSummary;
  token: string;
  onExit: () => void;
  onSignOut: () => void;
  onNavigateTab: (tab: "discover" | "gigs" | "messages" | "bookings") => void;
  focusedConversationId: string | null;
  setFocusedConversationId: (conversationId: string | null) => void;
  focusedBookingId: string | null;
  setFocusedBookingId: (bookingId: string | null) => void;
  marketplace: ReturnType<typeof useMarketplaceData>;
};

export function BookingsScreen({
  role,
  token,
  marketplace,
  onNavigateTab,
  focusedBookingId,
  setFocusedBookingId,
}: BookingsScreenProps) {
  const bookings = marketplace.bookings;
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<BookingPaymentSummary | null>(null);
  const [loadingPaymentSummary, setLoadingPaymentSummary] = useState(false);
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [form, setForm] = useState({
    reason: "",
    quotedAmount: "",
    depositAmount: "",
    balanceAmount: "",
    counterAmount: "",
    counterNotes: "",
    disputeType: "quality",
    disputeDescription: "",
  });
  const selectedBooking = useMemo(() => bookings.find((item) => item.id === selectedBookingId) ?? null, [bookings, selectedBookingId]);

  useEffect(() => {
    if (!focusedBookingId) return;
    const exists = bookings.some((booking) => booking.id === focusedBookingId);
    if (exists) {
      setSelectedBookingId(focusedBookingId);
      setActionOpen(true);
      setFocusedBookingId(null);
    }
  }, [bookings, focusedBookingId, setFocusedBookingId]);

  useEffect(() => {
    if (!selectedBooking || !actionOpen) return;
    void (async () => {
      setLoadingPaymentSummary(true);
      try {
        const summary = await api.bookingPaymentSummary(token, selectedBooking.id);
        setPaymentSummary(summary);
      } catch (caught) {
        setActionError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to load payment summary.");
      } finally {
        setLoadingPaymentSummary(false);
      }
    })();
  }, [actionOpen, selectedBooking, token]);

  useEffect(() => {
    if (!selectedBooking || !actionOpen) return;
    void (async () => {
      setLoadingDisputes(true);
      try {
        const disputeItems = await api.bookingDisputes(token, selectedBooking.id);
        setDisputes(disputeItems);
      } catch (caught) {
        setActionError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to load disputes.");
      } finally {
        setLoadingDisputes(false);
      }
    })();
  }, [actionOpen, selectedBooking, token]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.body}>
          {role === "client"
            ? "Track deposits, confirmations, and event readiness from one place."
            : "Keep accepted work, payout expectations, and event commitments easy to review."}
        </Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Active bookings" action={`${bookings.length} open`} />
        <View style={styles.list}>
          {bookings.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setSelectedBookingId(item.id);
                setActionError(null);
                setActionOpen(true);
              }}
            >
              <BookingCard
                title={item.title}
                counterpart={role === "client" ? item.talent.username : item.city || "Client booking"}
                date={item.start_time ? `${item.event_date} at ${item.start_time.slice(0, 5)}` : item.event_date}
                amount={`${item.currency_code} ${Number(item.quoted_amount || item.budget_max || item.budget_min || 0).toLocaleString()}`}
                status={item.status.replaceAll("_", " ")}
              />
            </Pressable>
          ))}
          {marketplace.error ? <Text style={styles.error}>{marketplace.error}</Text> : null}
        </View>
      </View>

      <Modal animationType="slide" visible={actionOpen} onRequestClose={() => setActionOpen(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Booking actions</Text>
            <Pressable onPress={() => setActionOpen(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          {selectedBooking ? (
            <ScrollView contentContainerStyle={styles.modalForm}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{selectedBooking.title}</Text>
                <Text style={styles.summaryMeta}>
                  {selectedBooking.event_date}
                  {selectedBooking.start_time ? ` at ${selectedBooking.start_time.slice(0, 5)}` : ""}
                </Text>
                <Text style={styles.summaryMeta}>
                  {selectedBooking.venue_name || selectedBooking.city}, {selectedBooking.region}
                </Text>
              </View>
              <View style={styles.timelineCard}>
                <Text style={styles.sectionMiniTitle}>Booking timeline</Text>
                {buildTimeline(selectedBooking.status).map((step) => (
                  <View key={step.label} style={styles.timelineRow}>
                    <View style={[styles.timelineDot, step.active ? styles.timelineDotActive : undefined]} />
                    <Text style={[styles.timelineLabel, step.active ? styles.timelineLabelActive : undefined]}>{step.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.paymentCard}>
                <Text style={styles.sectionMiniTitle}>Payment summary</Text>
                <Text style={styles.paymentLine}>Quoted: {formatMoney(selectedBooking.currency_code, paymentSummary?.quoted_amount || selectedBooking.quoted_amount || selectedBooking.budget_max || selectedBooking.budget_min)}</Text>
                <Text style={styles.paymentLine}>Deposit due: {formatMoney(selectedBooking.currency_code, paymentSummary?.deposit_amount || selectedBooking.deposit_amount)}</Text>
                <Text style={styles.paymentLine}>Deposit paid: {formatMoney(selectedBooking.currency_code, paymentSummary?.deposit_paid)}</Text>
                <Text style={styles.paymentLine}>Balance due: {formatMoney(selectedBooking.currency_code, paymentSummary?.balance_amount || selectedBooking.balance_amount)}</Text>
                <Text style={styles.paymentLine}>Balance paid: {formatMoney(selectedBooking.currency_code, paymentSummary?.balance_paid)}</Text>
                <Text style={styles.paymentLine}>Total paid: {formatMoney(selectedBooking.currency_code, paymentSummary?.total_paid)}</Text>
                <Text style={styles.paymentLine}>Outstanding: {formatMoney(selectedBooking.currency_code, paymentSummary?.outstanding_amount)}</Text>
                {role === "talent" ? (
                  <>
                    <Text style={styles.paymentLine}>Platform commission: {formatMoney(selectedBooking.currency_code, paymentSummary?.commission_amount)}</Text>
                    <Text style={styles.paymentLine}>Payout due: {formatMoney(selectedBooking.currency_code, paymentSummary?.payout_due_amount)}</Text>
                  </>
                ) : null}
                {loadingPaymentSummary ? <Text style={styles.paymentHint}>Refreshing payment summary...</Text> : null}
                {paymentSummary?.payments.length ? (
                  <View style={styles.paymentHistory}>
                    {paymentSummary.payments.slice(0, 3).map((payment) => (
                      <Text key={payment.id} style={styles.paymentHistoryLine}>
                        {payment.payment_type} • {formatMoney(payment.currency_code, payment.amount)} • {payment.status}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {role === "talent" && paymentSummary?.payouts.length ? (
                  <View style={styles.payoutHistory}>
                    <Text style={styles.sectionMiniTitle}>Payout summary</Text>
                    {paymentSummary.payouts.slice(0, 3).map((payout) => (
                      <Text key={payout.id} style={styles.paymentHistoryLine}>
                        {payout.status} • Net {formatMoney(selectedBooking.currency_code, payout.net_amount)} • {payout.payout_method.replaceAll("_", " ")}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
              <View style={styles.timelineCard}>
                <Text style={styles.sectionMiniTitle}>Support and disputes</Text>
                <Text style={styles.helperText}>Use this only when something important has gone wrong and needs platform review.</Text>
                {loadingDisputes ? <Text style={styles.paymentHint}>Loading dispute history...</Text> : null}
                {disputes.length ? (
                  <View style={styles.disputeList}>
                    {disputes.map((dispute) => (
                      <View key={dispute.id} style={styles.disputeCard}>
                        <Text style={styles.disputeTitle}>
                          {dispute.dispute_type.replaceAll("_", " ")} • {dispute.status.replaceAll("_", " ")}
                        </Text>
                        <Text style={styles.disputeBody}>{dispute.description}</Text>
                        {dispute.resolution_notes ? <Text style={styles.disputeBody}>Resolution: {dispute.resolution_notes}</Text> : null}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.paymentHint}>No disputes have been opened for this booking.</Text>
                )}
                <TextField
                  label="Dispute type"
                  value={form.disputeType}
                  onChangeText={(value) => setForm((current) => ({ ...current, disputeType: value.toLowerCase() }))}
                  helperText="Use one of: no_show, payment, quality, misconduct, other"
                />
                <TextField
                  label="What went wrong?"
                  value={form.disputeDescription}
                  onChangeText={(value) => setForm((current) => ({ ...current, disputeDescription: value }))}
                  multiline
                />
                <SecondaryButton
                  label={submitting ? "Working..." : "Raise dispute"}
                  onPress={() => {
                    void handleCreateDispute();
                  }}
                />
              </View>
              <Text style={styles.helperText}>
                {selectedBooking.title} for {selectedBooking.event_date}
              </Text>
              <TextField label="Reason or note" value={form.reason} onChangeText={(value) => setForm((current) => ({ ...current, reason: value }))} multiline />
              {role === "talent" ? (
                <>
                  <TextField label="Quoted amount" value={form.quotedAmount} onChangeText={(value) => setForm((current) => ({ ...current, quotedAmount: value }))} keyboardType="phone-pad" />
                  <TextField label="Deposit amount" value={form.depositAmount} onChangeText={(value) => setForm((current) => ({ ...current, depositAmount: value }))} keyboardType="phone-pad" />
                  <TextField label="Balance amount" value={form.balanceAmount} onChangeText={(value) => setForm((current) => ({ ...current, balanceAmount: value }))} keyboardType="phone-pad" />
                  <TextField label="Counteroffer amount" value={form.counterAmount} onChangeText={(value) => setForm((current) => ({ ...current, counterAmount: value }))} keyboardType="phone-pad" />
                  <TextField label="Counteroffer note" value={form.counterNotes} onChangeText={(value) => setForm((current) => ({ ...current, counterNotes: value }))} multiline />
                </>
              ) : null}
              {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
              <View style={styles.actionStack}>
                {role === "talent" ? (
                  <>
                    <PrimaryButton
                      label={submitting ? "Working..." : "Accept booking"}
                      onPress={() => {
                        void handleBookingAction("accept");
                      }}
                    />
                    <SecondaryButton
                      label="Send counteroffer"
                      onPress={() => {
                        void handleCounteroffer();
                      }}
                    />
                    <SecondaryButton
                      label="Reject booking"
                      onPress={() => {
                        void handleBookingAction("reject");
                      }}
                    />
                  </>
                ) : (
                  <>
                    <PrimaryButton
                      label={submitting ? "Working..." : "Confirm booking"}
                      onPress={() => {
                        void handleBookingAction("confirm");
                      }}
                    />
                    <SecondaryButton
                      label="Cancel booking"
                      onPress={() => {
                        void handleBookingAction("cancel");
                      }}
                    />
                    <SecondaryButton
                      label="Record deposit payment"
                      onPress={() => {
                        void handleRecordPayment("deposit");
                      }}
                    />
                    <SecondaryButton
                      label="Record balance payment"
                      onPress={() => {
                        void handleRecordPayment("balance");
                      }}
                    />
                  </>
                )}
                <SecondaryButton label="Open messages" onPress={() => onNavigateTab("messages")} />
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );

  async function handleBookingAction(action: "accept" | "reject" | "cancel" | "confirm") {
    if (!selectedBooking) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.bookingAction(token, selectedBooking.id, {
        action,
        reason: form.reason || undefined,
        quoted_amount: action === "accept" ? form.quotedAmount : undefined,
        deposit_amount: action === "accept" ? form.depositAmount : undefined,
        balance_amount: action === "accept" ? form.balanceAmount : undefined,
      });
      await marketplace.refresh();
      closeModal();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to update booking.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCounteroffer() {
    if (!selectedBooking) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.bookingCounteroffer(token, selectedBooking.id, {
        amount: form.counterAmount,
        notes: form.counterNotes || undefined,
      });
      await marketplace.refresh();
      closeModal();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to send counteroffer.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecordPayment(paymentType: "deposit" | "balance" | "full") {
    if (!selectedBooking) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.recordBookingPayment(token, selectedBooking.id, {
        payment_type: paymentType,
      });
      const summary = await api.bookingPaymentSummary(token, selectedBooking.id);
      setPaymentSummary(summary);
      await marketplace.refresh();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to record payment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateDispute() {
    if (!selectedBooking) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.createBookingDispute(token, selectedBooking.id, {
        dispute_type: form.disputeType as "no_show" | "payment" | "quality" | "misconduct" | "other",
        description: form.disputeDescription,
      });
      const [updatedDisputes] = await Promise.all([api.bookingDisputes(token, selectedBooking.id), marketplace.refresh()]);
      setDisputes(updatedDisputes);
      setForm((current) => ({ ...current, disputeType: "quality", disputeDescription: "" }));
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to open dispute.");
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    setActionOpen(false);
    setSelectedBookingId(null);
    setPaymentSummary(null);
    setForm({
      reason: "",
      quotedAmount: "",
      depositAmount: "",
      balanceAmount: "",
      counterAmount: "",
      counterNotes: "",
      disputeType: "quality",
      disputeDescription: "",
    });
    setDisputes([]);
  }
}

function buildTimeline(status: string) {
  const order = ["pending", "countered", "awaiting_deposit", "confirmed", "completed"];
  const currentIndex = order.indexOf(status);
  if (status === "disputed") {
    return [
      { label: "Request created", active: true },
      { label: "Negotiation", active: true },
      { label: "Awaiting deposit", active: true },
      { label: "Confirmed", active: true },
      { label: "Disputed", active: true },
    ];
  }
  return [
    { label: "Request created", active: currentIndex >= 0 },
    { label: "Negotiation", active: currentIndex >= 1 },
    { label: "Awaiting deposit", active: currentIndex >= 2 },
    { label: "Confirmed", active: currentIndex >= 3 },
    { label: "Completed", active: currentIndex >= 4 },
  ];
}

function formatMoney(currencyCode: string, amount?: string | null) {
  if (!amount) return `${currencyCode} -`;
  return `${currencyCode} ${Number(amount).toLocaleString()}`;
}

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
  modalScreen: {
    flex: 1,
    backgroundColor: theme.semanticColors.background,
    padding: theme.layout.screenPadding,
    gap: theme.spacing[4],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: theme.spacing[6],
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size["2xl"],
    color: theme.semanticColors.textPrimary,
  },
  modalClose: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.primary,
  },
  modalForm: {
    gap: theme.spacing[4],
  },
  helperText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  summaryCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    backgroundColor: theme.colors.ink[900],
    gap: theme.spacing[2],
  },
  summaryTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
    color: theme.semanticColors.textOnDark,
  },
  summaryMeta: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: "rgba(255,255,255,0.74)",
  },
  timelineCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    gap: theme.spacing[3],
  },
  sectionMiniTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.stone[200],
  },
  timelineDotActive: {
    backgroundColor: theme.semanticColors.primary,
  },
  timelineLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textMuted,
  },
  timelineLabelActive: {
    color: theme.semanticColors.textPrimary,
  },
  paymentCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    backgroundColor: "#F3EEE5",
    gap: theme.spacing[2],
  },
  paymentLine: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  paymentHint: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
  },
  disputeList: {
    gap: theme.spacing[3],
  },
  disputeCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing[3],
    backgroundColor: "#FFF7F2",
    borderWidth: 1,
    borderColor: theme.colors.ember[300],
    gap: theme.spacing[2],
  },
  disputeTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  disputeBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  paymentHistory: {
    gap: theme.spacing[1],
    marginTop: theme.spacing[2],
  },
  payoutHistory: {
    gap: theme.spacing[1],
    marginTop: theme.spacing[3],
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.semanticColors.borderSoft,
  },
  paymentHistoryLine: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textSecondary,
  },
  actionStack: {
    gap: theme.spacing[3],
  },
  error: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.danger,
  },
});
