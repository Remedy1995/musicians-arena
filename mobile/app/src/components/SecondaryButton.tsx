import { Pressable, StyleSheet, Text } from "react-native";

import { theme } from "../theme/theme";

type SecondaryButtonProps = {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
};

export function SecondaryButton({ label, onPress, destructive = false }: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        destructive ? styles.buttonDestructive : undefined,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.label, destructive ? styles.labelDestructive : undefined]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: theme.layout.buttonHeight,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.semanticColors.borderStrong,
    backgroundColor: theme.semanticColors.surface,
  },
  buttonDestructive: {
    borderColor: theme.colors.ember[300],
    backgroundColor: "#FFF2EE",
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  label: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
    letterSpacing: 0.2,
  },
  labelDestructive: {
    color: theme.colors.ember[600],
  },
});
