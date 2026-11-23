import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../components/Screen";
import { theme } from "../theme/theme";

type OnboardingScreenProps = {
  onContinue: () => void;
};

export function OnboardingScreen({ onContinue }: OnboardingScreenProps) {
  return (
    <Screen contentContainerStyle={styles.content} innerStyle={styles.inner}>
      <StatusBar style="dark" />

      <ImageBackground
        source={require("../../assets/onboarding-stage.jpg")}
        style={styles.hero}
        imageStyle={styles.heroImage}
        accessibilityLabel="A live music audience under warm stage lights"
      >
        <LinearGradient
          colors={["rgba(12,16,20,0.78)", "rgba(12,16,20,0.08)", "rgba(12,16,20,0.92)"]}
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <MaterialCommunityIcons name="music-note-eighth" size={20} color={theme.colors.ink[950]} />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>MUSICIAN’S ARENA</Text>
            <Text style={styles.brandDescriptor}>Talent and opportunities, connected</Text>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrow}>THE CREATIVE WORK MARKETPLACE</Text>
          </View>
          <Text style={styles.title}>Make the right connection.</Text>
          <Text style={styles.body}>
            Discover trusted talent, find meaningful gigs, and manage every booking in one focused place.
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.actionArea}>
        <View style={styles.roleStrip}>
          <RoleCue icon="account-star-outline" label="For talent" />
          <View style={styles.roleDivider} />
          <RoleCue icon="calendar-check-outline" label="For organizers" />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Get started with Musician's Arena"
          onPress={onContinue}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
        >
          <Text style={styles.primaryActionLabel}>Get started</Text>
          <View style={styles.actionIcon}>
            <MaterialCommunityIcons name="arrow-right" size={19} color={theme.semanticColors.textOnDark} />
          </View>
        </Pressable>

        <Text style={styles.supportingText}>One account. Switch roles whenever your work does.</Text>
      </View>
    </Screen>
  );
}

function RoleCue({
  icon,
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.roleCue}>
      <View style={styles.roleIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.colors.ink[800]} />
      </View>
      <Text style={styles.roleLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingVertical: theme.spacing[4],
  },
  inner: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    flexGrow: 1,
    gap: theme.spacing[6],
  },
  hero: {
    minHeight: 460,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: theme.spacing[5],
    borderRadius: 32,
    backgroundColor: theme.colors.ink[900],
    ...theme.shadows.floating,
  },
  heroImage: {
    borderRadius: 32,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.gold[300],
  },
  brandCopy: {
    flex: 1,
    gap: 2,
  },
  brandName: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xs,
    letterSpacing: 1.1,
    color: theme.semanticColors.textOnDark,
  },
  brandDescriptor: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.68)",
  },
  heroCopy: {
    maxWidth: 390,
    gap: theme.spacing[3],
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  eyebrowLine: {
    width: 24,
    height: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.gold[300],
  },
  eyebrow: {
    flexShrink: 1,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 10,
    letterSpacing: 1.15,
    color: theme.colors.gold[300],
  },
  title: {
    maxWidth: 350,
    fontFamily: theme.typography.fontFamily.display,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1.1,
    color: theme.semanticColors.textOnDark,
  },
  body: {
    maxWidth: 350,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: "rgba(255,255,255,0.76)",
  },
  actionArea: {
    gap: theme.spacing[4],
    paddingHorizontal: theme.spacing[1],
  },
  roleStrip: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  roleCue: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  roleIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: theme.colors.stone[100],
  },
  roleLabel: {
    flexShrink: 1,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  roleDivider: {
    width: 1,
    height: 28,
    marginHorizontal: theme.spacing[3],
    backgroundColor: theme.semanticColors.borderSoft,
  },
  primaryAction: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: theme.spacing[5],
    paddingRight: 9,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.semanticColors.primary,
    ...theme.shadows.card,
  },
  primaryActionPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryActionLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    letterSpacing: 0.1,
    color: theme.semanticColors.textOnDark,
  },
  actionIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  supportingText: {
    paddingHorizontal: theme.spacing[3],
    textAlign: "center",
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.semanticColors.textMuted,
  },
});
