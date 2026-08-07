import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { theme } from "../theme/theme";

type OnboardingScreenProps = {
  onContinue: () => void;
};

export function OnboardingScreen({ onContinue }: OnboardingScreenProps) {
  return (
    <Screen contentContainerStyle={styles.content} innerStyle={styles.inner}>
      <LinearGradient colors={["#FFF2CF", "#FFE3D8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.logoMark}>
          <MaterialCommunityIcons name="music-clef-treble" size={28} color={theme.semanticColors.textOnDark} />
        </View>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>Musician's Arena</Text>
          <Text style={styles.brandPill}>ONE ACCOUNT</Text>
        </View>
        <Text style={styles.title}>Find your sound. Build your next opportunity.</Text>
        <Text style={styles.body}>
          Discover talent, find gigs, and keep every booking conversation in one place.
        </Text>
      </LinearGradient>

      <View style={styles.introCard}>
        <Text style={styles.kicker}>A flexible account</Text>
        <Text style={styles.cardTitle}>One account, two ways to participate.</Text>
        <Text style={styles.cardBody}>
          Start exploring now, then create a talent profile, an organizer profile, or both when you are ready.
        </Text>
        <View style={styles.points}>
          <Benefit icon="account-multiple-outline" label="One sign-in for every capability" />
          <Benefit icon="swap-horizontal-circle-outline" label="Switch workspaces whenever you need" />
          <Benefit icon="compass-outline" label="Explore before creating a profile" />
        </View>
      </View>

      <PrimaryButton label="Continue to account access" onPress={onContinue} />
    </Screen>
  );
}

function Benefit({ icon, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }) {
  return (
    <View style={styles.benefit}>
      <MaterialCommunityIcons name={icon} size={20} color={theme.semanticColors.primary} />
      <Text style={styles.benefitLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: theme.spacing[6],
  },
  inner: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: theme.radius.xl,
    padding: theme.spacing[6],
    gap: theme.spacing[3],
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    ...theme.shadows.floating,
  },
  heroGlow: {
    position: "absolute",
    top: -72,
    right: -34,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(217,181,83,0.26)",
  },
  logoMark: {
    width: 54,
    height: 54,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.gold[400],
  },
  brand: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.primary,
    letterSpacing: 0.4,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[2],
  },
  brandPill: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 10,
    color: theme.colors.gold[600],
    letterSpacing: 0.7,
  },
  title: {
    maxWidth: 310,
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["3xl"],
    lineHeight: theme.typography.lineHeight["3xl"],
    color: theme.semanticColors.textPrimary,
  },
  body: {
    maxWidth: 310,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.semanticColors.textSecondary,
  },
  introCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    gap: theme.spacing[3],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.card,
  },
  kicker: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.semanticColors.textPrimary,
  },
  cardBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  points: {
    gap: theme.spacing[3],
    paddingTop: theme.spacing[1],
  },
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  benefitLabel: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
});
