import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../theme/theme";

type ModalSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ModalSurface({ children, style }: ModalSurfaceProps) {
  const backgroundColor = StyleSheet.flatten(style)?.backgroundColor ?? theme.semanticColors.background;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.safeArea, { backgroundColor }]}>
      <View style={[styles.surface, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  surface: {
    flex: 1,
    backgroundColor: theme.semanticColors.background,
  },
});
