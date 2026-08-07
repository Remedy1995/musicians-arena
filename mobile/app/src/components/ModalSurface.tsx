import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../theme/theme";

type ModalSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ModalSurface({ children, style }: ModalSurfaceProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.surface,
        style,
        {
          paddingTop: Math.max(insets.top, theme.spacing[3]),
          paddingBottom: Math.max(insets.bottom, theme.spacing[3]),
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
  },
});
