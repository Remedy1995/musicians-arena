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
      <ProfileAvatar label={name} imageUri={imageUri} size={52} borderRadius={26} />
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
    alignItems: "flex-start",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[1],
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  body: {
    flex: 1,
    gap: theme.spacing[1],
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[3],
  },
  message: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.semanticColors.textSecondary,
  },
  sideMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: theme.spacing[2],
    minWidth: 0,
    flexShrink: 0,
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
