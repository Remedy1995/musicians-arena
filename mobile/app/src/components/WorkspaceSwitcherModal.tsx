import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { UserRole } from "../AppShell";
import { Capability } from "../services/api/types";
import { ModalSurface } from "./ModalSurface";
import { theme } from "../theme/theme";

type WorkspaceSwitcherModalProps = {
  visible: boolean;
  role: UserRole | null;
  capabilities: Capability[];
  creatingCapability?: Capability | null;
  error?: string | null;
  onClose: () => void;
  onSelectRole: (role: UserRole) => void;
  onCreateCapability: (capability: Capability) => void;
};

const workspaceOptions: Array<{
  role: UserRole;
  capability: Capability;
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  {
    role: "client",
    capability: "organizer",
    label: "Organizer",
    description: "Post opportunity gigs and build your event team.",
    icon: "briefcase-outline",
  },
  {
    role: "talent",
    capability: "talent",
    label: "Talent",
    description: "Show your work and respond to the right opportunities.",
    icon: "music-note-outline",
  },
];

export function WorkspaceSwitcherModal({
  visible,
  role,
  capabilities,
  creatingCapability = null,
  error,
  onClose,
  onSelectRole,
  onCreateCapability,
}: WorkspaceSwitcherModalProps) {
  const activeWorkspaceLabel = role === "client" ? "Organizer" : role === "talent" ? "Talent" : "Personal account";

  return (
    <Modal animationType="fade" transparent statusBarTranslucent visible={visible} onRequestClose={onClose}>
      <ModalSurface style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Your workspaces</Text>
              <Text style={styles.title}>Switch workspace</Text>
              <Text style={styles.body}>Move between the ways you participate without signing out.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close workspace switcher">
              <MaterialCommunityIcons name="close" size={20} color={theme.semanticColors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.currentWorkspace}>
            <View style={styles.currentIcon}>
              <MaterialCommunityIcons name="account-switch-outline" size={20} color={theme.colors.gold[600]} />
            </View>
            <View style={styles.currentCopy}>
              <Text style={styles.currentLabel}>Active workspace</Text>
              <Text style={styles.currentValue}>{activeWorkspaceLabel}</Text>
            </View>
            <View style={styles.activeDot} />
          </View>

          <View style={styles.options}>
            {workspaceOptions.map((option) => {
              const enabled = capabilities.includes(option.capability);
              const active = role === option.role;
              const creating = creatingCapability === option.capability;
              const actionLabel = active ? "Active" : enabled ? "Switch" : creating ? "Creating" : "Create";

              return (
                <Pressable
                  key={option.capability}
                  onPress={() => (enabled ? onSelectRole(option.role) : onCreateCapability(option.capability))}
                  style={[styles.option, active ? styles.optionActive : undefined]}
                >
                  <View style={[styles.optionIcon, active ? styles.optionIconActive : undefined]}>
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={22}
                      color={active ? theme.semanticColors.textOnDark : theme.semanticColors.primary}
                    />
                  </View>
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionTitle}>{option.label}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                  <View style={[styles.actionPill, active ? styles.actionPillActive : undefined]}>
                    <Text style={[styles.actionPillLabel, active ? styles.actionPillLabelActive : undefined]}>{actionLabel}</Text>
                    {!active ? (
                      <MaterialCommunityIcons
                        name={enabled ? "chevron-right" : "plus"}
                        size={15}
                        color={theme.semanticColors.primary}
                      />
                    ) : (
                      <MaterialCommunityIcons name="check" size={15} color={theme.colors.gold[600]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.semanticColors.danger} />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerText}>You can create the other workspace whenever you are ready.</Text>
            <Pressable onPress={onClose} style={styles.doneButton}>
              <Text style={styles.doneButtonLabel}>Done</Text>
            </Pressable>
          </View>
        </View>
      </ModalSurface>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(19, 23, 24, 0.48)",
  },
  sheet: {
    gap: theme.spacing[4],
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[2],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.semanticColors.background,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.card,
  },
  grabber: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.stone[300],
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[3],
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing[2],
  },
  eyebrow: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["2xl"],
    lineHeight: theme.typography.lineHeight["2xl"],
    color: theme.semanticColors.textPrimary,
  },
  body: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  currentWorkspace: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    backgroundColor: theme.semanticColors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.gold[300],
  },
  currentIcon: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semanticColors.accentSoft,
  },
  currentCopy: {
    flex: 1,
    gap: 2,
  },
  currentLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.colors.gold[600],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  currentValue: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  activeDot: {
    width: 9,
    height: 9,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.verdant[500],
  },
  options: {
    gap: theme.spacing[3],
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.card,
  },
  optionActive: {
    borderColor: theme.colors.gold[400],
    backgroundColor: "#FFF9EC",
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.stone[100],
  },
  optionIconActive: {
    backgroundColor: theme.semanticColors.primary,
  },
  optionCopy: {
    flex: 1,
    gap: theme.spacing[1],
  },
  optionTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  optionDescription: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.stone[100],
  },
  actionPillActive: {
    backgroundColor: theme.semanticColors.accentSoft,
  },
  actionPillLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.primary,
  },
  actionPillLabelActive: {
    color: theme.colors.gold[600],
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  footerText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.semanticColors.textMuted,
  },
  doneButton: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.semanticColors.primary,
  },
  doneButtonLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textOnDark,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    backgroundColor: "#FFF0ED",
    borderWidth: 1,
    borderColor: "#F5C5BC",
  },
  error: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.danger,
  },
});
