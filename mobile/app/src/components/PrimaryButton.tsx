import { Pressable, StyleSheet, Text } from "react-native";

import { theme } from "../theme/theme";

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, disabled = false }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.buttonDisabled : undefined,
        pressed && !disabled ? styles.buttonPressed : undefined,
      ]}
    >
      <Text style={[styles.label, disabled ? styles.labelDisabled : undefined]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: theme.layout.buttonHeight,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semanticColors.primary,
    ...theme.shadows.card,
  },
  buttonDisabled: {
    backgroundColor: theme.semanticColors.surfaceMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonPressed: {
    backgroundColor: theme.semanticColors.primaryPressed,
    transform: [{ scale: 0.99 }],
  },
  label: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textOnDark,
    letterSpacing: 0.1,
  },
  labelDisabled: {
    color: theme.semanticColors.textMuted,
  },
});
