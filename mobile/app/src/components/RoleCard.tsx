import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UserRole } from "../AppShell";
import { theme } from "../theme/theme";

type RoleCardProps = {
  role: UserRole;
  title: string;
  body: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
};

export function RoleCard({ role, title, body, selected, onPress, compact = false }: RoleCardProps) {
  return (
    <Pressable onPress={onPress} style={[styles.card, compact ? styles.cardCompact : undefined, selected ? styles.cardSelected : undefined]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, compact ? styles.iconWrapCompact : undefined, role === "client" ? styles.iconWrapClient : styles.iconWrapTalent]}>
          <MaterialCommunityIcons
            name={role === "client" ? "clipboard-text-outline" : "piano"}
            size={compact ? 20 : 24}
            color={theme.semanticColors.textOnDark}
          />
        </View>
        <View style={[styles.selectionPill, selected ? styles.selectionPillActive : undefined]}>
          <Text style={[styles.selectionLabel, selected ? styles.selectionLabelActive : undefined]}>{selected ? "Selected" : "Choose"}</Text>
        </View>
      </View>
      <View style={styles.copyGroup}>
        <Text style={[styles.title, compact ? styles.titleCompact : undefined]} numberOfLines={2}>{title}</Text>
        <Text style={[styles.body, compact ? styles.bodyCompact : undefined]} numberOfLines={compact ? 2 : 3}>{body}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    gap: theme.spacing[3],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.card,
  },
  cardCompact: {
    padding: theme.spacing[4],
    gap: theme.spacing[2],
  },
  cardSelected: {
    borderColor: theme.semanticColors.borderStrong,
    backgroundColor: theme.semanticColors.surface,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapCompact: {
    width: 44,
    height: 44,
  },
  iconWrapClient: {
    backgroundColor: theme.colors.gold[400],
  },
  iconWrapTalent: {
    backgroundColor: theme.colors.teal[500],
  },
  selectionPill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
    backgroundColor: theme.colors.stone[100],
  },
  selectionPillActive: {
    backgroundColor: theme.colors.ink[900],
  },
  selectionLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
  },
  selectionLabelActive: {
    color: theme.semanticColors.textOnDark,
  },
  copyGroup: {
    gap: theme.spacing[2],
  },
  title: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
    color: theme.semanticColors.textPrimary,
  },
  titleCompact: {
    fontSize: theme.typography.size.lg,
  },
  body: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  bodyCompact: {
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
  },
});
