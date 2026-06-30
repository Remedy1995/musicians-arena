import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/theme";
import { StatusBadge } from "./StatusBadge";

type BookingCardProps = {
  title: string;
  counterpart: string;
  date: string;
  amount: string;
  status: string;
  eyebrow?: string;
  highlight?: boolean;
};

export function BookingCard({ title, counterpart, date, amount, status, eyebrow, highlight = false }: BookingCardProps) {
  const tone =
    status === "Booking request"
      ? "accent"
      : status === "Counteroffer"
        ? "accent"
        : status === "Confirmed"
          ? "success"
          : status === "Awaiting deposit"
            ? "urgent"
            : "neutral";

  return (
    <View style={[styles.card, highlight ? styles.cardHighlight : undefined]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
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
  cardHighlight: {
    borderColor: "#F4C96A",
    backgroundColor: "#FFF8EA",
  },
  eyebrow: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: theme.colors.gold[600],
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
