import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
      style={({ pressed }) => [styles.wrapper, pressed && styles.wrapperPressed]}
    >
      <LinearGradient
        colors={
          disabled
            ? [theme.colors.stone[200], theme.colors.stone[300]]
            : [theme.colors.ember[500], theme.colors.gold[500]]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        {/* Shine overlay */}
        <View style={styles.shine} />
        <Text style={[styles.label, disabled ? styles.labelDisabled : undefined]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    borderRadius: theme.radius.pill,
    ...theme.shadows.card,
  },
  wrapperPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  button: {
    height: theme.layout.buttonHeight,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  shine: {
    position: "absolute",
    top: 0,
    left: "10%" as unknown as number,
    right: "10%" as unknown as number,
    height: "50%" as unknown as number,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  label: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textOnDark,
    letterSpacing: 0.3,
  },
  labelDisabled: {
    color: theme.semanticColors.textMuted,
  },
});
