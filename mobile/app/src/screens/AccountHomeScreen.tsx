import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useMarketplaceData } from "../hooks/useMarketplaceData";
import { Capability, UserSummary } from "../services/api/types";
import { Screen } from "../components/Screen";
import { TopBar } from "../components/TopBar";
import { WorkspaceSetupPanel } from "./WorkspaceSetupScreen";
import { theme } from "../theme/theme";

type AccountHomeScreenProps = {
  activeTab: "discover" | "gigs" | "messages" | "bookings";
  capabilities: Capability[];
  currentUser: UserSummary;
  marketplace: ReturnType<typeof useMarketplaceData>;
  token: string;
  onCapabilityAdded: (user: UserSummary) => void;
  onOpenProfile: () => void;
  onWorkspacePress: () => void;
};

export function AccountHomeScreen({
  activeTab,
  capabilities,
  currentUser,
  marketplace,
  token,
  onCapabilityAdded,
  onOpenProfile,
  onWorkspacePress,
}: AccountHomeScreenProps) {
  return (
    <Screen>
      <TopBar
        unreadCount={marketplace.unreadCount}
        workspaceLabel="Account"
        onWorkspacePress={onWorkspacePress}
      />
      {activeTab === "discover" || activeTab === "gigs" ? (
        <>
          <LinearGradient colors={["#FFF2CF", "#FFE3D8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="compass-outline" size={25} color={theme.semanticColors.textOnDark} />
            </View>
            <Text style={styles.eyebrow}>Personal account</Text>
            <Text style={styles.title}>Explore first. Choose your workspace when ready.</Text>
            <Text style={styles.body}>
              Welcome, {currentUser.username}. Browse public opportunities and profiles, then create a workspace when you are ready.
            </Text>
          </LinearGradient>
          <WorkspaceSetupPanel token={token} capabilities={capabilities} categories={marketplace.categories} onCapabilityAdded={onCapabilityAdded} />
          <View style={styles.publicSection}>
            <Text style={styles.sectionTitle}>{activeTab === "gigs" ? "Public opportunities" : "Explore the marketplace"}</Text>
            <Text style={styles.sectionBody}>
              {marketplace.gigs.length} opportunity gigs and {marketplace.talents.length} public talent profiles are currently available.
            </Text>
            <View style={styles.previewList}>
              {marketplace.gigs.slice(0, 3).map((gig) => (
                <View key={gig.id} style={styles.previewCard}>
                  <MaterialCommunityIcons name="calendar-star-outline" size={19} color={theme.colors.gold[500]} />
                  <View style={styles.previewCopy}>
                    <Text style={styles.previewTitle} numberOfLines={1}>{gig.title}</Text>
                    <Text style={styles.previewMeta} numberOfLines={1}>{gig.city || "Ghana"} · {gig.event_type_name || "Opportunity gig"}</Text>
                  </View>
                </View>
              ))}
              {!marketplace.loading && marketplace.gigs.length === 0 ? <Text style={styles.empty}>No public opportunities yet.</Text> : null}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.lockedCard}>
          <MaterialCommunityIcons name={activeTab === "messages" ? "message-text-outline" : "clipboard-text-outline"} size={28} color={theme.colors.gold[500]} />
          <Text style={styles.sectionTitle}>{activeTab === "messages" ? "Messages" : "Bookings"}</Text>
          <Text style={styles.sectionBody}>Create the relevant profile to start using {activeTab} actions. Your account is ready whenever you are.</Text>
          <Pressable onPress={onOpenProfile} style={styles.linkButton}>
            <Text style={styles.linkLabel}>Open workspace setup</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color={theme.semanticColors.primary} />
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: theme.spacing[1],
    gap: theme.spacing[2],
    padding: theme.spacing[5],
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    ...theme.shadows.floating,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.gold[500],
  },
  eyebrow: {
    marginTop: theme.spacing[2],
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["2xl"],
    lineHeight: theme.typography.lineHeight["2xl"],
    color: theme.semanticColors.textPrimary,
  },
  body: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  publicSection: {
    gap: theme.spacing[2],
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
    color: theme.semanticColors.textPrimary,
  },
  sectionBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  previewList: {
    gap: theme.spacing[2],
    marginTop: theme.spacing[2],
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  previewCopy: {
    flex: 1,
    gap: 3,
  },
  previewTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  previewMeta: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
  },
  empty: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textMuted,
  },
  lockedCard: {
    gap: theme.spacing[3],
    padding: theme.spacing[5],
    borderRadius: theme.radius.xl,
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.card,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    alignSelf: "flex-start",
    paddingTop: theme.spacing[2],
  },
  linkLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.primary,
  },
});
