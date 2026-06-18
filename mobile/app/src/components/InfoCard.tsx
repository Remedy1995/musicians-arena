import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/theme";

type InfoCardProps = {
  eyebrow: string;
  title: string;
  body: string;
};

export function InfoCard({ eyebrow, title, body }: InfoCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    gap: theme.spacing[2],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  eyebrow: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.colors.gold[600],
  },
  title: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
  },
  body: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.semanticColors.textSecondary,
  },
});
