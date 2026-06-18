import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UserRole } from "../AppShell";
import { TabKey } from "../navigation/AppTabs";
import { theme } from "../theme/theme";

type BottomTabBarProps = {
  role: UserRole;
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
  badges?: Partial<Record<TabKey, number>>;
};

export function BottomTabBar({ role, activeTab, onTabPress, badges = {} }: BottomTabBarProps) {
  const tabItems: Array<{ key: TabKey; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; activeIcon: keyof typeof MaterialCommunityIcons.glyphMap }> = [
    { key: "discover", label: role === "client" ? "Dashboard" : "Discover", icon: "compass-outline", activeIcon: "compass" },
    { key: "gigs", label: role === "client" ? "My Gigs" : "Gig Board", icon: "music-note-outline", activeIcon: "music-note" },
    { key: "messages", label: "Messages", icon: "message-text-outline", activeIcon: "message-text" },
    { key: "bookings", label: role === "client" ? "Hires" : "Bookings", icon: "clipboard-text-outline", activeIcon: "clipboard-text" },
    { key: "profile", label: "Profile", icon: "account-circle-outline", activeIcon: "account-circle" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {tabItems.map((item) => {
          const isActive = item.key === activeTab;
          const badgeCount = badges[item.key] ?? 0;
          return (
            <Pressable
              key={item.key}
              onPress={() => onTabPress(item.key)}
              style={styles.item}
            >
              {isActive ? (
                <LinearGradient
                  colors={[theme.colors.ember[500], theme.colors.gold[500]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeIndicator}
                />
              ) : null}
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons
                  name={isActive ? item.activeIcon : item.icon}
                  size={22}
                  color={isActive ? theme.colors.gold[400] : "rgba(255, 255, 255, 0.74)"}
                />
                {badgeCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, isActive ? styles.labelActive : undefined]}>
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
    backgroundColor: theme.colors.ink[900],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing[2],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[5],
    gap: theme.spacing[1],
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: theme.spacing[1],
    paddingVertical: theme.spacing[2],
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    left: "25%" as unknown as number,
    right: "25%" as unknown as number,
    height: 3,
    borderRadius: theme.radius.pill,
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
    color: "rgba(255, 255, 255, 0.7)",
  },
  labelActive: {
    color: theme.colors.gold[300],
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
    borderColor: theme.colors.ink[900],
  },
  badgeLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 10,
    color: theme.semanticColors.textOnDark,
  },
});
