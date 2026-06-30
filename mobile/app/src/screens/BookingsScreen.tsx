import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { UserRole } from "../AppShell";
import { useMarketplaceData } from "../hooks/useMarketplaceData";
import { BookingItem, BookingPaymentSummary, UserSummary } from "../services/api/types";
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
  currentUser,
  token,
  marketplace,
  onNavigateTab,
  focusedBookingId,
  setFocusedBookingId,
}: BookingsScreenProps) {
  const bookings = marketplace.bookings;
  type ClientTabOption = {
    key: "pending" | "active" | "countered" | "awaiting_deposit" | "confirmed" | "closed";
    label: string;
    shortLabel?: string;
  };
  const clientTabOptions = useMemo(
    (): ClientTabOption[] => [
      { key: "pending", label: "Requests" },
      { key: "active", label: "All active" },
      { key: "countered", label: "Counteroffers", shortLabel: "Counters" },
      { key: "awaiting_deposit", label: "Awaiting deposit" },
      { key: "confirmed", label: "Confirmed" },
      { key: "closed", label: "Closed" },
    ],
    [],
  );
  const primaryClientTabOptions = useMemo(() => clientTabOptions.slice(0, 2), [clientTabOptions]);
  const overflowClientTabOptions = useMemo(() => clientTabOptions.slice(2), [clientTabOptions]);
  const [clientStatusTab, setClientStatusTab] = useState<(typeof clientTabOptions)[number]["key"]>("active");
  const [moreStatusOpen, setMoreStatusOpen] = useState(false);
  const clientActiveBookings = useMemo(
    () => bookings.filter((booking) => !["cancelled", "completed"].includes(getEffectiveBookingStatus(booking))),
    [bookings],
  );
  const clientClosedBookings = useMemo(
    () => bookings.filter((booking) => ["cancelled", "completed"].includes(getEffectiveBookingStatus(booking))),
    [bookings],
  );
  const clientVisibleBookings = useMemo(() => {
    switch (clientStatusTab) {
      case "active":
        return clientActiveBookings;
      case "pending":
        return bookings.filter((booking) => getEffectiveBookingStatus(booking) === "pending");
      case "countered":
        return bookings.filter((booking) => getEffectiveBookingStatus(booking) === "countered");
      case "awaiting_deposit":
        return bookings.filter((booking) => getEffectiveBookingStatus(booking) === "awaiting_deposit");
      case "confirmed":
        return bookings.filter((booking) => getEffectiveBookingStatus(booking) === "confirmed");
      case "closed":
        return clientClosedBookings;
      default:
        return clientActiveBookings;
    }
  }, [bookings, clientActiveBookings, clientClosedBookings, clientStatusTab]);
  const talentRequestBookings = useMemo(
    () => bookings.filter((booking) => ["pending", "countered"].includes(booking.status)),
    [bookings],
  );
  const talentActiveBookings = useMemo(
    () => bookings.filter((booking) => !["pending", "countered"].includes(booking.status)),
    [bookings],
  );
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeActionForm, setActiveActionForm] = useState<"accept" | "counteroffer" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<BookingPaymentSummary | null>(null);
  const [loadingPaymentSummary, setLoadingPaymentSummary] = useState(false);
  const [form, setForm] = useState({
    quotedAmount: "",
    depositAmount: "",
    balanceAmount: "",
    counterAmount: "",
    counterNotes: "",
  });
  const selectedBooking = useMemo(() => bookings.find((item) => item.id === selectedBookingId) ?? null, [bookings, selectedBookingId]);
  const latestOffer = selectedBooking?.latest_offer ?? null;
  const effectiveStatus = selectedBooking ? getEffectiveBookingStatus(selectedBooking) : null;
  const offerHistory = useMemo(
    () => [...(selectedBooking?.offer_history ?? [])].sort((left, right) => right.created_at.localeCompare(left.created_at)),
    [selectedBooking?.offer_history],
  );
  const latestOfferByCurrentUser = latestOffer?.proposed_by_id === currentUser.id;
  const acceptTerms = useMemo(() => buildAcceptTerms(selectedBooking, latestOffer), [selectedBooking, latestOffer]);
  const canRespondToInitialRequest = role === "talent" && effectiveStatus === "pending" && !latestOffer;
  const canRespondToCounteroffer = effectiveStatus === "countered" && !!latestOffer && !latestOfferByCurrentUser;
  const negotiationCanRespond = Boolean(canRespondToInitialRequest || canRespondToCounteroffer);
  const waitingForOtherParty = Boolean(effectiveStatus === "countered" && latestOfferByCurrentUser);
  const talentWaitingFallback = Boolean(role === "talent" && effectiveStatus === "countered" && !negotiationCanRespond);
  const talentCanTrack = role === "talent" && Boolean(selectedBooking) && !negotiationCanRespond;
  const isClientRespondingToCounteroffer = role === "client" && canRespondToCounteroffer;

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
        <SectionHeader
          title={role === "talent" ? "Booking requests" : "Bookings"}
          action={
            role === "talent"
              ? `${talentRequestBookings.length} to review`
              : `${clientVisibleBookings.length} ${clientStatusTab === "active" ? "active" : "shown"}`
          }
        />
        <Text style={styles.sectionLead}>
          {role === "talent"
            ? "New client booking offers land here first. Open any request to accept, counter, or decline."
            : "Keep every confirmed booking, payment milestone, and event handoff in one place."}
        </Text>
        {role === "client" ? (
          <View style={styles.statusTabsWrap}>
            <View style={styles.statusFilterHeader}>
              <Text style={styles.statusFilterLabel}>Browse by status</Text>
              <Text style={styles.statusFilterValue}>
                {(clientTabOptions.find((tab) => tab.key === clientStatusTab)?.label ?? "Active").toUpperCase()}
              </Text>
            </View>
            <View style={styles.statusTabRow}>
              {primaryClientTabOptions.map((tab) => {
                const isActive = clientStatusTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => {
                      setClientStatusTab(tab.key);
                      setMoreStatusOpen(false);
                    }}
                    style={[styles.statusTab, isActive ? styles.statusTabActive : undefined]}
                  >
                    <Text
                      style={[styles.statusTabLabel, isActive ? styles.statusTabLabelActive : undefined]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setMoreStatusOpen((current) => !current)}
                style={[
                  styles.statusMoreTab,
                  overflowClientTabOptions.some((tab) => tab.key === clientStatusTab) ? styles.statusTabActive : undefined,
                  moreStatusOpen ? styles.statusMoreTabOpen : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.statusTabLabel,
                    overflowClientTabOptions.some((tab) => tab.key === clientStatusTab) ? styles.statusTabLabelActive : undefined,
                  ]}
                  numberOfLines={1}
                >
                  {overflowClientTabOptions.find((tab) => tab.key === clientStatusTab)?.shortLabel
                    ?? overflowClientTabOptions.find((tab) => tab.key === clientStatusTab)?.label
                    ?? "More"}
                </Text>
                <MaterialCommunityIcons
                  name={moreStatusOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={theme.semanticColors.textMuted}
                />
              </Pressable>
            </View>
            {moreStatusOpen ? (
              <View style={styles.moreMenu}>
                {overflowClientTabOptions.map((tab) => {
                  const isActive = clientStatusTab === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      onPress={() => {
                        setClientStatusTab(tab.key);
                        setMoreStatusOpen(false);
                      }}
                      style={[styles.moreMenuItem, isActive ? styles.moreMenuItemActive : undefined]}
                    >
                      <Text
                        style={[styles.moreMenuLabel, isActive ? styles.moreMenuLabelActive : undefined]}
                        numberOfLines={1}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={styles.list}>
          {(role === "talent" ? talentRequestBookings : clientVisibleBookings).map((item) => (
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
                status={getBookingCardStatusLabel(getEffectiveBookingStatus(item))}
                eyebrow={role === "talent" ? getBookingCardEyebrow(getEffectiveBookingStatus(item)) : undefined}
                highlight={role === "talent" && ["pending", "countered"].includes(getEffectiveBookingStatus(item))}
              />
            </Pressable>
          ))}
          {marketplace.error ? <Text style={styles.error}>{marketplace.error}</Text> : null}
          {role === "talent" && talentRequestBookings.length === 0 ? <Text style={styles.helperText}>No new booking requests right now.</Text> : null}
          {role === "client" && clientVisibleBookings.length === 0 ? (
            <Text style={styles.helperText}>No bookings in this status right now.</Text>
          ) : null}
        </View>
      </View>

      {role === "talent" ? (
        <View style={styles.section}>
          <SectionHeader title="Current bookings" action={`${talentActiveBookings.length} active`} />
          {talentActiveBookings.length === 0 ? (
            <Text style={styles.sectionLead}>
              Once a request is accepted, it moves here so you can track deposits, confirmation, and delivery.
            </Text>
          ) : null}
          <View style={styles.list}>
            {talentActiveBookings.map((item) => (
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
                  counterpart={item.city || "Client booking"}
                  date={item.start_time ? `${item.event_date} at ${item.start_time.slice(0, 5)}` : item.event_date}
                  amount={`${item.currency_code} ${Number(item.quoted_amount || item.budget_max || item.budget_min || 0).toLocaleString()}`}
                  status={getBookingCardStatusLabel(getEffectiveBookingStatus(item))}
                  eyebrow={getBookingCardEyebrow(getEffectiveBookingStatus(item))}
                />
              </Pressable>
            ))}
            {talentActiveBookings.length === 0 ? <Text style={styles.helperText}>Accepted, confirmed, and completed bookings will appear here.</Text> : null}
          </View>
        </View>
      ) : null}

      <Modal animationType="slide" visible={actionOpen} onRequestClose={() => setActionOpen(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {role === "talent" && negotiationCanRespond ? "Booking request" : "Booking actions"}
            </Text>
            <Pressable onPress={() => setActionOpen(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          {selectedBooking ? (
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalForm}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{selectedBooking.title}</Text>
                <Text style={styles.summaryCounterpart}>
                  {role === "client"
                    ? `Talent: ${selectedBooking.talent.username}`
                    : `Client: ${selectedBooking.client.username}`}
                </Text>
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
                {buildTimeline(effectiveStatus ?? selectedBooking.status).map((step) => (
                  <View key={step.label} style={styles.timelineRow}>
                    <View style={[styles.timelineDot, step.active ? styles.timelineDotActive : undefined]} />
                    <Text style={[styles.timelineLabel, step.active ? styles.timelineLabelActive : undefined]}>{step.label}</Text>
                  </View>
                ))}
              </View>
              {role === "talent" && !(effectiveStatus === "countered" && latestOffer) ? (
                <View style={styles.decisionSummaryCard}>
                  <Text style={styles.decisionSummaryLabel}>Booking status</Text>
                  <Text style={styles.decisionSummaryValue}>{getBookingDisplayStatusLabel(effectiveStatus ?? selectedBooking.status)}</Text>
                  <Text style={styles.decisionSummaryBody}>{getTalentBookingStatusCopy(effectiveStatus ?? selectedBooking.status)}</Text>
                </View>
              ) : null}
              {latestOffer ? (
                <View style={styles.latestOfferCard}>
                  <Text style={styles.latestOfferLabel}>
                    {effectiveStatus === "countered"
                      ? "Counteroffer in review"
                      : latestOfferByCurrentUser
                        ? "Your latest counteroffer"
                        : "Latest counteroffer"}
                  </Text>
                  {effectiveStatus === "countered" ? (
                    <Text style={styles.latestOfferStatusValue}>Countered</Text>
                  ) : null}
                  <Text style={styles.latestOfferAmount}>
                    {formatMoney(selectedBooking.currency_code, latestOffer.amount)}
                  </Text>
                  <Text style={styles.latestOfferBody}>
                    {effectiveStatus === "countered"
                      ? latestOfferByCurrentUser
                        ? "You sent the latest counteroffer. The other party needs to respond before you can send another one."
                        : role === "client"
                          ? "The talent has proposed a new amount for this booking. Review it before you accept, decline, or send a new counteroffer."
                          : "The client has responded with a counteroffer. Review it before you accept, decline, or continue negotiating."
                      : latestOfferByCurrentUser
                        ? "You sent the latest counteroffer. The other party needs to respond before you can send another one."
                        : "Review the latest counteroffer before deciding whether to accept, decline, or send a new counteroffer."}
                  </Text>
                  <Text style={styles.latestOfferNote}>
                    {latestOffer.notes ? `Note: ${latestOffer.notes}` : "No note was added to this counteroffer."}
                  </Text>
                  <Text style={styles.paymentHint}>
                    {formatStatusLabel(latestOffer.status)} • {formatTimestamp(latestOffer.created_at)}
                  </Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => setHistoryOpen(true)}
                style={styles.historyLinkWrap}
              >
                <View style={styles.historyLinkButton}>
                  <Text style={styles.historyLink}>View counteroffer history</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={16}
                    color={theme.semanticColors.primary}
                  />
                </View>
              </Pressable>
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
              {role === "talent" && (waitingForOtherParty || talentWaitingFallback || talentCanTrack) ? (
                <View style={styles.offerDecisionCard}>
                  <Text style={styles.sectionMiniTitle}>Current next step</Text>
                  <Text style={styles.helperText}>
                    {waitingForOtherParty || talentWaitingFallback
                      ? "Your counteroffer has been sent. The other party can now accept it, reject it, or respond with a new counteroffer."
                      : getTalentBookingStatusCopy(effectiveStatus ?? selectedBooking.status)}
                  </Text>
                </View>
              ) : null}
              {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
              <View style={styles.actionStack}>
                {negotiationCanRespond ? (
                  <>
                    <PrimaryButton
                      label={isClientRespondingToCounteroffer ? "Accept counteroffer" : "Accept booking"}
                      onPress={() => {
                        setActiveActionForm("accept");
                      }}
                    />
                    <SecondaryButton
                      label="Send counteroffer"
                      onPress={() => {
                        setActiveActionForm("counteroffer");
                      }}
                    />
                    <SecondaryButton
                      label={isClientRespondingToCounteroffer ? "Decline counteroffer" : "Reject booking"}
                      onPress={() => {
                        void handleBookingAction("reject");
                      }}
                    />
                  </>
                ) : waitingForOtherParty || talentWaitingFallback ? (
                  <>
                    <SecondaryButton
                      label={role === "talent" ? "Withdraw booking request" : "Cancel booking"}
                      destructive
                      onPress={() => {
                        void handleBookingAction(role === "talent" ? "reject" : "cancel");
                      }}
                    />
                  </>
                ) : role === "client" ? (
                  <>
                    {["pending", "countered", "awaiting_deposit", "confirmed"].includes(effectiveStatus ?? "") ? (
                      <SecondaryButton
                        label="Cancel booking"
                        onPress={() => {
                          void handleBookingAction("cancel");
                        }}
                      />
                    ) : null}
                    {effectiveStatus === "awaiting_deposit" ? (
                      <SecondaryButton
                        label="Record deposit payment"
                        onPress={() => {
                          void handleRecordPayment("deposit");
                        }}
                      />
                    ) : null}
                    {["confirmed", "completed"].includes(effectiveStatus ?? "") ? (
                      <SecondaryButton
                        label="Record balance payment"
                        onPress={() => {
                          void handleRecordPayment("balance");
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
                {role === "talent" && effectiveStatus === "awaiting_deposit" ? (
                  <SecondaryButton label="Awaiting client deposit" />
                ) : null}
                <SecondaryButton label="Open messages" onPress={() => onNavigateTab("messages")} />
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
      <Modal
        animationType="fade"
        transparent
        visible={activeActionForm !== null}
        onRequestClose={() => setActiveActionForm(null)}
      >
        <View style={styles.actionFormOverlay}>
          <View style={styles.actionFormSheet}>
            <View style={styles.actionFormHeader}>
              <Text style={styles.actionFormTitle}>
                {activeActionForm === "accept"
                  ? isClientRespondingToCounteroffer
                    ? "Accept counteroffer"
                    : "Accept booking"
                  : activeActionForm === "counteroffer"
                    ? "Send counteroffer"
                    : ""}
              </Text>
              <Pressable onPress={() => setActiveActionForm(null)}>
                <Text style={styles.modalClose}>Close</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.actionFormContent}>
              {activeActionForm === "accept" ? (
                <>
                  <Text style={styles.helperText}>
                    {latestOffer
                      ? "These acceptance terms are based on the latest counteroffer and the existing deposit split."
                      : "These acceptance terms follow the official booking breakdown already set for this booking."}
                  </Text>
                  <TextField label="Quoted amount" value={acceptTerms.quotedAmount} onChangeText={() => undefined} keyboardType="phone-pad" editable={false} />
                  <TextField
                    label="Deposit amount"
                    value={acceptTerms.depositAmount}
                    onChangeText={() => undefined}
                    keyboardType="phone-pad"
                    editable={false}
                    helperText={`Deposit ratio: ${acceptTerms.depositPercentLabel}`}
                  />
                  <TextField label="Balance amount" value={acceptTerms.balanceAmount} onChangeText={() => undefined} keyboardType="phone-pad" editable={false} />
                  <View style={styles.inlineActionRow}>
                    <PrimaryButton
                      label={submitting ? "Working..." : "Submit acceptance"}
                      onPress={() => {
                        setActiveActionForm(null);
                        void handleBookingAction("accept");
                      }}
                    />
                    <SecondaryButton label="Cancel" onPress={() => setActiveActionForm(null)} />
                  </View>
                </>
              ) : null}
              {activeActionForm === "counteroffer" ? (
                <>
                  <Text style={styles.helperText}>
                    Propose different terms if you want to negotiate before accepting this booking.
                  </Text>
                  <TextField label="Counteroffer amount" value={form.counterAmount} onChangeText={(value) => setForm((current) => ({ ...current, counterAmount: value }))} keyboardType="phone-pad" />
                  <TextField label="Counteroffer note" value={form.counterNotes} onChangeText={(value) => setForm((current) => ({ ...current, counterNotes: value }))} multiline />
                  <View style={styles.inlineActionRow}>
                    <PrimaryButton
                      label={submitting ? "Working..." : "Submit counteroffer"}
                      onPress={() => {
                        void handleCounteroffer();
                      }}
                    />
                    <SecondaryButton label="Cancel" onPress={() => setActiveActionForm(null)} />
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal animationType="slide" visible={historyOpen} onRequestClose={() => setHistoryOpen(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Counteroffer history</Text>
            <Pressable onPress={() => setHistoryOpen(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalForm}>
            <Text style={styles.helperText}>
              Keep track of how the negotiation changed before the final booking decision.
            </Text>
            {offerHistory.length === 0 ? (
              <Text style={styles.helperText}>No counter history available.</Text>
            ) : (
              <View style={styles.offerHistorySection}>
                {offerHistory.map((offer, index) => {
                  const isLatest = latestOffer?.id === offer.id;
                  const isMine = offer.proposed_by_id === currentUser.id;
                  return (
                    <View key={offer.id} style={[styles.offerHistoryItem, isLatest ? styles.offerHistoryItemLatest : undefined]}>
                      <View style={styles.offerHistoryHeader}>
                        <Text style={styles.offerHistoryParty}>
                          {isMine ? "You" : role === "client" ? "Talent" : "Client"}
                        </Text>
                        <Text style={styles.offerHistoryMeta}>
                          Round {offerHistory.length - index} • {formatTimestamp(offer.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.offerHistoryAmount}>
                        {formatMoney(selectedBooking?.currency_code ?? "GHS", offer.amount)}
                      </Text>
                      <Text style={styles.offerHistoryStatus}>
                        {formatStatusLabel(offer.status)}
                        {isLatest ? " • Latest" : ""}
                      </Text>
                      {offer.notes ? <Text style={styles.offerHistoryNote}>{offer.notes}</Text> : null}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
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
        quoted_amount: action === "accept" ? acceptTerms.quotedAmount : undefined,
        deposit_amount: action === "accept" ? acceptTerms.depositAmount : undefined,
        balance_amount: action === "accept" ? acceptTerms.balanceAmount : undefined,
      });
      closeModal();
      await marketplace.refresh();
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
      setActiveActionForm(null);
      setForm((current) => ({
        ...current,
        counterAmount: "",
        counterNotes: "",
      }));
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

  function closeModal() {
    setActionOpen(false);
    setHistoryOpen(false);
    setActiveActionForm(null);
    setSelectedBookingId(null);
    setPaymentSummary(null);
    setForm({
      quotedAmount: "",
      depositAmount: "",
      balanceAmount: "",
      counterAmount: "",
      counterNotes: "",
    });
  }
}

function buildAcceptTerms(booking: BookingItem | null, latestOffer: BookingItem["latest_offer"]) {
  const fallback = {
    quotedAmount: "",
    depositAmount: "",
    balanceAmount: "",
    depositPercentLabel: "0%",
  };

  if (!booking) return fallback;

  const officialQuoted = toNumber(booking.quoted_amount) ?? toNumber(booking.budget_max) ?? toNumber(booking.budget_min);
  const officialDeposit = toNumber(booking.deposit_amount);
  const officialBalance = toNumber(booking.balance_amount);
  const depositRatio =
    officialQuoted && officialDeposit !== null && officialQuoted > 0
      ? clampRatio(officialDeposit / officialQuoted)
      : 0.4;

  const quoted = toNumber(latestOffer?.amount) ?? officialQuoted ?? 0;
  if (quoted <= 0) return fallback;

  if (!latestOffer && officialQuoted && officialDeposit !== null && officialBalance !== null) {
    return {
      quotedAmount: formatDecimalInput(officialQuoted),
      depositAmount: formatDecimalInput(officialDeposit),
      balanceAmount: formatDecimalInput(officialBalance),
      depositPercentLabel: formatPercent(officialDeposit / officialQuoted),
    };
  }

  const deposit = roundCurrency(quoted * depositRatio);
  const balance = roundCurrency(quoted - deposit);

  return {
    quotedAmount: formatDecimalInput(quoted),
    depositAmount: formatDecimalInput(deposit),
    balanceAmount: formatDecimalInput(balance),
    depositPercentLabel: formatPercent(depositRatio),
  };
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
      { label: "Support review", active: true },
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

function getEffectiveBookingStatus(booking: Pick<BookingItem, "status" | "latest_offer">) {
  if (booking.status === "disputed" && booking.latest_offer) {
    return "countered";
  }
  return booking.status;
}

function formatMoney(currencyCode: string, amount?: string | null) {
  if (!amount) return `${currencyCode} -`;
  return `${currencyCode} ${Number(amount).toLocaleString()}`;
}

function toNumber(value?: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0.4;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function formatDecimalInput(value: number) {
  return value.toFixed(2);
}

function formatPercent(value: number) {
  return `${Math.round(clampRatio(value) * 100)}%`;
}

function getBookingCardStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Booking request";
    case "countered":
      return "Counteroffer";
    case "awaiting_deposit":
      return "Awaiting deposit";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "disputed":
      return "In review";
    default:
      return getBookingDisplayStatusLabel(status);
  }
}

function getBookingCardEyebrow(status: string) {
  switch (status) {
    case "pending":
      return "New request";
    case "countered":
      return "Needs response";
    case "awaiting_deposit":
      return "Deposit stage";
    case "confirmed":
      return "Confirmed booking";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Closed";
    case "disputed":
      return "Support case";
    default:
      return "Booking";
  }
}

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function getBookingDisplayStatusLabel(status: string) {
  switch (status) {
    case "disputed":
      return "In review";
    default:
      return formatStatusLabel(status);
  }
}

function getTalentBookingStatusCopy(status: string) {
  switch (status) {
    case "pending":
      return "A client has created a booking offer for you. Review the terms and either accept, counter, or reject it.";
    case "countered":
      return "This booking is in negotiation. Review the latest terms and decide whether to accept or continue negotiating.";
    case "awaiting_deposit":
      return "You have accepted the booking terms. The booking will move to confirmed once the client pays the deposit.";
    case "confirmed":
      return "The booking is confirmed and ready for delivery planning.";
    case "completed":
      return "This engagement has been completed.";
    case "cancelled":
      return "This booking is no longer active.";
    case "disputed":
      return "A support case is open on this booking and is under review while the booking details remain available.";
    default:
      return "Review the booking details and follow the next required action.";
  }
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  sectionLead: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  statusTabsWrap: {
    gap: theme.spacing[2],
    zIndex: 3,
    position: "relative",
    borderRadius: theme.radius.xl,
    padding: theme.spacing[3],
    backgroundColor: "#F7F1E7",
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    overflow: "visible",
  },
  statusFilterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  statusFilterLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  statusFilterValue: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.colors.gold[600],
    letterSpacing: 0.6,
  },
  statusTabRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  statusTab: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    backgroundColor: theme.semanticColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  statusMoreTab: {
    minWidth: 96,
    marginLeft: "auto",
    flexDirection: "row",
    gap: theme.spacing[1],
    alignItems: "center",
    justifyContent: "center",
  },
  statusMoreTabOpen: {
    borderColor: theme.colors.gold[400],
  },
  statusTabActive: {
    borderColor: theme.colors.gold[400],
    backgroundColor: "#FFF4DB",
  },
  statusTabLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  statusTabLabelActive: {
    color: theme.semanticColors.textPrimary,
  },
  statusMoreGlyph: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textMuted,
  },
  moreMenu: {
    position: "absolute",
    top: 92,
    right: 0,
    width: "30%",
    minWidth: 170,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    backgroundColor: theme.semanticColors.surface,
    padding: theme.spacing[2],
    gap: theme.spacing[1],
    zIndex: 20,
    ...theme.shadows.card,
  },
  moreMenuItem: {
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2] + 2,
  },
  moreMenuItemActive: {
    backgroundColor: "#FFF4DB",
  },
  moreMenuLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  moreMenuLabelActive: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.gold[600],
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
    paddingBottom: theme.spacing[8],
  },
  modalScroll: {
    flex: 1,
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
  summaryCounterpart: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: "rgba(255,255,255,0.88)",
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
    marginTop: 20,
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
  decisionSummaryCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    backgroundColor: "#FFF7F2",
    borderWidth: 1,
    borderColor: theme.colors.ember[300],
    gap: theme.spacing[2],
  },
  decisionSummaryLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.colors.ember[600],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  decisionSummaryValue: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
  },
  decisionSummaryBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
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
  inlineActionRow: {
    gap: theme.spacing[3],
  },
  actionFormOverlay: {
    flex: 1,
    backgroundColor: theme.semanticColors.background,
  },
  actionFormSheet: {
    flex: 1,
    backgroundColor: theme.semanticColors.background,
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: theme.spacing[6],
    paddingBottom: theme.spacing[8],
    gap: theme.spacing[4],
  },
  actionFormHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  actionFormTitle: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size["2xl"],
    color: theme.semanticColors.textPrimary,
  },
  actionFormContent: {
    gap: theme.spacing[4],
    paddingBottom: theme.spacing[4],
  },
  offerDecisionCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    gap: theme.spacing[3],
  },
  latestOfferCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[3],
    backgroundColor: "#FFF4DB",
    borderWidth: 1,
    borderColor: theme.colors.gold[400],
    gap: theme.spacing[1],
  },
  latestOfferLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.colors.gold[600],
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  latestOfferAmount: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
    color: theme.semanticColors.textPrimary,
  },
  latestOfferStatusValue: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.colors.gold[600],
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  latestOfferBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.semanticColors.textPrimary,
  },
  latestOfferNote: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textSecondary,
  },
  historyLinkWrap: {
    marginTop: theme.spacing[2],
    alignSelf: "flex-start",
  },
  historyLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.pill,
    backgroundColor: "#FFF7F2",
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  historyLink: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.primary,
  },
  offerHistorySection: {
    gap: theme.spacing[4],
    marginTop: 30,
  },
  offerHistoryCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  offerHistoryList: {
    gap: theme.spacing[4],
    paddingRight: theme.spacing[1],
  },
  offerHistoryScroll: {
    maxHeight: 220,
  },
  offerHistoryItem: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    backgroundColor: "#FAF7F2",
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    gap: theme.spacing[2],
  },
  offerHistoryItemLatest: {
    borderColor: theme.colors.gold[400],
    backgroundColor: "#FFF7E5",
  },
  offerHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  offerHistoryParty: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  offerHistoryMeta: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
  },
  offerHistoryAmount: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
  },
  offerHistoryStatus: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.xs,
    color: theme.colors.gold[600],
  },
  offerHistoryNote: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  error: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.danger,
  },
});
