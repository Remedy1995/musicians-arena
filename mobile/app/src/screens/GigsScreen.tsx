import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { UserRole } from "../AppShell";
import { DateTimeField } from "../components/DateTimeField";
import { useMarketplaceData } from "../hooks/useMarketplaceData";
import { GigDetailItem, GigInterestItem, TalentListItem, UserSummary } from "../services/api/types";
import { api } from "../services/api";
import { ApiError } from "../services/api/client";
import { GigCard } from "../components/GigCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { SecondaryButton } from "../components/SecondaryButton";
import { TextField } from "../components/TextField";
import { theme } from "../theme/theme";

type GigsScreenProps = {
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

export function GigsScreen({ role, marketplace, token, onNavigateTab, setFocusedConversationId, setFocusedBookingId }: GigsScreenProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const [organizerGigOpen, setOrganizerGigOpen] = useState(false);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [interestError, setInterestError] = useState<string | null>(null);
  const [gigDetail, setGigDetail] = useState<GigDetailItem | null>(null);
  const [gigDetailError, setGigDetailError] = useState<string | null>(null);
  const [selectedInterest, setSelectedInterest] = useState<GigInterestItem | null>(null);
  const [activeApplicantTab, setActiveApplicantTab] = useState<"interested" | "shortlisted" | "invited" | "declined">("interested");
  const [profileTarget, setProfileTarget] = useState<GigInterestItem | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<{
    interest: GigInterestItem;
    status: "shortlisted" | "invited" | "declined";
  } | null>(null);
  const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
  const [convertForm, setConvertForm] = useState({
    quotedAmount: "",
    depositAmount: "",
    balanceAmount: "",
    notes: "",
  });
  const [form, setForm] = useState({
    title: "",
    description: "",
    requirements: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    city: "",
    region: "",
    venueName: "",
    venueAddress: "",
    budgetMin: "",
    budgetMax: "",
  });
  const [interestForm, setInterestForm] = useState({
    note: "",
    proposedAmount: "",
  });

  const defaultEventType = marketplace.eventTypes[0]?.id ?? null;
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const selectedGig = useMemo(
    () => marketplace.gigs.find((item) => item.id === selectedGigId) ?? null,
    [marketplace.gigs, selectedGigId],
  );
  const talentResponseLocked = role === "talent" && Boolean(selectedGig?.my_interest_status);
  const renderedGigs = useMemo(() => {
    const scoped = marketplace.gigs.filter((gig) => (role === "client" ? gig.organizer_id === marketplace.me?.id : true));
    const unique = new Map(scoped.map((gig) => [gig.id, gig]));
    return Array.from(unique.values());
  }, [marketplace.gigs, marketplace.me?.id, role]);
  const viewedTalentProfile = useMemo<TalentListItem | null>(() => {
    if (!profileTarget) return null;
    return marketplace.talents.find((talent) => talent.user_id === profileTarget.talent_id) ?? null;
  }, [marketplace.talents, profileTarget]);

  function getInterestStatusLabel(status: string | null | undefined) {
    switch (status) {
      case "interested":
        return "Request sent";
      case "shortlisted":
        return "Shortlisted";
      case "invited":
        return "Invited to proceed";
      case "declined":
        return "Not selected";
      default:
        return null;
    }
  }

  function getDecisionCopy(status: "shortlisted" | "invited" | "declined") {
    switch (status) {
      case "shortlisted":
        return {
          title: "Shortlist this talent?",
          body: "This keeps the talent in your preferred pool and marks them as a strong fit for the gig.",
        };
      case "invited":
        return {
          title: "Invite this talent?",
          body: "This signals that you want to move forward and usually leads into direct booking or messaging.",
        };
      case "declined":
        return {
          title: "Decline this talent?",
          body: "This removes the talent from the active applicant flow for this gig.",
        };
      default:
        return {
          title: "Confirm action",
          body: "Please confirm this action.",
        };
    }
  }

  const groupedInterests = useMemo(() => {
    const groups: Record<"interested" | "shortlisted" | "invited" | "declined", GigInterestItem[]> = {
      interested: [],
      shortlisted: [],
      invited: [],
      declined: [],
    };
    (gigDetail?.interests || []).forEach((interest) => {
      if (interest.status === "shortlisted") {
        groups.shortlisted.push(interest);
      } else if (interest.status === "invited") {
        groups.invited.push(interest);
      } else if (interest.status === "declined") {
        groups.declined.push(interest);
      } else {
        groups.interested.push(interest);
      }
    });
    return groups;
  }, [gigDetail]);
  const activeTabInterests = groupedInterests[activeApplicantTab];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{role === "client" ? "🎙 Organizer" : "🎵 Talent"}</Text>
        </View>
        <Text style={styles.title}>{role === "client" ? "Your gig board" : "Available gigs"}</Text>
        <Text style={styles.body}>
          {role === "client"
            ? "Post event needs, review interested talents, and move promising matches into chat or booking."
            : "See nearby opportunities that match your skill set and show interest quickly."}
        </Text>
      </View>

      <View style={styles.heroActions}>
        {role === "client" ? (
          <>
            <PrimaryButton
              label="＋ Create a public gig"
              onPress={() => {
                setComposerOpen(true);
              }}
            />
            <SecondaryButton
              label="Review applicants"
              onPress={() => {
                const ownGig = renderedGigs.find((gig) => gig.interests_count > 0) ?? renderedGigs[0];
                if (ownGig) {
                  void openOrganizerGig(ownGig.id);
                }
              }}
            />
          </>
        ) : (
          <PrimaryButton
            label="Open messages"
            onPress={() => {
              onNavigateTab("messages");
            }}
          />
        )}
      </View>
      {handoffMessage ? (
        <Pressable
          onPress={() => {
            onNavigateTab(handoffMessage.includes("booking") ? "bookings" : "messages");
          }}
          style={styles.handoffCard}
        >
          <Text style={styles.handoffTitle}>Workflow ready</Text>
          <Text style={styles.handoffBody}>{handoffMessage}</Text>
          <Text style={styles.handoffLink}>{handoffMessage.includes("booking") ? "Open bookings" : "Open messages"}</Text>
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title={role === "client" ? "Your posted gigs" : "Recommended gigs"} action={role === "client" ? "Hiring" : "Filter"} />
        <View style={styles.list}>
          {renderedGigs.map((gig) => (
            <Pressable
              key={gig.id}
              onPress={() => {
                if (role === "talent") {
                  setSelectedGigId(gig.id);
                  setInterestError(null);
                  setInterestForm({
                    note: gig.my_interest_status ? "Your interest has already been submitted for this gig." : "",
                    proposedAmount: "",
                  });
                  setInterestOpen(true);
                } else if (role === "client" && gig.organizer_id === marketplace.me?.id) {
                  void openOrganizerGig(gig.id);
                }
              }}
            >
              <GigCard
                title={gig.title}
                venue={[gig.city, gig.region].filter(Boolean).join(", ")}
                timing={gig.start_time ? `${gig.event_date} at ${gig.start_time.slice(0, 5)}` : gig.event_date}
                budget={gig.budget_min && gig.budget_max ? `${gig.currency_code} ${Number(gig.budget_min).toLocaleString()} - ${Number(gig.budget_max).toLocaleString()}` : `${gig.currency_code} Budget open`}
                urgency={gig.is_urgent ? "Urgent" : "Open"}
                roles={gig.required_categories.map((item) => item.name)}
                applicantCount={role === "client" ? gig.interests_count : 0}
                interestStatusLabel={role === "talent" ? getInterestStatusLabel(gig.my_interest_status) : null}
                metaLabel={
                  role === "client"
                    ? `${gig.interests_count} ${gig.interests_count === 1 ? "talent has" : "talents have"} shown interest. Tap to review applicants.`
                    : gig.my_interest_status
                      ? "This gig already has your response on record."
                      : "Tap to review details and show interest."
                }
              />
            </Pressable>
          ))}
          {!marketplace.loading && role === "client" && renderedGigs.length === 0 ? (
            <Text style={styles.helperSubtext}>Your gigs will appear here after you publish them.</Text>
          ) : null}
          {!marketplace.loading && role === "talent" && renderedGigs.length === 0 ? (
            <Text style={styles.helperSubtext}>
              Open gigs will appear here once organizers publish them. Some bookings may still require talent categories on your profile before you can submit interest.
            </Text>
          ) : null}
          {marketplace.error ? <Text style={styles.error}>{marketplace.error}</Text> : null}
        </View>
      </View>

      <Modal animationType="slide" visible={composerOpen} onRequestClose={() => setComposerOpen(false)}>
        <KeyboardAvoidingView style={styles.modalScreen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <View style={styles.modalAccentBar} />
              <Text style={styles.modalTitle}>Create a gig</Text>
            </View>
            <Pressable onPress={() => setComposerOpen(false)} style={styles.closeButton}>
              <Text style={styles.modalClose}>✕ Close</Text>
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalForm}
            keyboardShouldPersistTaps="handled"
          >
            <TextField label="Title" value={form.title} onChangeText={(value) => setForm((current) => ({ ...current, title: value }))} />
            <TextField label="Description" value={form.description} onChangeText={(value) => setForm((current) => ({ ...current, description: value }))} multiline />
            <TextField label="Requirements" value={form.requirements} onChangeText={(value) => setForm((current) => ({ ...current, requirements: value }))} multiline />
            <View style={styles.fieldGroupCard}>
              <Text style={styles.fieldGroupLabel}>📅 Event timing</Text>
              <DateTimeField
                label="Event date"
                mode="date"
                value={form.eventDate}
                onChange={(value) => setForm((current) => ({ ...current, eventDate: value }))}
                helperText="Pick the date for the program or event."
              />
              <DateTimeField
                label="Start time"
                mode="time"
                value={form.startTime}
                onChange={(value) => setForm((current) => ({ ...current, startTime: value }))}
                helperText="Required"
              />
              <DateTimeField
                label="End time"
                mode="time"
                value={form.endTime}
                onChange={(value) => setForm((current) => ({ ...current, endTime: value }))}
                helperText="Optional, but recommended."
              />
            </View>
            <View style={styles.fieldGroupCard}>
              <Text style={styles.fieldGroupLabel}>📍 Venue details</Text>
              <TextField label="City" value={form.city} onChangeText={(value) => setForm((current) => ({ ...current, city: value }))} />
              <TextField label="Region" value={form.region} onChangeText={(value) => setForm((current) => ({ ...current, region: value }))} />
              <TextField label="Venue name" value={form.venueName} onChangeText={(value) => setForm((current) => ({ ...current, venueName: value }))} />
              <TextField label="Venue address" value={form.venueAddress} onChangeText={(value) => setForm((current) => ({ ...current, venueAddress: value }))} multiline />
            </View>
            <View style={styles.fieldGroupCard}>
              <Text style={styles.fieldGroupLabel}>💰 Budget range (GHS)</Text>
              <View style={styles.budgetRow}>
                <View style={styles.budgetField}>
                  <TextField label="Min" value={form.budgetMin} onChangeText={(value) => setForm((current) => ({ ...current, budgetMin: value }))} keyboardType="phone-pad" />
                </View>
                <View style={styles.budgetField}>
                  <TextField label="Max" value={form.budgetMax} onChangeText={(value) => setForm((current) => ({ ...current, budgetMax: value }))} keyboardType="phone-pad" />
                </View>
              </View>
            </View>
            <View style={styles.fieldGroupCard}>
              <Text style={styles.fieldGroupLabel}>🎼 Eligible talent categories</Text>
              <Text style={styles.helperSubtext}>
                Choose the kinds of talents that should be allowed to show interest in this gig.
              </Text>
              <View style={styles.categoryChips}>
                {marketplace.categories.map((category) => {
                  const selected = selectedCategoryIds.includes(category.id);
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => {
                        setSelectedCategoryIds((current) =>
                          current.includes(category.id)
                            ? current.filter((item) => item !== category.id)
                            : [...current, category.id],
                        );
                      }}
                      style={[styles.categoryChip, selected ? styles.categoryChipActive : undefined]}
                    >
                      <Text style={[styles.categoryChipLabel, selected ? styles.categoryChipLabelActive : undefined]}>
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
            <PrimaryButton
              label={submitting ? "Creating..." : "Publish gig"}
              onPress={() => {
                void (async () => {
                  setSubmitting(true);
                  setSubmitError(null);
                  try {
                    await api.createGig(token, {
                      event_type: defaultEventType,
                      title: form.title,
                      description: form.description,
                      requirements: form.requirements,
                      visibility: "public",
                      event_date: form.eventDate,
                      start_time: form.startTime,
                      end_time: form.endTime || null,
                      venue_name: form.venueName,
                      venue_address: form.venueAddress,
                      city: form.city,
                      region: form.region,
                      budget_min: form.budgetMin || null,
                      budget_max: form.budgetMax || null,
                      currency_code: "GHS",
                      is_urgent: false,
                      required_category_ids: selectedCategoryIds,
                    });
                    await marketplace.refresh();
                    setComposerOpen(false);
                    setForm({
                      title: "",
                      description: "",
                      requirements: "",
                      eventDate: "",
                      startTime: "",
                      endTime: "",
                      city: "",
                      region: "",
                      venueName: "",
                      venueAddress: "",
                      budgetMin: "",
                      budgetMax: "",
                    });
                    setSelectedCategoryIds([]);
                  } catch (caught) {
                    setSubmitError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to create gig.");
                  } finally {
                    setSubmitting(false);
                  }
                })();
              }}
            />
            <View style={styles.formBottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" visible={interestOpen} onRequestClose={() => setInterestOpen(false)}>
        <KeyboardAvoidingView style={styles.modalScreen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <View style={styles.modalAccentBar} />
              <Text style={styles.modalTitle}>{talentResponseLocked ? "Gig details" : "Show interest"}</Text>
            </View>
            <Pressable onPress={() => setInterestOpen(false)} style={styles.closeButton}>
              <Text style={styles.modalClose}>✕ Close</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
            {selectedGig ? (
              talentResponseLocked ? (
                <View style={styles.talentGigDetailStack}>
                  <View style={styles.talentGigHeroCard}>
                    <View style={styles.talentGigHeroTop}>
                      <View style={styles.talentGigHeroText}>
                        <Text style={styles.gigContextTitle}>{selectedGig.title}</Text>
                        <Text style={styles.gigContextMeta}>Hosted by {selectedGig.organizer_name}</Text>
                      </View>
                      <View style={[styles.talentGigUrgencyPill, selectedGig.is_urgent ? styles.talentGigUrgencyPillUrgent : undefined]}>
                        <Text style={[styles.talentGigUrgencyLabel, selectedGig.is_urgent ? styles.talentGigUrgencyLabelUrgent : undefined]}>
                          {selectedGig.is_urgent ? "Urgent" : "Open"}
                        </Text>
                      </View>
                    </View>
                    {selectedGig.description ? <Text style={styles.gigDetailBody}>{selectedGig.description}</Text> : null}
                  </View>

                  <View style={styles.talentGigFactsRow}>
                    <View style={styles.talentGigFactCard}>
                      <Text style={styles.talentGigFactLabel}>When</Text>
                      <Text style={styles.talentGigFactValue}>
                        {selectedGig.event_date}
                        {selectedGig.start_time ? ` • ${selectedGig.start_time.slice(0, 5)}` : ""}
                      </Text>
                    </View>
                    <View style={styles.talentGigFactCard}>
                      <Text style={styles.talentGigFactLabel}>Where</Text>
                      <Text style={styles.talentGigFactValue}>
                        {[selectedGig.city, selectedGig.region].filter(Boolean).join(", ") || "Location not specified"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.talentGigFactCardFull}>
                    <Text style={styles.talentGigFactLabel}>Budget</Text>
                    <Text style={styles.talentGigBudgetValue}>
                      {selectedGig.budget_min && selectedGig.budget_max
                        ? `${selectedGig.currency_code} ${Number(selectedGig.budget_min).toLocaleString()} - ${Number(selectedGig.budget_max).toLocaleString()}`
                        : `${selectedGig.currency_code} Budget open`}
                    </Text>
                  </View>

                  {selectedGig.required_categories.length > 0 ? (
                    <View style={styles.talentGigSectionCard}>
                      <Text style={styles.talentGigSectionTitle}>Eligible categories</Text>
                      <View style={styles.talentGigCategoryRow}>
                        {selectedGig.required_categories.map((category) => (
                          <View key={category.id} style={styles.talentGigCategoryChip}>
                            <Text style={styles.talentGigCategoryLabel}>{category.name}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.talentStatusCard}>
                    <Text style={styles.talentStatusLabel}>Your current status</Text>
                    <Text style={styles.talentStatusValue}>
                      {getInterestStatusLabel(selectedGig.my_interest_status) || selectedGig.my_interest_status}
                    </Text>
                    <Text style={styles.talentStatusBody}>
                      {selectedGig.my_interest_status === "invited"
                        ? "The organizer wants to move forward with you. Open messages to align on next steps."
                        : selectedGig.my_interest_status === "shortlisted"
                          ? "You are in the organizer's preferred pool for this gig."
                          : selectedGig.my_interest_status === "declined"
                            ? "The organizer has closed this application for the current gig."
                            : "Your interest has been submitted and is awaiting organizer review."}
                    </Text>
                    {selectedGig.my_interest_status === "invited" ? (
                      <PrimaryButton
                        label="Open messages"
                        onPress={() => {
                          setInterestOpen(false);
                          onNavigateTab("messages");
                        }}
                      />
                    ) : null}
                  </View>
                </View>
              ) : (
                <View style={styles.gigContextCard}>
                  <Text style={styles.gigContextTitle}>{selectedGig.title}</Text>
                  <Text style={styles.gigContextMeta}>
                    {selectedGig.city}, {selectedGig.region} • {selectedGig.event_date}
                  </Text>
                  {selectedGig.description ? <Text style={styles.gigDetailBody}>{selectedGig.description}</Text> : null}
                  <Text style={styles.gigContextMeta}>Let the organizer know why you're the right fit.</Text>
                </View>
              )
            ) : null}
            {!talentResponseLocked ? (
              <>
                <TextField
                  label="Message to organizer"
                  value={interestForm.note}
                  onChangeText={(value) => setInterestForm((current) => ({ ...current, note: value }))}
                  multiline
                />
                <TextField
                  label="Proposed amount (GHS)"
                  value={interestForm.proposedAmount}
                  onChangeText={(value) => setInterestForm((current) => ({ ...current, proposedAmount: value }))}
                  keyboardType="phone-pad"
                />
              </>
            ) : null}
            {interestError ? <Text style={styles.error}>{interestError}</Text> : null}
            {!talentResponseLocked ? (
              <PrimaryButton
                label={submitting ? "Sending..." : "Submit interest"}
                onPress={() => {
                  if (!selectedGig) return;
                  void (async () => {
                    setSubmitting(true);
                    setInterestError(null);
                    try {
                      await api.showInterestInGig(token, selectedGig.id, {
                        note: interestForm.note || undefined,
                        proposed_amount: interestForm.proposedAmount || null,
                      });
                      await marketplace.refresh();
                      setInterestOpen(false);
                      setInterestForm({ note: "", proposedAmount: "" });
                    } catch (caught) {
                      setInterestError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to submit interest.");
                    } finally {
                      setSubmitting(false);
                    }
                  })();
                }}
              />
            ) : null}
            <View style={styles.formBottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" visible={organizerGigOpen} onRequestClose={() => setOrganizerGigOpen(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <View style={styles.modalAccentBar} />
              <Text style={styles.modalTitle}>Gig applicants</Text>
            </View>
            <Pressable onPress={() => setOrganizerGigOpen(false)} style={styles.closeButton}>
              <Text style={styles.modalClose}>✕ Close</Text>
            </Pressable>
          </View>
          {gigDetail ? (
            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.helperText}>{gigDetail.title}</Text>
              <Text style={styles.helperSubtext}>
                {gigDetail.city}, {gigDetail.region} • {gigDetail.event_date}
              </Text>
              <View style={styles.statusSummaryRow}>
                {([
                  ["interested", "Interested"],
                  ["shortlisted", "Shortlisted"],
                  ["invited", "Invited"],
                  ["declined", "Declined"],
                ] as const).map(([key, label]) => (
                  <Pressable
                    key={key}
                    onPress={() => setActiveApplicantTab(key)}
                    style={[styles.statusSummaryPill, activeApplicantTab === key ? styles.statusSummaryPillActive : undefined]}
                  >
                    <Text style={[styles.statusSummaryLabel, activeApplicantTab === key ? styles.statusSummaryLabelActive : undefined]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {gigDetail.interests.length === 0 ? <Text style={styles.helperSubtext}>No interests yet for this gig.</Text> : null}
              {gigDetail.interests.length > 0 ? (
                <View style={styles.statusSection}>
                  <Text style={styles.statusSectionTitle}>
                    {activeApplicantTab.charAt(0).toUpperCase() + activeApplicantTab.slice(1)}
                  </Text>
                  {activeTabInterests.length === 0 ? (
                    <Text style={styles.helperSubtext}>No applicants in this state yet.</Text>
                  ) : null}
                  {activeTabInterests.map((interest) => (
                    <View key={interest.id} style={styles.interestCard}>
                  <Text style={styles.interestName}>{interest.display_name || interest.talent_username}</Text>
                  <Text style={styles.interestMeta}>
                    {interest.status} {interest.proposed_amount ? `• GHS ${Number(interest.proposed_amount).toLocaleString()}` : ""}
                  </Text>
                  <Text style={styles.interestNote}>{interest.note || "No note provided."}</Text>
                  {interest.status === "interested" || interest.status === "shortlisted" ? (
                    <View style={styles.decisionRow}>
                      {interest.status === "interested" ? (
                        <Pressable
                          style={[styles.decisionButton, styles.decisionButtonShortlist]}
                          onPress={() => setDecisionTarget({ interest, status: "shortlisted" })}
                        >
                          <Text style={[styles.decisionButtonLabel, styles.decisionButtonLabelDark]}>Shortlist</Text>
                        </Pressable>
                      ) : (
                        <View style={[styles.decisionButton, styles.decisionButtonCurrentState]}>
                          <Text style={[styles.decisionButtonLabel, styles.decisionButtonLabelDark]}>Shortlisted</Text>
                        </View>
                      )}
                      <Pressable
                        style={[styles.decisionButton, styles.decisionButtonInvite]}
                        onPress={() => setDecisionTarget({ interest, status: "invited" })}
                      >
                        <Text style={[styles.decisionButtonLabel, styles.decisionButtonLabelDark]}>Invite</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.decisionButton, styles.decisionButtonDecline]}
                        onPress={() => setDecisionTarget({ interest, status: "declined" })}
                      >
                        <Text style={[styles.decisionButtonLabel, styles.decisionButtonLabelDark]}>Decline</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.decisionLockedCard}>
                      <Text style={styles.decisionLockedTitle}>
                        {interest.status === "shortlisted"
                          ? "Talent shortlisted"
                          : interest.status === "invited"
                            ? "Invitation sent"
                            : "Talent declined"}
                      </Text>
                      <Text style={styles.decisionLockedBody}>
                        {interest.status === "shortlisted"
                          ? "This applicant has already been shortlisted for this gig."
                          : interest.status === "invited"
                            ? "This applicant has already been invited to move forward."
                        : "This applicant has already been declined for this gig."}
                      </Text>
                    </View>
                  )}
                      <View style={[styles.followupActions, interest.status === "invited" ? styles.followupActionsRow : undefined]}>
                        <View style={styles.followupActionPrimary}>
                          <SecondaryButton
                            label="View profile"
                            onPress={() => {
                              setProfileTarget(interest);
                            }}
                          />
                        </View>
                        {interest.status === "invited" ? (
                          <Pressable
                            style={styles.convertBookingButton}
                            onPress={() => {
                              setSelectedInterest(interest);
                              setConvertForm({
                                quotedAmount: interest.proposed_amount || "",
                                depositAmount: "",
                                balanceAmount: "",
                                notes: "",
                              });
                            }}
                          >
                            <Text style={styles.convertBookingButtonLabel}>Book</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {selectedInterest ? (
                <View style={styles.convertCard}>
                  <Text style={styles.interestName}>Convert {selectedInterest.display_name || selectedInterest.talent_username}</Text>
                  <TextField
                    label="Quoted amount"
                    value={convertForm.quotedAmount}
                    onChangeText={(value) => setConvertForm((current) => ({ ...current, quotedAmount: value }))}
                    keyboardType="phone-pad"
                  />
                  <TextField
                    label="Deposit amount"
                    value={convertForm.depositAmount}
                    onChangeText={(value) => setConvertForm((current) => ({ ...current, depositAmount: value }))}
                    keyboardType="phone-pad"
                  />
                  <TextField
                    label="Balance amount"
                    value={convertForm.balanceAmount}
                    onChangeText={(value) => setConvertForm((current) => ({ ...current, balanceAmount: value }))}
                    keyboardType="phone-pad"
                  />
                  <TextField
                    label="Notes"
                    value={convertForm.notes}
                    onChangeText={(value) => setConvertForm((current) => ({ ...current, notes: value }))}
                    multiline
                  />
                  <PrimaryButton
                    label={submitting ? "Converting..." : "Create booking"}
                    onPress={() => {
                      void handleConvertInterest();
                    }}
                  />
                </View>
              ) : null}
              {gigDetailError ? <Text style={styles.error}>{gigDetailError}</Text> : null}
            </ScrollView>
          ) : (
            <Text style={styles.helperSubtext}>Loading gig details...</Text>
          )}
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={Boolean(decisionTarget)} onRequestClose={() => setDecisionTarget(null)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>
              {decisionTarget ? getDecisionCopy(decisionTarget.status).title : "Confirm action"}
            </Text>
            <Text style={styles.confirmBody}>
              {decisionTarget ? getDecisionCopy(decisionTarget.status).body : ""}
            </Text>
            <View style={styles.confirmActions}>
              <SecondaryButton label="Cancel" onPress={() => setDecisionTarget(null)} />
              <PrimaryButton
                label={submitting ? "Applying..." : "Confirm"}
                onPress={() => {
                  if (!decisionTarget) return;
                  void (async () => {
                    const target = decisionTarget;
                    setDecisionTarget(null);
                    await handleInterestStatus(target.interest, target.status);
                  })();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" visible={Boolean(profileTarget)} onRequestClose={() => setProfileTarget(null)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <View style={styles.modalAccentBar} />
              <Text style={styles.modalTitle}>Talent profile</Text>
            </View>
            <Pressable onPress={() => setProfileTarget(null)} style={styles.closeButton}>
              <Text style={styles.modalClose}>✕ Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalForm}>
            {viewedTalentProfile ? (
              <View style={styles.profilePreviewCard}>
                <Text style={styles.interestName}>
                  {viewedTalentProfile.display_name || viewedTalentProfile.stage_name || viewedTalentProfile.username}
                </Text>
                <Text style={styles.profilePreviewMeta}>
                  {viewedTalentProfile.primary_category?.name || "Creative talent"} • {[viewedTalentProfile.city, viewedTalentProfile.region].filter(Boolean).join(", ") || "Location not set"}
                </Text>
                <Text style={styles.profilePreviewBody}>
                  {viewedTalentProfile.bio || "This talent has not added a bio yet."}
                </Text>
                <View style={styles.profilePreviewStats}>
                  <View style={styles.profilePreviewStat}>
                    <Text style={styles.profilePreviewStatValue}>
                      {viewedTalentProfile.years_of_experience ? `${viewedTalentProfile.years_of_experience}` : "0"}
                    </Text>
                    <Text style={styles.profilePreviewStatLabel}>Years</Text>
                  </View>
                  <View style={styles.profilePreviewStat}>
                    <Text style={styles.profilePreviewStatValue}>{viewedTalentProfile.booking_count}</Text>
                    <Text style={styles.profilePreviewStatLabel}>Bookings</Text>
                  </View>
                  <View style={styles.profilePreviewStat}>
                    <Text style={styles.profilePreviewStatValue}>{Number(viewedTalentProfile.average_rating || 0).toFixed(1)}</Text>
                    <Text style={styles.profilePreviewStatLabel}>Rating</Text>
                  </View>
                </View>
                <Text style={styles.profilePreviewRate}>
                  {viewedTalentProfile.fixed_price_min && viewedTalentProfile.fixed_price_max
                    ? `Typical range: GHS ${Number(viewedTalentProfile.fixed_price_min).toLocaleString()} - ${Number(viewedTalentProfile.fixed_price_max).toLocaleString()}`
                    : viewedTalentProfile.fixed_price_min
                      ? `Typical range: from GHS ${Number(viewedTalentProfile.fixed_price_min).toLocaleString()}`
                      : "Pricing available on request"}
                </Text>
              </View>
            ) : (
              <Text style={styles.helperSubtext}>Talent profile details are not available yet.</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );

  async function openOrganizerGig(gigId: string) {
    setOrganizerGigOpen(true);
    setGigDetailError(null);
    setGigDetail(null);
    setSelectedInterest(null);
    setActiveApplicantTab("interested");
    try {
      const detail = await api.gigDetail(token, gigId);
      setGigDetail(detail);
    } catch (caught) {
      setGigDetailError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to load gig details.");
    }
  }

  async function handleInterestStatus(interest: GigInterestItem, status: "shortlisted" | "invited" | "declined") {
    setSubmitting(true);
    setGigDetailError(null);
    try {
      const response = (await api.updateGigInterestStatus(token, interest.id, { status })) as {
        conversation?: { id: string } | null;
      };
      if (gigDetail) {
        const detail = await api.gigDetail(token, gigDetail.id);
        setGigDetail(detail);
      }
      setActiveApplicantTab(status);
      if (response?.conversation) {
        setFocusedConversationId(response.conversation.id);
        setHandoffMessage(`Conversation is ready after you ${status} this talent.`);
      }
      await marketplace.refresh();
    } catch (caught) {
      setGigDetailError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to update interest.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConvertInterest() {
    if (!selectedInterest || !gigDetail) return;
    setSubmitting(true);
    setGigDetailError(null);
    try {
      const response = (await api.convertGigInterestToBooking(token, selectedInterest.id, {
        quoted_amount: convertForm.quotedAmount || undefined,
        deposit_amount: convertForm.depositAmount || undefined,
        balance_amount: convertForm.balanceAmount || undefined,
        notes: convertForm.notes || undefined,
      })) as {
        booking?: { id: string };
        conversation?: { id: string } | null;
      };
      const detail = await api.gigDetail(token, gigDetail.id);
      setGigDetail(detail);
      setSelectedInterest(null);
      if (response.booking?.id) {
        setFocusedBookingId(response.booking.id);
      }
      if (response.conversation?.id) {
        setFocusedConversationId(response.conversation.id);
      }
      setHandoffMessage("Booking request created from this gig interest.");
      await marketplace.refresh();
    } catch (caught) {
      setGigDetailError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to convert interest.");
    } finally {
      setSubmitting(false);
    }
  }
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing[2],
    paddingTop: theme.spacing[3],
  },
  headerBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.semanticColors.accentSoft,
  },
  headerBadgeText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.colors.gold[600],
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
  heroActions: {
    gap: theme.spacing[3],
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
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: 0,
    gap: theme.spacing[4],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: theme.spacing[8],
    paddingBottom: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.semanticColors.borderSoft,
  },
  modalTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  modalAccentBar: {
    width: 4,
    height: 24,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.semanticColors.primary,
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size["2xl"],
    color: theme.semanticColors.textPrimary,
  },
  closeButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.stone[100],
  },
  modalClose: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  modalForm: {
    gap: theme.spacing[5],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[10],
  },
  fieldGroupCard: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    backgroundColor: theme.semanticColors.surface,
    padding: theme.spacing[4],
    gap: theme.spacing[4],
  },
  fieldGroupLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  categoryChip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.stone[100],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.ink[900],
    borderColor: theme.colors.gold[400],
  },
  categoryChipLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  categoryChipLabelActive: {
    color: theme.semanticColors.textOnDark,
  },
  budgetRow: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  budgetField: {
    flex: 1,
  },
  formBottomSpacer: {
    height: theme.spacing[4],
  },
  error: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.danger,
  },
  helperText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  helperSubtext: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textMuted,
  },
  statusSummaryRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  statusSummaryPill: {
    flex: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.stone[100],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    alignItems: "center",
  },
  statusSummaryPillActive: {
    backgroundColor: theme.colors.ink[900],
    borderColor: theme.colors.gold[400],
  },
  statusSummaryLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textSecondary,
  },
  statusSummaryLabelActive: {
    color: theme.semanticColors.textOnDark,
  },
  statusSection: {
    gap: theme.spacing[3],
  },
  statusSectionTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
  },
  handoffCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    backgroundColor: "#FFF7F2",
    borderWidth: 1,
    borderColor: theme.semanticColors.primary,
    gap: theme.spacing[2],
  },
  handoffTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  handoffBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  handoffLink: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.primary,
  },
  interestCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    gap: theme.spacing[2],
  },
  interestName: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  interestMeta: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  interestNote: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  decisionRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  decisionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[2],
  },
  decisionButtonShortlist: {
    backgroundColor: "#F7EED6",
    borderWidth: 1,
    borderColor: theme.colors.gold[300],
  },
  decisionButtonInvite: {
    backgroundColor: "#E4F1EE",
    borderWidth: 1,
    borderColor: theme.colors.teal[300],
  },
  decisionButtonDecline: {
    backgroundColor: "#FCEAE5",
    borderWidth: 1,
    borderColor: theme.colors.ember[300],
  },
  decisionButtonCurrentState: {
    backgroundColor: theme.colors.stone[100],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  decisionButtonLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
  },
  decisionButtonLabelDark: {
    color: theme.colors.ink[900],
  },
  decisionLockedCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    backgroundColor: theme.colors.stone[100],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    gap: theme.spacing[1],
  },
  decisionLockedTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  decisionLockedBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  followupActions: {
    gap: theme.spacing[3],
  },
  followupActionsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: theme.spacing[3],
  },
  followupActionPrimary: {
    flex: 1,
  },
  convertBookingButton: {
    flex: 1,
    minHeight: theme.layout.buttonHeight,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.teal[600],
    borderWidth: 1,
    borderColor: theme.colors.teal[600],
  },
  convertBookingButtonLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textOnDark,
    letterSpacing: 0.2,
  },
  convertCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    backgroundColor: "#FFF7F2",
    borderWidth: 1,
    borderColor: theme.colors.ember[300],
    gap: theme.spacing[4],
    ...theme.shadows.card,
  },
  gigContextCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    backgroundColor: theme.semanticColors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.gold[300],
    gap: theme.spacing[1],
  },
  talentGigDetailStack: {
    gap: theme.spacing[4],
  },
  talentGigHeroCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    gap: theme.spacing[3],
    ...theme.shadows.card,
  },
  talentGigHeroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing[3],
  },
  talentGigHeroText: {
    flex: 1,
    gap: theme.spacing[1],
  },
  talentGigUrgencyPill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
    backgroundColor: "#F2FAF4",
    borderWidth: 1,
    borderColor: "#D7E8DA",
  },
  talentGigUrgencyPillUrgent: {
    backgroundColor: "#FFF3EE",
    borderColor: theme.colors.ember[300],
  },
  talentGigUrgencyLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: "#46724C",
  },
  talentGigUrgencyLabelUrgent: {
    color: theme.colors.ember[600],
  },
  talentGigFactsRow: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  talentGigFactCard: {
    flex: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    backgroundColor: theme.colors.stone[50],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    gap: theme.spacing[1],
  },
  talentGigFactCardFull: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    backgroundColor: "#FFF7F2",
    borderWidth: 1,
    borderColor: theme.colors.ember[300],
    gap: theme.spacing[1],
  },
  talentGigFactLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  talentGigFactValue: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textPrimary,
  },
  talentGigBudgetValue: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
  },
  talentGigSectionCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    gap: theme.spacing[3],
  },
  talentGigSectionTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  talentGigCategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  talentGigCategoryChip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
    backgroundColor: "#F6F1E8",
    borderWidth: 1,
    borderColor: "#E4D8C8",
  },
  talentGigCategoryLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.xs,
    color: "#6A6258",
  },
  gigContextTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  gigContextMeta: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  gigDetailBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  talentStatusCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    backgroundColor: "#FFF7F2",
    borderWidth: 1,
    borderColor: theme.colors.ember[300],
    gap: theme.spacing[2],
  },
  talentStatusLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.colors.ember[600],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  talentStatusValue: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
  },
  talentStatusBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 19, 21, 0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing[5],
  },
  confirmCard: {
    width: "100%",
    borderRadius: theme.radius.xl,
    backgroundColor: theme.semanticColors.surface,
    padding: theme.spacing[5],
    gap: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.floating,
  },
  confirmTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
    color: theme.semanticColors.textPrimary,
  },
  confirmBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  confirmActions: {
    gap: theme.spacing[3],
  },
  profilePreviewCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    gap: theme.spacing[3],
    ...theme.shadows.card,
  },
  profilePreviewMeta: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  profilePreviewBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  profilePreviewStats: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  profilePreviewStat: {
    flex: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[3],
    backgroundColor: theme.semanticColors.surfaceMuted,
    gap: theme.spacing[1],
  },
  profilePreviewStatValue: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
  },
  profilePreviewStatLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
  },
  profilePreviewRate: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.colors.ember[600],
  },
});
