import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/theme";
import { StatusBadge } from "./StatusBadge";

type GigCardProps = {
  title: string;
  venue: string;
  timing: string;
  budget: string;
  urgency: string;
  roles: string[];
  metaLabel?: string;
  applicantCount?: number;
  interestStatusLabel?: string | null;
};

export function GigCard({
  title,
  venue,
  timing,
  budget,
  urgency,
  roles,
  metaLabel,
  applicantCount = 0,
  interestStatusLabel,
}: GigCardProps) {
  const interestStatusPalette = getInterestStatusPalette(interestStatusLabel);

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <View style={styles.kickerRow}>
              <View style={styles.liveDot} />
              <Text style={styles.kicker}>Live opportunity</Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          </View>
          <StatusBadge label={urgency} tone={urgency === "Urgent" ? "urgent" : "success"} />
        </View>

        <View style={styles.metaStack}>
          <Text style={styles.metaLine} numberOfLines={1}>
            {venue}
          </Text>
          <Text style={styles.metaLine} numberOfLines={1}>
            {timing}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.budgetBlock}>
            <Text style={styles.budget}>{budget}</Text>
          </View>
          <View style={styles.statusStack}>
            {interestStatusLabel ? (
              <View
                style={[
                  styles.interestStatusBadge,
                  {
                    backgroundColor: interestStatusPalette.backgroundColor,
                    borderColor: interestStatusPalette.borderColor,
                  },
                ]}
              >
                <Text style={[styles.interestStatusBadgeLabel, { color: interestStatusPalette.color }]}>{interestStatusLabel}</Text>
              </View>
            ) : null}
            {applicantCount > 0 ? (
              <View style={styles.applicantBadge}>
                <Text style={styles.applicantBadgeLabel}>
                  {applicantCount} {applicantCount === 1 ? "interested talent" : "interested talents"}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.roles}>
          {roles.map((role) => (
            <View key={role} style={styles.roleChip}>
              <Text style={styles.roleLabel}>{role}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.footer}>{metaLabel || "Tap to view applicants or show interest."}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    overflow: "hidden",
    ...theme.shadows.card,
  },
  cardContent: {
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing[3],
  },
  headerText: {
    flex: 1,
    gap: theme.spacing[1],
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.teal[500],
  },
  kicker: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.semanticColors.textPrimary,
  },
  metaStack: {
    gap: 2,
  },
  metaLine: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  summaryRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
    alignItems: "center",
    justifyContent: "space-between",
  },
  budgetBlock: {
    flex: 1,
  },
  statusStack: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: theme.spacing[2],
  },
  budget: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  applicantBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 5,
    backgroundColor: theme.colors.stone[100],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  applicantBadgeLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textSecondary,
  },
  interestStatusBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 5,
    borderWidth: 1,
  },
  interestStatusBadgeLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
  },
  roles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[1],
  },
  roleChip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 4,
    backgroundColor: theme.colors.stone[50],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  roleLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textSecondary,
  },
  footer: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.semanticColors.textMuted,
  },
});

function getInterestStatusPalette(status: string | null | undefined) {
  switch (status) {
    case "Request sent":
      return {
        backgroundColor: theme.semanticColors.infoSoft,
        borderColor: theme.colors.teal[300],
        color: theme.colors.teal[600],
      };
    case "Shortlisted":
      return {
        backgroundColor: theme.semanticColors.warningSoft,
        borderColor: theme.colors.gold[300],
        color: theme.colors.gold[600],
      };
    case "Invited to proceed":
      return {
        backgroundColor: theme.semanticColors.successSoft,
        borderColor: theme.colors.verdant[300],
        color: theme.colors.verdant[600],
      };
    case "Not selected":
      return {
        backgroundColor: theme.semanticColors.surfaceMuted,
        borderColor: theme.semanticColors.borderSoft,
        color: theme.semanticColors.textMuted,
      };
    default:
      return {
        backgroundColor: theme.colors.stone[100],
        borderColor: theme.semanticColors.borderSoft,
        color: theme.semanticColors.textSecondary,
      };
  }
}
