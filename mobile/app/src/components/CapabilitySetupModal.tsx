import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import { Capability, TalentCategory } from "../services/api/types";
import { ModalSurface } from "./ModalSurface";
import { PrimaryButton } from "./PrimaryButton";
import { TextField } from "./TextField";
import { theme } from "../theme/theme";

export type CapabilitySetupPayload = {
  display_name?: string;
  organization_name?: string;
  organization_location?: string;
  organization_description?: string;
  skill_category_ids?: string[];
};

type CapabilitySetupModalProps = {
  visible: boolean;
  capability: Capability | null;
  categories: TalentCategory[];
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: CapabilitySetupPayload) => void;
};

export function CapabilitySetupModal({
  visible,
  capability,
  categories,
  submitting = false,
  error,
  onClose,
  onSubmit,
}: CapabilitySetupModalProps) {
  const isOrganizer = capability === "organizer";
  const [form, setForm] = useCapabilityForm(visible, capability);

  if (!capability) return null;

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <ModalSurface style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{isOrganizer ? "Organizer profile" : "Talent profile"}</Text>
            <Text style={styles.title}>{isOrganizer ? "Set up your organization" : "Set up your talent profile"}</Text>
            <Text style={styles.subtitle}>
              {isOrganizer
                ? "Give people enough context to trust the organization behind each opportunity."
                : "Tell organizers what you do so the right opportunities find you."}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close profile setup">
            <MaterialCommunityIcons name="close" size={20} color={theme.semanticColors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {isOrganizer ? (
            <>
              <TextField
                label="Organization name"
                value={form.organizationName}
                onChangeText={(value) => setForm((current) => ({ ...current, organizationName: value }))}
                placeholder="e.g. Grace Chapel"
              />
              <TextField
                label="Organization location"
                value={form.organizationLocation}
                onChangeText={(value) => setForm((current) => ({ ...current, organizationLocation: value }))}
                placeholder="e.g. East Legon, Accra"
              />
              <TextField
                label="About the organization"
                value={form.organizationDescription}
                onChangeText={(value) => setForm((current) => ({ ...current, organizationDescription: value }))}
                placeholder="Describe the services, church, or events you organize."
                multiline
              />
            </>
          ) : (
            <>
              <TextField
                label="Display name"
                value={form.displayName}
                onChangeText={(value) => setForm((current) => ({ ...current, displayName: value }))}
                placeholder="How organizers should know you"
              />
              <View style={styles.categoryGroup}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.fieldLabel}>Talent categories</Text>
                  <Text style={styles.categoryCount}>{form.skillCategoryIds.length} selected</Text>
                </View>
                <Text style={styles.helperText}>Select every role you can confidently perform.</Text>
                <View style={styles.categoryList}>
                  {categories.map((category) => {
                    const selected = form.skillCategoryIds.includes(category.id);
                    return (
                      <Pressable
                        key={category.id}
                        onPress={() =>
                          setForm((current) => ({
                            ...current,
                            skillCategoryIds: selected
                              ? current.skillCategoryIds.filter((item) => item !== category.id)
                              : [...current.skillCategoryIds, category.id],
                          }))
                        }
                        style={[styles.categoryChip, selected ? styles.categoryChipActive : undefined]}
                      >
                        <Text style={[styles.categoryLabel, selected ? styles.categoryLabelActive : undefined]}>{category.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label={submitting ? "Creating profile..." : isOrganizer ? "Create organizer profile" : "Create talent profile"}
            disabled={submitting}
            onPress={() =>
              onSubmit(
                isOrganizer
                  ? {
                      organization_name: form.organizationName.trim(),
                      organization_location: form.organizationLocation.trim(),
                      organization_description: form.organizationDescription.trim(),
                    }
                  : {
                      display_name: form.displayName.trim(),
                      skill_category_ids: form.skillCategoryIds,
                    },
              )
            }
          />
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelLabel}>Not now</Text>
          </Pressable>
        </ScrollView>
      </ModalSurface>
    </Modal>
  );
}

function useCapabilityForm(visible: boolean, capability: Capability | null) {
  const [form, setForm] = useState({
    displayName: "",
    organizationName: "",
    organizationLocation: "",
    organizationDescription: "",
    skillCategoryIds: [] as string[],
  });

  useEffect(() => {
    if (visible) {
      setForm({
        displayName: "",
        organizationName: "",
        organizationLocation: "",
        organizationDescription: "",
        skillCategoryIds: [],
      });
    }
  }, [capability, visible]);

  return [form, setForm] as const;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.semanticColors.background,
    paddingHorizontal: theme.layout.screenPadding,
    gap: theme.spacing[4],
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
  subtitle: {
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
  content: {
    gap: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  categoryGroup: {
    gap: theme.spacing[2],
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  categoryCount: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.colors.gold[600],
  },
  helperText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.semanticColors.textMuted,
  },
  categoryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  categoryChip: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.stone[100],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.ink[900],
    borderColor: theme.colors.ink[900],
  },
  categoryLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  categoryLabelActive: {
    color: theme.semanticColors.textOnDark,
  },
  error: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.danger,
  },
  cancelButton: {
    minHeight: theme.layout.buttonHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textSecondary,
  },
});
