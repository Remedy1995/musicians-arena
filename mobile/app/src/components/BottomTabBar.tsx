import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UserRole } from "../AppShell";
import { TabKey } from "../navigation/AppTabs";
import { theme } from "../theme/theme";

type BottomTabBarProps = {
  role: UserRole | null;
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
  badges?: Partial<Record<TabKey, number>>;
};

export function BottomTabBar({ role, activeTab, onTabPress, badges = {} }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabItems: Array<{ key: TabKey; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; activeIcon: keyof typeof MaterialCommunityIcons.glyphMap }> = [
    { key: "discover", label: "Dashboard", icon: "compass-outline", activeIcon: "compass" },
    { key: "gigs", label: role === "client" ? "My Gigs" : role === "talent" ? "Gig Board" : "Opportunities", icon: "music-note-outline", activeIcon: "music-note" },
    { key: "messages", label: "Messages", icon: "message-text-outline", activeIcon: "message-text" },
    { key: "bookings", label: "Bookings", icon: "clipboard-text-outline", activeIcon: "clipboard-text" },
    { key: "profile", label: "Profile", icon: "account-circle-outline", activeIcon: "account-circle" },
  ];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + theme.spacing[2], theme.spacing[5]) }]}>
      <View style={styles.bar}>
        {tabItems.map((item) => {
          const isActive = item.key === activeTab;
          const badgeCount = badges[item.key] ?? 0;
          return (
            <Pressable
              key={item.key}
              onPress={() => onTabPress(item.key)}
              style={[styles.item, isActive ? styles.itemActive : undefined]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
            >
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons
                  name={isActive ? item.activeIcon : item.icon}
                  size={22}
                  color={isActive ? theme.semanticColors.primary : theme.semanticColors.textMuted}
                />
                {badgeCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[styles.label, isActive ? styles.labelActive : undefined]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.semanticColors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.semanticColors.borderSoft,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: theme.layout.tabBarHeight,
    paddingHorizontal: theme.spacing[3],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[2],
    gap: theme.spacing[1],
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 3,
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md,
    position: "relative",
  },
  itemActive: {
    backgroundColor: theme.semanticColors.surfaceMuted,
  },
  iconWrap: {
    position: "relative",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    color: theme.semanticColors.textMuted,
    includeFontPadding: false,
    textAlign: "center",
  },
  labelActive: {
    color: theme.semanticColors.textPrimary,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
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
