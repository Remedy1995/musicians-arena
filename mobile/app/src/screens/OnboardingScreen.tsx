import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { UserRole } from "../AppShell";
import { PrimaryButton } from "../components/PrimaryButton";
import { RoleCard } from "../components/RoleCard";
import { Screen } from "../components/Screen";
import { theme } from "../theme/theme";

type OnboardingScreenProps = {
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onContinue: () => void;
};

export function OnboardingScreen({ selectedRole, onRoleChange, onContinue }: OnboardingScreenProps) {
  const { height } = useWindowDimensions();
  const compact = height < 820;
  const tight = height < 740;

  return (
    <Screen
      contentContainerStyle={[styles.screenContent, tight ? styles.screenContentTight : undefined]}
      innerStyle={tight ? styles.innerTight : compact ? styles.innerCompact : styles.innerRegular}
    >
      <LinearGradient colors={["#1B1F23", "#111315"]} style={[styles.hero, tight ? styles.heroTight : compact ? styles.heroCompact : undefined]}>
        <Text style={styles.brand}>Musician's Arena</Text>
        <Text style={[styles.title, tight ? styles.titleTight : compact ? styles.titleCompact : undefined]}>Where creative talent meets real opportunity.</Text>
        {!tight ? (
          <Text style={[styles.body, compact ? styles.bodyCompact : undefined]} numberOfLines={2}>
            Discover talent, post gigs, and keep every booking conversation in one trusted place.
          </Text>
        ) : null}
      </LinearGradient>

      <View style={[styles.section, tight ? styles.sectionTight : compact ? styles.sectionCompact : undefined]}>
        <Text style={[styles.sectionTitle, tight ? styles.sectionTitleTight : compact ? styles.sectionTitleCompact : undefined]}>Choose how you want to enter</Text>
        <View style={[styles.roleRow, tight ? styles.roleRowTight : compact ? styles.roleRowCompact : undefined]}>
          <RoleCard
            role="client"
            title="I want to hire"
            body="Post gigs, browse talent, and manage bookings for services, weddings, and events."
            selected={selectedRole === "client"}
            onPress={() => onRoleChange("client")}
            compact={compact}
          />
          <RoleCard
            role="talent"
            title="I am a talent"
            body="Showcase your work, receive direct bookings, and respond to open event opportunities."
            selected={selectedRole === "talent"}
            onPress={() => onRoleChange("talent")}
            compact={compact}
          />
        </View>
      </View>

      <PrimaryButton label={selectedRole === "client" ? "Enter as organizer" : "Enter as talent"} onPress={onContinue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing[6],
  },
  screenContentTight: {
    paddingBottom: theme.spacing[4],
  },
  innerRegular: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  innerCompact: {
    flexGrow: 1,
    justifyContent: "space-between",
    gap: theme.spacing[5],
  },
  innerTight: {
    flexGrow: 1,
    justifyContent: "space-between",
    gap: theme.spacing[4],
  },
  hero: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[6],
    gap: theme.spacing[4],
    ...theme.shadows.floating,
  },
  heroCompact: {
    padding: theme.spacing[5],
    gap: theme.spacing[3],
  },
  heroTight: {
    padding: theme.spacing[4],
    gap: theme.spacing[2],
  },
  brand: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.colors.gold[300],
  },
  title: {
    maxWidth: 300,
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["3xl"],
    lineHeight: theme.typography.lineHeight["3xl"],
    color: theme.semanticColors.textOnDark,
  },
  titleCompact: {
    fontSize: theme.typography.size["2xl"],
    lineHeight: theme.typography.lineHeight["2xl"],
    maxWidth: 280,
  },
  titleTight: {
    fontSize: theme.typography.size.xl,
    lineHeight: theme.typography.lineHeight.xl,
    maxWidth: 260,
  },
  body: {
    maxWidth: 290,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: "rgba(255, 255, 255, 0.78)",
  },
  bodyCompact: {
    maxWidth: 270,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
  },
  section: {
    gap: theme.spacing[3],
  },
  sectionCompact: {
    gap: theme.spacing[2],
  },
  sectionTight: {
    gap: theme.spacing[1],
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
    color: theme.semanticColors.textPrimary,
  },
  sectionTitleCompact: {
    fontSize: theme.typography.size.lg,
  },
  sectionTitleTight: {
    fontSize: theme.typography.size.md,
  },
  roleRow: {
    gap: theme.spacing[3],
  },
  roleRowCompact: {
    gap: theme.spacing[2],
  },
  roleRowTight: {
    gap: theme.spacing[1],
  },
});
