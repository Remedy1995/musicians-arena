import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/theme";

type SectionHeaderProps = {
  title: string;
  action?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, action, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.titleGroup}>
        <View style={styles.titleAccent} />
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      {action ? onActionPress ? (
        <Pressable onPress={onActionPress} style={styles.actionButton}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : (
        <View style={styles.actionButton}>
          <Text style={styles.action}>{action}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  titleAccent: {
    width: 3,
    height: 18,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.semanticColors.primary,
  },
  title: {
    flexShrink: 1,
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xl,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.semanticColors.textPrimary,
  },
  actionButton: {
    flexShrink: 0,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.stone[100],
  },
  action: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.primary,
  },
});
