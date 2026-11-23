import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/theme";

export type CompactStatusOption = {
  key: string;
  label: string;
};

type CompactStatusMenuProps = {
  options: CompactStatusOption[];
  selectedKey: string;
  onChange: (key: string) => void;
  countLabel?: string;
  headerLabel?: string;
};

export function CompactStatusMenu({
  options,
  selectedKey,
  onChange,
  countLabel,
  headerLabel = "Browse by status",
}: CompactStatusMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleOptions = options.slice(0, 2);
  const selectedInMenu = !visibleOptions.some((option) => option.key === selectedKey);

  function selectOption(key: string) {
    onChange(key);
    setMenuOpen(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>{headerLabel}</Text>
        {countLabel ? <Text style={styles.countLabel}>{countLabel}</Text> : null}
      </View>
      <View style={styles.row}>
        {visibleOptions.map((option) => {
          const active = selectedKey === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => selectOption(option.key)}
              style={[styles.option, active ? styles.optionActive : undefined]}
            >
              <Text style={[styles.optionLabel, active ? styles.optionLabelActive : undefined]} numberOfLines={1}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setMenuOpen((current) => !current)}
          style={[styles.option, styles.allOption, menuOpen || selectedInMenu ? styles.optionActive : undefined]}
          accessibilityRole="button"
          accessibilityLabel="Show all statuses"
        >
          <Text style={[styles.optionLabel, menuOpen || selectedInMenu ? styles.optionLabelActive : undefined]}>All</Text>
          <MaterialCommunityIcons
            name={menuOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color={menuOpen || selectedInMenu ? theme.semanticColors.textPrimary : theme.semanticColors.textSecondary}
          />
        </Pressable>
      </View>
      {menuOpen ? (
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>All statuses</Text>
          {options.map((option) => {
            const active = selectedKey === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => selectOption(option.key)}
                style={[styles.menuItem, active ? styles.menuItemActive : undefined]}
              >
                <Text style={[styles.menuLabel, active ? styles.menuLabelActive : undefined]}>{option.label}</Text>
                {active ? <MaterialCommunityIcons name="check" size={17} color={theme.colors.gold[600]} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 3,
    gap: theme.spacing[2],
    padding: theme.spacing[3],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.semanticColors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    overflow: "visible",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  headerLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  countLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.colors.gold[600],
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  option: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    backgroundColor: theme.semanticColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  optionActive: {
    borderColor: theme.semanticColors.primary,
    backgroundColor: theme.semanticColors.infoSoft,
  },
  optionLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textSecondary,
  },
  optionLabelActive: {
    color: theme.semanticColors.primary,
  },
  allOption: {
    flexDirection: "row",
    gap: theme.spacing[1],
  },
  menu: {
    position: "absolute",
    top: 86,
    right: theme.spacing[3],
    width: 190,
    zIndex: 20,
    elevation: 10,
    gap: theme.spacing[1],
    padding: theme.spacing[2],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    backgroundColor: theme.semanticColors.surface,
    shadowColor: theme.colors.ink[950],
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  menuTitle: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textSecondary,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  menuItem: {
    minHeight: 38,
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemActive: {
    backgroundColor: theme.semanticColors.infoSoft,
  },
  menuLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  menuLabelActive: {
    color: theme.semanticColors.primary,
  },
});
