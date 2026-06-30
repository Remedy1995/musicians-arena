import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/theme";
import { ProfileAvatar } from "./ProfileAvatar";
import { StatusBadge } from "./StatusBadge";

type TalentCardProps = {
  name: string;
  imageUri?: string | null;
  title: string;
  city: string;
  rate: string;
  rating: number;
  jobs: number;
  verified: boolean;
  tags: string[];
};

export function TalentCard({ name, imageUri, title, city, rate, rating, jobs, verified, tags }: TalentCardProps) {
  return (
    <LinearGradient colors={["#20252A", "#111315"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.header}>
        <ProfileAvatar
          label={name}
          imageUri={imageUri}
          size={56}
          borderRadius={theme.radius.lg}
          style={styles.heroMark}
          textStyle={styles.heroInitials}
        />
        {verified ? <StatusBadge label="Verified" tone="accent" /> : null}
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{city}</Text>
        <Text style={styles.meta}>{"\u2605"} {rating.toFixed(1)}</Text>
        <Text style={styles.meta}>{jobs} jobs</Text>
      </View>
      <View style={styles.tags}>
        {tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagLabel}>{tag}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.rate}>{rate}</Text>
        <Text style={styles.cta}>View profile</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 296,
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    gap: theme.spacing[3],
    ...theme.shadows.floating,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroMark: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  heroInitials: {
    fontSize: theme.typography.size.lg,
  },
  name: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["2xl"],
    lineHeight: theme.typography.lineHeight["2xl"],
    color: theme.semanticColors.textOnDark,
  },
  title: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: "rgba(255, 255, 255, 0.78)",
  },
  metaRow: {
    flexDirection: "row",
    gap: theme.spacing[4],
  },
  meta: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: "rgba(255, 255, 255, 0.72)",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  tag: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  tagLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textOnDark,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rate: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.colors.gold[300],
  },
  cta: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.colors.stone[100],
  },
});
