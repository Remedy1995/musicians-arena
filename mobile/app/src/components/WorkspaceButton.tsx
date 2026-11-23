import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";

import { theme } from "../theme/theme";

export function WorkspaceButton({ label, onPress, iconOnly = false }: { label: string; onPress?: () => void; iconOnly?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, iconOnly ? styles.iconOnlyButton : undefined]}
      accessibilityRole="button"
      accessibilityLabel={`Switch workspace. Current workspace: ${label}`}
    >
      <MaterialCommunityIcons name="account-switch-outline" size={iconOnly ? 19 : 17} color={theme.semanticColors.textPrimary} />
      {!iconOnly ? <Text style={styles.label} numberOfLines={1}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: theme.spacing[2],
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  iconOnlyButton: {
    width: 38,
    paddingHorizontal: 0,
    justifyContent: "center",
  },
  label: {
    flexShrink: 1,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textPrimary,
  },
});
