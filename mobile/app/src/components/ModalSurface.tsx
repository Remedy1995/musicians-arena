import { ReactNode } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ModalSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ModalSurface({ children, style }: ModalSurfaceProps) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.surface, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
  },
});
