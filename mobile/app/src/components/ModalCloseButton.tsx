import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { theme } from "../theme/theme";

type ModalCloseButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export function ModalCloseButton({ onPress, accessibilityLabel = "Close modal" }: ModalCloseButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.button} accessibilityLabel={accessibilityLabel} hitSlop={theme.spacing[2]}>
      <MaterialCommunityIcons name="close" size={20} color={theme.semanticColors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
});
