import { ReactNode } from "react";
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../theme/theme";

type ScreenProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, contentContainerStyle, innerStyle }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, contentContainerStyle]}
      >
        <View style={[styles.inner, innerStyle]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.semanticColors.background,
  },
  content: {
    paddingBottom: theme.spacing[10],
  },
  inner: {
    paddingHorizontal: theme.layout.screenPadding,
    gap: theme.layout.sectionGap,
  },
});
