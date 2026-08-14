import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { WorkspaceButton } from "./WorkspaceButton";
import { theme } from "../theme/theme";

type TopBarProps = {
  unreadCount?: number;
  onNotificationPress?: () => void;
  showNotifications?: boolean;
  workspaceLabel?: string;
  onWorkspacePress?: () => void;
};

export function TopBar({ unreadCount = 0, onNotificationPress, showNotifications = true, workspaceLabel, onWorkspacePress }: TopBarProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.brandGroup}>
          <LinearGradient
            colors={[theme.colors.ember[500], theme.colors.gold[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.logoMark, compact ? styles.logoMarkCompact : undefined]}
          >
            <MaterialCommunityIcons name="music-clef-treble" size={compact ? 21 : 24} color={theme.semanticColors.textOnDark} />
          </LinearGradient>
          <View style={styles.brandCopy}>
            <Text style={styles.kicker}>Musician's Arena</Text>
            <Text style={styles.title} numberOfLines={1}>Find the right sound.</Text>
          </View>
        </View>
        <View style={styles.actions}>
          {workspaceLabel ? <WorkspaceButton label={workspaceLabel} onPress={onWorkspacePress} iconOnly /> : null}
          {showNotifications ? (
            <Pressable style={[styles.notificationButton, compact ? styles.notificationButtonCompact : undefined]} onPress={onNotificationPress}>
              <MaterialCommunityIcons
                name={unreadCount > 0 ? "bell-ring" : "bell-outline"}
                size={20}
                color={unreadCount > 0 ? theme.colors.gold[500] : theme.colors.ink[800]}
              />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeLabel}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : (
            <View style={styles.notificationSpacer} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing[1],
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: theme.spacing[1],
    paddingBottom: theme.spacing[1],
  },
  brandGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    flexShrink: 0,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.card,
  },
  logoMarkCompact: {
    width: 34,
    height: 34,
  },
  kicker: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
    lineHeight: theme.typography.lineHeight.lg,
  },
  notificationButtonCompact: {
    width: 38,
    height: 38,
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.card,
  },
  notificationSpacer: {
    width: 44,
    height: 44,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    backgroundColor: theme.semanticColors.primary,
    borderWidth: 1.5,
    borderColor: theme.semanticColors.surface,
  },
  badgeLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 10,
    color: theme.semanticColors.textOnDark,
  },
});
