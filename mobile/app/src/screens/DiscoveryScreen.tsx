import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { UserRole } from "../AppShell";
import { useMarketplaceData } from "../hooks/useMarketplaceData";
import { TalentDetailItem, TalentListItem, UserSummary } from "../services/api/types";
import { api } from "../services/api";
import { ApiError } from "../services/api/client";
import { GigCard } from "../components/GigCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { TalentCard } from "../components/TalentCard";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { TopBar } from "../components/TopBar";
import { ModalSurface } from "../components/ModalSurface";
import { theme } from "../theme/theme";

type DiscoveryScreenProps = {
  role: UserRole;
  currentUser: UserSummary;
  token: string;
  onNavigateTab: (tab: "discover" | "gigs" | "messages" | "bookings" | "profile") => void;
  onWorkspacePress?: () => void;
  onOpenGig?: (gigId: string) => void;
  marketplace: ReturnType<typeof useMarketplaceData>;
};

export function DiscoveryScreen({ role, token, onNavigateTab, onWorkspacePress, onOpenGig, marketplace }: DiscoveryScreenProps) {
  const [inboxOpen, setInboxOpen] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [talentResults, setTalentResults] = useState<TalentListItem[]>([]);
  const [talentSearchLoading, setTalentSearchLoading] = useState(false);
  const [talentSearchError, setTalentSearchError] = useState<string | null>(null);
  const [selectedTalent, setSelectedTalent] = useState<TalentDetailItem | null>(null);
  const [selectedTalentSummary, setSelectedTalentSummary] = useState<TalentListItem | null>(null);
  const [talentDetailLoading, setTalentDetailLoading] = useState(false);
  const [talentDetailError, setTalentDetailError] = useState<string | null>(null);

  async function openTalentDetail(talent: TalentListItem) {
    setSelectedTalentSummary(talent);
    setTalentDetailLoading(true);
    setTalentDetailError(null);
    try {
      setSelectedTalent(await api.talentDetail(talent.id));
    } catch (caught) {
      setTalentDetailError(caught instanceof ApiError ? caught.message : "Unable to load this talent profile.");
    } finally {
      setTalentDetailLoading(false);
    }
  }

  useEffect(() => {
    if (role !== "client") return;

    let cancelled = false;
    const timeout = setTimeout(() => {
      setTalentSearchLoading(true);
      setTalentSearchError(null);
      void api
        .talents(search, activeCategoryId)
        .then((results) => {
          if (!cancelled) setTalentResults(results);
        })
        .catch((caught) => {
          if (!cancelled) {
            setTalentSearchError(caught instanceof ApiError ? caught.message : "Unable to search talents right now.");
          }
        })
        .finally(() => {
          if (!cancelled) setTalentSearchLoading(false);
        });
    }, search.trim() ? 350 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [activeCategoryId, role, search]);

  const filteredTalents = role === "client" ? talentResults : marketplace.talents;
  const filteredGigs = marketplace.gigs.filter((gig) => {
    if (role !== "talent") return false;
    const matchesSearch = [gig.title, gig.description, gig.city, gig.region, gig.event_type_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesSearch;
  });
  const talents = filteredTalents.slice(0, 5);
  const gigs = filteredGigs.slice(0, 4);
  const roleSummary =
    role === "client"
      ? {
          heroColors: ["#211814", "#141618"] as const,
          eyebrow: "Organizer control room",
          heroTitle: "Build the right team for church services, weddings, and live programs.",
          heroBody:
            "Post needs, review talent responses, and move your strongest matches into bookings without losing the thread.",
          searchTitle: "Who do you want to hire?",
          searchPlaceholder: "Search keyboardists, worship leaders, MCs, brass sections...",
          featuredTitle: "Recommended talents",
          gigsTitle: "",
          gigsAction: "Manage gigs",
          heroStats: [
            { value: `${marketplace.gigs.length}`, label: "open gigs" },
            { value: `${marketplace.bookings.length}`, label: "active hires" },
          ],
          heroCta: "Manage opportunity gigs",
        }
      : {
          heroColors: ["#182324", "#141618"] as const,
          eyebrow: "Talent performance hub",
          heroTitle: "Find the next stage, service, or event that fits your sound.",
          heroBody:
            "Track open gigs, show your best work, and respond quickly when organizers are ready to move.",
          searchTitle: "Which opportunity fits you?",
          searchPlaceholder: "Search gigs, cities, worship events, and live opportunities...",
          featuredTitle: "Talent benchmark",
          gigsTitle: "Open gigs near you",
          gigsAction: "Browse board",
          heroStats: [
            { value: `${marketplace.gigs.length}`, label: "matching gigs" },
            { value: `${marketplace.bookings.length}`, label: "active bookings" },
          ],
          heroCta: "Manage portfolio",
        };

  if (selectedTalent || talentDetailLoading || talentDetailError) {
    return (
      <TalentDetailScreen
        talent={selectedTalent}
        loading={talentDetailLoading}
        error={talentDetailError}
        onBack={() => {
          setSelectedTalent(null);
          setSelectedTalentSummary(null);
          setTalentDetailError(null);
        }}
        onRetry={() => {
          if (selectedTalentSummary) void openTalentDetail(selectedTalentSummary);
        }}
      />
    );
  }

  return (
    <Screen>
      <TopBar
        unreadCount={marketplace.unreadCount}
        onNotificationPress={() => setInboxOpen(true)}
        workspaceLabel={role === "client" ? "Organizer" : "Talent"}
        onWorkspacePress={onWorkspacePress}
      />

      <LinearGradient colors={roleSummary.heroColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <Text style={styles.heroEyebrow}>{roleSummary.eyebrow}</Text>
        <Text style={styles.heroTitle}>{roleSummary.heroTitle}</Text>
        <Text style={styles.heroBody}>{roleSummary.heroBody}</Text>
        <View style={styles.heroStats}>
          {roleSummary.heroStats.map((item) => (
            <View key={item.label} style={styles.metricPill}>
              <Text style={styles.metricValue}>{item.value}</Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
        <PrimaryButton
          label={roleSummary.heroCta}
          onPress={() => {
            if (role === "client") {
              onNavigateTab("gigs");
              return;
            }
            onNavigateTab("profile");
          }}
        />
      </LinearGradient>

      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>{roleSummary.searchTitle}</Text>
        <TextInput
          placeholder={roleSummary.searchPlaceholder}
          placeholderTextColor={theme.semanticColors.textMuted}
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
        {role === "client" ? (
          <View style={styles.categoryFilterGroup}>
            <Text style={styles.categoryFilterLabel}>Filter by skill</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryFilters}
            >
              <Pressable
                onPress={() => setActiveCategoryId("")}
                style={[styles.categoryFilter, !activeCategoryId ? styles.categoryFilterActive : undefined]}
              >
                <Text style={[styles.categoryFilterText, !activeCategoryId ? styles.categoryFilterTextActive : undefined]}>
                  All skills
                </Text>
              </Pressable>
              {marketplace.categories.map((category) => {
                const isActive = activeCategoryId === category.id;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setActiveCategoryId(category.id)}
                    style={[styles.categoryFilter, isActive ? styles.categoryFilterActive : undefined]}
                  >
                    <Text style={[styles.categoryFilterText, isActive ? styles.categoryFilterTextActive : undefined]}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
        {role === "client" && talentSearchLoading ? <Text style={styles.searchStatus}>Searching the talent directory...</Text> : null}
        {role === "client" && talentSearchError ? <Text style={styles.errorText}>{talentSearchError}</Text> : null}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={role === "client" && (search.trim() || activeCategoryId) ? "Talent search results" : roleSummary.featuredTitle}
          action={role === "client" ? "See all" : "Compare"}
        />
        {talents.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {talents.map((talent) => (
              <TalentCard
                key={talent.id}
                name={talent.display_name || talent.stage_name || talent.username}
                imageUri={talent.profile_image_url}
                title={talent.primary_category?.name ? `${talent.primary_category.name} ready for live bookings` : "Creative talent ready for live bookings"}
                city={talent.city || talent.region || "Ghana"}
                rate={formatRate(talent.fixed_price_min, talent.fixed_price_max)}
                rating={Number(talent.average_rating || 0)}
                jobs={talent.booking_count}
                verified={Boolean(talent.is_featured)}
                tags={[
                  talent.primary_category?.name ?? "Talent",
                  talent.region || "Live",
                  talent.years_of_experience ? `${talent.years_of_experience} yrs` : "Available",
                ]}
                onPress={() => {
                  void openTalentDetail(talent);
                }}
              />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>
            {search.trim() || activeCategoryId ? "No talents match these filters yet." : "No talents available yet."}
          </Text>
        )}
      </View>

      {role === "talent" ? (
        <View style={styles.section}>
          <SectionHeader title={roleSummary.gigsTitle} action={roleSummary.gigsAction} />
          <View style={styles.gigList}>
            {gigs.map((gig) => (
              <Pressable key={gig.id} onPress={() => onOpenGig?.(gig.id)}>
                <GigCard
                  title={gig.title}
                  venue={[gig.city, gig.region].filter(Boolean).join(", ")}
                  timing={formatEventMoment(gig.event_date, gig.start_time)}
                  budget={formatBudget(gig.currency_code, gig.budget_min, gig.budget_max)}
                  urgency={gig.is_urgent ? "Urgent" : "Open"}
                  roles={gig.required_categories.map((item) => item.name)}
                  metaLabel="Tap to view opportunity details."
                />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Modal animationType="slide" visible={inboxOpen} onRequestClose={() => setInboxOpen(false)}>
        <ModalSurface style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Notification inbox</Text>
              <Text style={styles.modalSubtitle}>
                Unread {marketplace.unreadCount} • {marketplace.notificationSocketConnected ? "Live" : "Reconnecting"}
              </Text>
            </View>
            <Pressable onPress={() => setInboxOpen(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.notificationList}>
            {marketplace.notifications.map((notification) => (
              <Pressable
                key={notification.id}
                onPress={() => {
                  void (async () => {
                    if (notification.read_at) return;
                    try {
                      await api.markNotificationRead(token, notification.id);
                      marketplace.markNotificationReadLocal(notification.id);
                    } catch (caught) {
                      setNotificationError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to mark notification as read.");
                    }
                  })();
                }}
              >
                <View style={[styles.notificationRow, !notification.read_at ? styles.notificationUnread : undefined]}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationBody}>{notification.body}</Text>
                  <Text style={styles.notificationMeta}>
                    {formatTimeAgo(notification.created_at)}
                    {notification.read_at ? " • Read" : " • Tap to mark read"}
                  </Text>
                </View>
              </Pressable>
            ))}
            {notificationError ? <Text style={styles.errorText}>{notificationError}</Text> : null}
          </ScrollView>
        </ModalSurface>
      </Modal>

    </Screen>
  );
}

function formatRate(min?: string | null, max?: string | null) {
  if (min && max) {
    return `GHS ${Number(min).toLocaleString()} - ${Number(max).toLocaleString()}`;
  }
  if (min) {
    return `From GHS ${Number(min).toLocaleString()}`;
  }
  if (max) {
    return `Up to GHS ${Number(max).toLocaleString()}`;
  }
  return "Rate on request";
}

function TalentDetailScreen({
  talent,
  loading,
  error,
  onBack,
  onRetry,
}: {
  talent: TalentDetailItem | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <Screen>
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} style={styles.detailBackButton}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={theme.semanticColors.textPrimary} />
        </Pressable>
        <Text style={styles.detailHeaderTitle}>Talent profile</Text>
      </View>

      {loading ? (
        <View style={styles.detailLoading}>
          <ActivityIndicator size="large" color={theme.semanticColors.primary} />
          <Text style={styles.detailLoadingText}>Loading profile...</Text>
        </View>
      ) : error || !talent ? (
        <View style={styles.detailEmpty}>
          <MaterialCommunityIcons name="account-alert-outline" size={42} color={theme.semanticColors.primary} />
          <Text style={styles.detailEmptyTitle}>Profile unavailable</Text>
          <Text style={styles.detailEmptyBody}>{error || "This talent profile could not be found."}</Text>
          <PrimaryButton label="Try again" onPress={onRetry} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
          <LinearGradient colors={["#20252A", "#111315"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.detailHero}>
            <ProfileAvatar
              label={talent.display_name || talent.stage_name || talent.username}
              imageUri={talent.profile_image_url}
              size={104}
              borderRadius={52}
              style={styles.detailAvatar}
            />
            <Text style={styles.detailName}>{talent.display_name || talent.stage_name || talent.username}</Text>
            <Text style={styles.detailRole}>{talent.primary_category?.name || "Creative talent"}</Text>
            <Text style={styles.detailLocation}>
              {[talent.city, talent.region].filter(Boolean).join(", ") || "Location not set"}
            </Text>
            <View style={styles.detailStatsRow}>
              <View style={styles.detailStat}>
                <Text style={styles.detailStatValue}>{Number(talent.average_rating || 0).toFixed(1)}</Text>
                <Text style={styles.detailStatLabel}>Rating</Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={styles.detailStatValue}>{talent.booking_count}</Text>
                <Text style={styles.detailStatLabel}>Bookings</Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={styles.detailStatValue}>{talent.years_of_experience || 0}</Text>
                <Text style={styles.detailStatLabel}>Years</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.detailSectionCard}>
            <Text style={styles.detailSectionTitle}>About this talent</Text>
            <Text style={styles.detailBody}>{talent.profile.bio || talent.bio || "No bio has been added yet."}</Text>
          </View>

          <View style={styles.detailSectionCard}>
            <Text style={styles.detailSectionTitle}>Skills and event experience</Text>
            <View style={styles.detailChips}>
              {talent.skills.length > 0 ? talent.skills.map((skill) => (
                <View key={skill.id} style={styles.detailChip}>
                  <Text style={styles.detailChipLabel}>{skill.name}</Text>
                </View>
              )) : <Text style={styles.detailBody}>No skills added yet.</Text>}
            </View>
            {talent.event_types.length > 0 ? (
              <Text style={styles.detailMeta}>Experienced with {talent.event_types.map((item) => item.name).join(", ")}</Text>
            ) : null}
          </View>

          <View style={styles.detailSectionCard}>
            <Text style={styles.detailSectionTitle}>Engagement details</Text>
            <Text style={styles.detailMeta}>Typical rate: {formatRate(talent.fixed_price_min, talent.fixed_price_max)}</Text>
            <Text style={styles.detailMeta}>Response time: {talent.response_time_minutes || "Not specified"} minutes</Text>
            <Text style={styles.detailMeta}>Portfolio samples: {talent.media.length}</Text>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function formatBudget(currencyCode: string, min?: string | null, max?: string | null) {
  const symbol = currencyCode === "GHS" ? "GHS" : currencyCode;
  if (min && max) {
    return `${symbol} ${Number(min).toLocaleString()} - ${Number(max).toLocaleString()}`;
  }
  if (min) {
    return `From ${symbol} ${Number(min).toLocaleString()}`;
  }
  if (max) {
    return `Up to ${symbol} ${Number(max).toLocaleString()}`;
  }
  return `${symbol} Budget open`;
}

function formatEventMoment(date: string, startTime?: string | null) {
  return startTime ? `${date} at ${startTime.slice(0, 5)}` : date;
}

function formatTimeAgo(timestamp: string) {
  const then = new Date(timestamp).getTime();
  const now = Date.now();
  const diffMinutes = Math.max(1, Math.round((now - then) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  return `${Math.round(diffHours / 24)} day ago`;
}

const styles = StyleSheet.create({
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingTop: theme.spacing[2],
  },
  detailBackButton: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  detailHeaderTitle: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["2xl"],
    color: theme.semanticColors.textPrimary,
  },
  detailContent: {
    gap: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  detailHero: {
    alignItems: "center",
    borderRadius: theme.radius.xl,
    padding: theme.spacing[6],
    gap: theme.spacing[2],
    ...theme.shadows.floating,
  },
  detailAvatar: {
    borderWidth: 3,
    borderColor: theme.colors.gold[400],
  },
  detailName: {
    marginTop: theme.spacing[2],
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["2xl"],
    color: theme.semanticColors.textOnDark,
    textAlign: "center",
  },
  detailRole: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.colors.gold[300],
  },
  detailLocation: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: "rgba(255,255,255,0.72)",
  },
  detailStatsRow: {
    width: "100%",
    flexDirection: "row",
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
  detailStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing[3],
    borderRadius: theme.radius.lg,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  detailStatValue: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textOnDark,
  },
  detailStatLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: "rgba(255,255,255,0.68)",
  },
  detailSectionCard: {
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderRadius: theme.radius.xl,
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  detailSectionTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
  },
  detailBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.semanticColors.textSecondary,
  },
  detailMeta: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  detailChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  detailChip: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.stone[100],
  },
  detailChipLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  detailLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
  },
  detailLoadingText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textSecondary,
  },
  detailEmpty: {
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[10],
  },
  detailEmptyTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
    color: theme.semanticColors.textPrimary,
  },
  detailEmptyBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textSecondary,
    textAlign: "center",
  },
  heroCard: {
    overflow: "hidden",
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    gap: theme.spacing[3],
    ...theme.shadows.floating,
  },
  heroGlow: {
    position: "absolute",
    top: -48,
    right: -24,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(217, 181, 83, 0.18)",
  },
  heroEyebrow: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.colors.gold[300],
  },
  heroTitle: {
    maxWidth: 310,
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["2xl"],
    lineHeight: theme.typography.lineHeight["2xl"],
    color: theme.semanticColors.textOnDark,
  },
  heroBody: {
    maxWidth: 320,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: "rgba(255, 255, 255, 0.78)",
  },
  heroStats: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  metricPill: {
    flex: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[3],
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  metricValue: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.semanticColors.textOnDark,
  },
  metricLabel: {
    marginTop: theme.spacing[1],
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: "rgba(255, 255, 255, 0.74)",
  },
  searchCard: {
    borderRadius: theme.radius.xl,
    backgroundColor: theme.semanticColors.surface,
    padding: theme.spacing[4],
    gap: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.card,
  },
  searchTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
  },
  searchInput: {
    height: theme.layout.inputHeight,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.semanticColors.surfaceMuted,
    paddingHorizontal: theme.spacing[4],
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  searchStatus: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  categoryFilterGroup: {
    gap: theme.spacing[2],
  },
  categoryFilterLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  categoryFilters: {
    gap: theme.spacing[2],
    paddingRight: theme.spacing[4],
  },
  categoryFilter: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.stone[100],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  categoryFilterActive: {
    backgroundColor: theme.colors.ink[900],
    borderColor: theme.colors.ink[900],
  },
  categoryFilterText: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  categoryFilterTextActive: {
    color: theme.semanticColors.textOnDark,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textSecondary,
  },
  section: {
    gap: theme.spacing[3],
  },
  horizontalList: {
    gap: theme.spacing[3],
    paddingRight: theme.spacing[4],
  },
  gigList: {
    gap: theme.spacing[3],
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.danger,
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
    alignItems: "flex-start",
    paddingTop: theme.spacing[6],
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size["2xl"],
    color: theme.semanticColors.textPrimary,
  },
  modalSubtitle: {
    marginTop: theme.spacing[1],
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  modalClose: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.primary,
  },
  notificationList: {
    gap: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
  notificationRow: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    gap: theme.spacing[2],
  },
  notificationUnread: {
    borderColor: theme.semanticColors.primary,
    backgroundColor: "#FFF7F2",
  },
  notificationTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  notificationBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  notificationMeta: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
  },
});
