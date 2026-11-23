import { StyleSheet, Text, View } from "react-native";

import { WorkspaceButton } from "./WorkspaceButton";
import { theme } from "../theme/theme";

type PageHeaderProps = {
  title: string;
  body: string;
  workspaceLabel: string;
  onWorkspacePress?: () => void;
};

export function PageHeader({ title, body, workspaceLabel, onWorkspacePress }: PageHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <WorkspaceButton label={workspaceLabel} onPress={onWorkspacePress} iconOnly />
      </View>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing[2],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[1],
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  title: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["3xl"],
    lineHeight: theme.typography.lineHeight["3xl"],
    letterSpacing: -0.7,
    color: theme.semanticColors.textPrimary,
  },
  body: {
    maxWidth: 560,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.semanticColors.textSecondary,
  },
});
