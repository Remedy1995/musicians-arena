import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/theme";
import { ProfileAvatar } from "./ProfileAvatar";
import { StatusBadge } from "./StatusBadge";

type ConversationCardProps = {
  name: string;
  imageUri?: string | null;
  message: string;
  time: string;
  unread?: number;
  badge?: string;
};

export function ConversationCard({ name, imageUri, message, time, unread, badge }: ConversationCardProps) {
  return (
    <View style={styles.card}>
      <ProfileAvatar label={name} imageUri={imageUri} size={52} borderRadius={theme.radius.lg} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text numberOfLines={1} style={styles.message}>
            {message}
          </Text>
          <View style={styles.sideMeta}>
            {badge ? <StatusBadge label={badge} tone="accent" /> : null}
            {unread ? (
              <View style={styles.unreadBubble}>
                <Text style={styles.unreadText}>{unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: theme.spacing[4],
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  name: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  time: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textMuted,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing[3],
    marginTop: 1,
  },
  message: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  sideMeta: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: theme.spacing[2],
    minWidth: 92,
  },
  unreadBubble: {
    minWidth: 26,
    height: 26,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[2],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semanticColors.primary,
  },
  unreadText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textOnDark,
  },
});
