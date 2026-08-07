import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";

import { theme } from "../theme/theme";

export function WorkspaceButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <MaterialCommunityIcons name="account-switch-outline" size={17} color={theme.semanticColors.primary} />
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    maxWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: theme.spacing[2],
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: "#FFF8E8",
    borderWidth: 1,
    borderColor: theme.colors.gold[300],
  },
  label: {
    flexShrink: 1,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textPrimary,
  },
});
