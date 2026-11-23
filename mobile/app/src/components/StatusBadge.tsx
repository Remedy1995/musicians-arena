import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/theme";

type StatusTone = "accent" | "urgent" | "success" | "neutral";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

const toneStyles: Record<StatusTone, { backgroundColor: string; color: string }> = {
  accent: {
    backgroundColor: theme.semanticColors.accentSoft,
    color: theme.colors.gold[600],
  },
  urgent: {
    backgroundColor: theme.semanticColors.dangerSoft,
    color: theme.colors.ember[600],
  },
  success: {
    backgroundColor: theme.semanticColors.successSoft,
    color: theme.colors.verdant[600],
  },
  neutral: {
    backgroundColor: theme.colors.stone[100],
    color: theme.semanticColors.textSecondary,
  },
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  const palette = toneStyles[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.label, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  label: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
  },
});
