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
    borderRadius: theme.radius.xl,
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    overflow: "hidden",
    ...theme.shadows.card,
  },
  cardContent: {
    padding: theme.spacing[5],
    gap: theme.spacing[4],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing[3],
  },
  headerText: {
    flex: 1,
    gap: theme.spacing[2],
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  liveDot: {
    width: 8,
    height: 8,
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
    fontSize: theme.typography.size.xl,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.semanticColors.textPrimary,
  },
  metaStack: {
    gap: theme.spacing[1],
  },
  metaLine: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  summaryRow: {
    flexDirection: "row",
    gap: theme.spacing[3],
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
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
  },
  applicantBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
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
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
    borderWidth: 1,
  },
  interestStatusBadgeLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
  },
  roles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  roleChip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 5,
    backgroundColor: "#F6F1E8",
    borderWidth: 1,
    borderColor: "#E4D8C8",
  },
  roleLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.xs,
    color: "#6A6258",
  },
  footer: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textMuted,
  },
});

function getInterestStatusPalette(status: string | null | undefined) {
  switch (status) {
    case "Request sent":
      return {
        backgroundColor: "#EEF4FF",
        borderColor: "#C9DBFF",
        color: "#3559A8",
      };
    case "Shortlisted":
      return {
        backgroundColor: "#FFF6E5",
        borderColor: "#F0D39A",
        color: "#9B6A13",
      };
    case "Invited to proceed":
      return {
        backgroundColor: "#F3ECFF",
        borderColor: "#D8C4F3",
        color: "#6C469A",
      };
    case "Not selected":
      return {
        backgroundColor: "#F5F5F5",
        borderColor: "#DDDDDD",
        color: "#6D6D6D",
      };
    default:
      return {
        backgroundColor: theme.colors.stone[100],
        borderColor: theme.semanticColors.borderSoft,
        color: theme.semanticColors.textSecondary,
      };
  }
}
