import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/theme";
import { StatusBadge } from "./StatusBadge";

type BookingCardProps = {
  title: string;
  counterpart: string;
  date: string;
  amount: string;
  status: string;
};

export function BookingCard({ title, counterpart, date, amount, status }: BookingCardProps) {
  const tone = status === "Confirmed" ? "success" : status === "Awaiting deposit" ? "urgent" : "neutral";

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.headText}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <Text style={styles.counterpart}>{counterpart}</Text>
        </View>
        <StatusBadge label={status} tone={tone} />
      </View>
      <View style={styles.divider} />
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>📅 Date</Text>
          <Text style={styles.footerValue}>{date}</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>💰 Amount</Text>
          <Text style={styles.amount}>{amount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    gap: theme.spacing[4],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.card,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing[3],
  },
  headText: {
    flex: 1,
    gap: theme.spacing[1],
  },
  title: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.semanticColors.textPrimary,
  },
  counterpart: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.semanticColors.borderSoft,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerItem: {
    flex: 1,
    gap: theme.spacing[1],
  },
  footerDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.semanticColors.borderSoft,
    marginHorizontal: theme.spacing[4],
  },
  footerLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
  },
  footerValue: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  amount: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.colors.ember[500],
  },
});
