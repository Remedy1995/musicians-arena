import { Pressable, StyleSheet, Text, View } from "react-native";

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
  onPress?: () => void;
};

export function TalentCard({ name, imageUri, title, city, rate, rating, jobs, verified, tags, onPress }: TalentCardProps) {
  const card = (
    <View style={styles.card}>
      <View style={styles.header}>
        <ProfileAvatar
          label={name}
          imageUri={imageUri}
          size={52}
          borderRadius={26}
          style={styles.heroMark}
          textStyle={styles.heroInitials}
        />
        {verified ? <StatusBadge label="Verified" tone="accent" /> : null}
      </View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{city}</Text>
        <Text style={styles.meta}>{"\u2605"} {rating.toFixed(1)}</Text>
        <Text style={styles.meta}>{jobs} jobs</Text>
      </View>
      <View style={styles.tags}>
        {tags.slice(0, 2).map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagLabel} numberOfLines={1}>{tag}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.rate}>{rate}</Text>
        <Text style={styles.cta}>View profile</Text>
      </View>
    </View>
  );

  return onPress ? <Pressable onPress={onPress}>{card}</Pressable> : card;
}

const styles = StyleSheet.create({
  card: {
    width: 248,
    height: 224,
    borderRadius: theme.radius.xl,
    padding: theme.spacing[3],
    gap: theme.spacing[1],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    overflow: "hidden",
    ...theme.shadows.floating,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroMark: {
    backgroundColor: theme.colors.stone[100],
  },
  heroInitials: {
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
  },
  name: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size.xl,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.semanticColors.textPrimary,
  },
  title: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.semanticColors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
    minHeight: 20,
  },
  meta: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textMuted,
  },
  tags: {
    height: 26,
    flexDirection: "row",
    overflow: "hidden",
    gap: theme.spacing[2],
  },
  tag: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.stone[50],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  tagLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textSecondary,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rate: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.colors.gold[600],
  },
  cta: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.primary,
  },
});
