import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { UserRole } from "../AppShell";
import { useMarketplaceData } from "../hooks/useMarketplaceData";
import { UserSummary } from "../services/api/types";
import { api } from "../services/api";
import { ApiError } from "../services/api/client";
import { GigCard } from "../components/GigCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { TalentCard } from "../components/TalentCard";
import { TopBar } from "../components/TopBar";
import { theme } from "../theme/theme";

type DiscoveryScreenProps = {
  role: UserRole;
  currentUser: UserSummary;
  token: string;
  onNavigateTab: (tab: "discover" | "gigs" | "messages" | "bookings" | "profile") => void;
  marketplace: ReturnType<typeof useMarketplaceData>;
};

export function DiscoveryScreen({ role, token, onNavigateTab, marketplace }: DiscoveryScreenProps) {
  const [inboxOpen, setInboxOpen] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const filterOptions = ["All", "Church", "Wedding", "31st night", "Outdooring"];
  const filteredTalents = marketplace.talents.filter((talent) => {
    const haystack = [talent.display_name, talent.stage_name, talent.username, talent.city, talent.region, talent.primary_category?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });
  const filteredGigs = marketplace.gigs.filter((gig) => {
    const matchesSearch = [gig.title, gig.description, gig.city, gig.region, gig.event_type_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "All") return true;
    const haystack = [gig.title, gig.description, gig.event_type_name, ...gig.required_categories.map((item) => item.name)].join(" ").toLowerCase();
    return haystack.includes(activeFilter.toLowerCase());
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
          gigsTitle: "Your live hiring pipeline",
          gigsAction: "Manage gigs",
          heroStats: [
            { value: `${marketplace.gigs.length}`, label: "open gigs" },
            { value: `${marketplace.bookings.length}`, label: "active hires" },
          ],
          heroCta: "Manage open gigs",
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

  return (
    <Screen>
      <TopBar unreadCount={marketplace.unreadCount} onNotificationPress={() => setInboxOpen(true)} />

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
        <View style={styles.quickFilters}>
          {filterOptions.map((filter) => (
            <Pressable key={filter} onPress={() => setActiveFilter(filter)} style={[styles.quickFilter, activeFilter === filter ? styles.quickFilterActive : undefined]}>
              <Text style={[styles.quickFilterLabel, activeFilter === filter ? styles.quickFilterLabelActive : undefined]}>{filter}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title={roleSummary.featuredTitle} action={role === "client" ? "See all" : "Compare"} />
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
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader title={roleSummary.gigsTitle} action={roleSummary.gigsAction} />
        <View style={styles.gigList}>
          {gigs.map((gig) => (
            <GigCard
              key={gig.id}
              title={gig.title}
              venue={[gig.city, gig.region].filter(Boolean).join(", ")}
              timing={formatEventMoment(gig.event_date, gig.start_time)}
              budget={formatBudget(gig.currency_code, gig.budget_min, gig.budget_max)}
              urgency={gig.is_urgent ? "Urgent" : "Open"}
              roles={gig.required_categories.map((item) => item.name)}
            />
          ))}
        </View>
      </View>

      <Modal animationType="slide" visible={inboxOpen} onRequestClose={() => setInboxOpen(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Notification inbox</Text>
              <Text style={styles.modalSubtitle}>Unread {marketplace.unreadCount}</Text>
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
        </View>
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
  heroCard: {
    overflow: "hidden",
    borderRadius: theme.radius.xl,
    padding: theme.spacing[6],
    gap: theme.spacing[4],
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
    maxWidth: 290,
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["3xl"],
    lineHeight: theme.typography.lineHeight["3xl"],
    color: theme.semanticColors.textOnDark,
  },
  heroBody: {
    maxWidth: 300,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: "rgba(255, 255, 255, 0.78)",
  },
  heroStats: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  metricPill: {
    flex: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  metricValue: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size["2xl"],
    lineHeight: theme.typography.lineHeight["2xl"],
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
    padding: theme.spacing[5],
    gap: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.card,
  },
  searchTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
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
  quickFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  quickFilter: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.stone[100],
  },
  quickFilterActive: {
    backgroundColor: theme.colors.ink[900],
  },
  quickFilterLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  quickFilterLabelActive: {
    color: theme.semanticColors.textOnDark,
  },
  section: {
    gap: theme.spacing[4],
  },
  horizontalList: {
    gap: theme.spacing[4],
    paddingRight: theme.spacing[5],
  },
  gigList: {
    gap: theme.spacing[4],
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
