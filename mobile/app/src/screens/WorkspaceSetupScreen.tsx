import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../services/api";
import { ApiError } from "../services/api/client";
import { Capability, TalentCategory, UserSummary } from "../services/api/types";
import { CapabilitySetupModal, CapabilitySetupPayload } from "../components/CapabilitySetupModal";
import { Screen } from "../components/Screen";
import { theme } from "../theme/theme";

type WorkspaceSetupProps = {
  token: string;
  capabilities: Capability[];
  categories?: TalentCategory[];
  onCapabilityAdded: (user: UserSummary) => void;
};

export function WorkspaceSetupPanel({ token, capabilities, categories = [], onCapabilityAdded }: WorkspaceSetupProps) {
  const [loadingCapability, setLoadingCapability] = useState<Capability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupCapability, setSetupCapability] = useState<Capability | null>(null);

  async function createProfile(capability: Capability, payload: CapabilitySetupPayload) {
    setLoadingCapability(capability);
    setError(null);
    try {
      const user = await api.addCapability(token, capability, payload);
      onCapabilityAdded(user);
      setSetupCapability(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to create this profile.");
    } finally {
      setLoadingCapability(null);
    }
  }

  return (
    <View style={styles.setupPanel}>
      <View style={styles.setupHeader}>
        <View>
          <Text style={styles.eyebrow}>Your workspaces</Text>
          <Text style={styles.setupTitle}>Choose how you want to participate.</Text>
        </View>
        <MaterialCommunityIcons name="swap-horizontal-circle-outline" size={28} color={theme.colors.gold[500]} />
      </View>
      <Text style={styles.setupBody}>
        Profiles are added to this account. You can create one now and add the other later without signing up again.
      </Text>
      <View style={styles.optionList}>
        <WorkspaceOption
          capability="talent"
          title="Talent profile"
          description="Show your work, discover opportunities, and respond to bookings."
          exists={capabilities.includes("talent")}
          loading={loadingCapability === "talent"}
          onPress={() => setSetupCapability("talent")}
        />
        <WorkspaceOption
          capability="organizer"
          title="Organizer profile"
          description="Post opportunity gigs, find talent, and manage event bookings."
          exists={capabilities.includes("organizer")}
          loading={loadingCapability === "organizer"}
          onPress={() => setSetupCapability("organizer")}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <CapabilitySetupModal
        visible={Boolean(setupCapability)}
        capability={setupCapability}
        categories={categories}
        submitting={Boolean(loadingCapability)}
        error={error}
        onClose={() => {
          if (!loadingCapability) {
            setSetupCapability(null);
            setError(null);
          }
        }}
        onSubmit={(payload) => {
          if (setupCapability) void createProfile(setupCapability, payload);
        }}
      />
    </View>
  );
}

function WorkspaceOption({
  capability,
  title,
  description,
  exists,
  loading,
  onPress,
}: {
  capability: Capability;
  title: string;
  description: string;
  exists: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={exists || loading} style={[styles.option, exists ? styles.optionReady : undefined]}>
      <View style={[styles.optionIcon, capability === "talent" ? styles.optionIconTalent : styles.optionIconOrganizer]}>
        <MaterialCommunityIcons
          name={capability === "talent" ? "music-note-outline" : "briefcase-outline"}
          size={21}
          color={theme.semanticColors.textOnDark}
        />
      </View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <Text style={[styles.optionAction, exists ? styles.optionReadyLabel : undefined]}>
        {exists ? "Ready" : loading ? "Creating..." : "Create"}
      </Text>
    </Pressable>
  );
}

export function WorkspaceSetupScreen({ token, capabilities, categories = [], onCapabilityAdded }: WorkspaceSetupProps) {
  return (
    <Screen>
      <View style={styles.screenHeader}>
        <View style={styles.screenHeaderIcon}>
          <MaterialCommunityIcons name="account-cog-outline" size={24} color={theme.colors.gold[500]} />
        </View>
        <Text style={styles.screenHeaderTitle}>Set up your account</Text>
      </View>
      <Text style={styles.screenLead}>You can explore first, then create the workspace that matches what you want to do.</Text>
      <WorkspaceSetupPanel token={token} capabilities={capabilities} categories={categories} onCapabilityAdded={onCapabilityAdded} />
      <View style={styles.exploreCard}>
        <MaterialCommunityIcons name="compass-outline" size={22} color={theme.semanticColors.primary} />
        <View style={styles.exploreCopy}>
          <Text style={styles.exploreTitle}>Explore without a profile</Text>
          <Text style={styles.exploreBody}>Browse public opportunities and talent profiles from the Discover tab. Actions that involve hiring or applying will ask for the right profile.</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  screenHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5E6BF",
  },
  screenHeaderTitle: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size.xl,
    color: theme.semanticColors.textPrimary,
  },
  screenLead: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.semanticColors.textSecondary,
  },
  setupPanel: {
    gap: theme.spacing[4],
    padding: theme.spacing[5],
    borderRadius: theme.radius.xl,
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.card,
  },
  setupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing[3],
  },
  eyebrow: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  setupTitle: {
    maxWidth: 270,
    marginTop: theme.spacing[1],
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.semanticColors.textPrimary,
  },
  setupBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  optionList: {
    gap: theme.spacing[3],
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.stone[50],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  optionReady: {
    backgroundColor: "#E5F4F2",
    borderColor: theme.colors.teal[300],
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconTalent: {
    backgroundColor: theme.colors.teal[500],
  },
  optionIconOrganizer: {
    backgroundColor: theme.colors.gold[500],
  },
  optionCopy: {
    flex: 1,
    gap: 3,
  },
  optionTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  optionDescription: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.semanticColors.textSecondary,
  },
  optionAction: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.primary,
  },
  optionReadyLabel: {
    color: theme.colors.teal[600],
  },
  error: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.danger,
  },
  exploreCard: {
    flexDirection: "row",
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderRadius: theme.radius.lg,
    backgroundColor: "#FFF8E8",
    borderWidth: 1,
    borderColor: theme.colors.gold[300],
  },
  exploreCopy: {
    flex: 1,
    gap: theme.spacing[1],
  },
  exploreTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  exploreBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.semanticColors.textSecondary,
  },
});
