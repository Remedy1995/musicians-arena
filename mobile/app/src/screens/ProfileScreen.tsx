import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { UserRole } from "../AppShell";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { SecondaryButton } from "../components/SecondaryButton";
import { TextField } from "../components/TextField";
import { TopBar } from "../components/TopBar";
import { useMarketplaceData } from "../hooks/useMarketplaceData";
import { api } from "../services/api";
import { ApiError } from "../services/api/client";
import { UserSummary } from "../services/api/types";
import { theme } from "../theme/theme";

type ProfileScreenProps = {
  role: UserRole;
  currentUser: UserSummary;
  token: string;
  onExit: () => void;
  onSignOut: () => void;
  onNavigateTab: (tab: "discover" | "gigs" | "messages" | "bookings" | "profile") => void;
  focusedConversationId: string | null;
  setFocusedConversationId: (conversationId: string | null) => void;
  focusedBookingId: string | null;
  setFocusedBookingId: (bookingId: string | null) => void;
  marketplace: ReturnType<typeof useMarketplaceData>;
};

export function ProfileScreen({ role, token, onSignOut, marketplace }: ProfileScreenProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"basic" | "portfolio">("basic");
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [form, setForm] = useState({
    displayName: marketplace.me?.profile.display_name || "",
    bio: marketplace.me?.profile.bio || "",
    city: marketplace.me?.profile.city || "",
    region: marketplace.me?.profile.region || "",
    stageName: marketplace.talentProfile?.stage_name || "",
    yearsOfExperience: marketplace.talentProfile?.years_of_experience ? String(marketplace.talentProfile.years_of_experience) : "",
    fixedPriceMin: marketplace.talentProfile?.fixed_price_min || "",
    fixedPriceMax: marketplace.talentProfile?.fixed_price_max || "",
  });
  const [selectedSkillCategoryIds, setSelectedSkillCategoryIds] = useState<string[]>([]);
  const [portfolioForm, setPortfolioForm] = useState({
    mediaType: "image",
    title: "",
    description: "",
    visibility: "public",
    storageUrl: "",
  });

  useEffect(() => {
    setForm({
      displayName: marketplace.me?.profile.display_name || "",
      bio: marketplace.me?.profile.bio || "",
      city: marketplace.me?.profile.city || "",
      region: marketplace.me?.profile.region || "",
      stageName: marketplace.talentProfile?.stage_name || "",
      yearsOfExperience: marketplace.talentProfile?.years_of_experience ? String(marketplace.talentProfile.years_of_experience) : "",
      fixedPriceMin: marketplace.talentProfile?.fixed_price_min || "",
      fixedPriceMax: marketplace.talentProfile?.fixed_price_max || "",
    });
    if (role === "talent") {
      const categoryIds = new Set<string>((marketplace.talentProfile?.skills || []).map((item) => item.id));
      if (marketplace.talentProfile?.primary_category) {
        categoryIds.add(marketplace.talentProfile.primary_category);
      }
      setSelectedSkillCategoryIds(Array.from(categoryIds));
    }
  }, [marketplace.me, marketplace.talentProfile, role]);

  return (
    <Screen>
      <TopBar showNotifications={false} />

      <View style={styles.utilityRow}>
        <Pressable onPress={onSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>{role === "client" ? "Organizer profile" : "Talent profile"}</Text>
        <Text style={styles.title}>{marketplace.me?.profile.display_name || marketplace.me?.username || "Your profile"}</Text>
        <Text style={styles.body}>
          {role === "client"
            ? "Manage how organizers are represented across bookings, gigs, and conversations."
            : "Manage how your talent profile appears across discovery, gigs, and bookings."}
        </Text>
      </View>

      {role === "talent" ? (
        <View style={styles.segmentedControl}>
          <Pressable
            onPress={() => setActiveSection("basic")}
            style={[styles.segmentButton, activeSection === "basic" ? styles.segmentButtonActive : undefined]}
          >
            <Text style={[styles.segmentLabel, activeSection === "basic" ? styles.segmentLabelActive : undefined]}>
              Basic info
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveSection("portfolio")}
            style={[styles.segmentButton, activeSection === "portfolio" ? styles.segmentButtonActive : undefined]}
          >
            <Text style={[styles.segmentLabel, activeSection === "portfolio" ? styles.segmentLabelActive : undefined]}>
              Portfolio
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.form}>
        {role !== "talent" || activeSection === "basic" ? (
          <>
            <TextField label="Display name" value={form.displayName} onChangeText={(value) => setForm((current) => ({ ...current, displayName: value }))} />
            <TextField label="Bio" value={form.bio} onChangeText={(value) => setForm((current) => ({ ...current, bio: value }))} multiline />
            <TextField label="City" value={form.city} onChangeText={(value) => setForm((current) => ({ ...current, city: value }))} />
            <TextField label="Region" value={form.region} onChangeText={(value) => setForm((current) => ({ ...current, region: value }))} />
            {role === "talent" ? (
              <>
                <TextField label="Stage name" value={form.stageName} onChangeText={(value) => setForm((current) => ({ ...current, stageName: value }))} />
                <TextField
                  label="Years of experience"
                  value={form.yearsOfExperience}
                  onChangeText={(value) => setForm((current) => ({ ...current, yearsOfExperience: value }))}
                  keyboardType="phone-pad"
                />
                <TextField
                  label="Starting fixed rate"
                  value={form.fixedPriceMin}
                  onChangeText={(value) => setForm((current) => ({ ...current, fixedPriceMin: value }))}
                  keyboardType="phone-pad"
                />
                <TextField
                  label="Highest fixed rate"
                  value={form.fixedPriceMax}
                  onChangeText={(value) => setForm((current) => ({ ...current, fixedPriceMax: value }))}
                  keyboardType="phone-pad"
                />
                <View style={styles.categorySection}>
                  <SectionHeader title="Talent categories" action={`${selectedSkillCategoryIds.length} selected`} />
                  <Text style={styles.categoryIntro}>
                    These categories determine which category-restricted gigs you’re eligible to show interest in.
                  </Text>
                  <View style={styles.categoryChips}>
                    {marketplace.categories.map((category) => {
                      const selected = selectedSkillCategoryIds.includes(category.id);
                      return (
                        <Pressable
                          key={category.id}
                          onPress={() => {
                            setSelectedSkillCategoryIds((current) =>
                              current.includes(category.id)
                                ? current.filter((item) => item !== category.id)
                                : [...current, category.id],
                            );
                          }}
                          style={[styles.categoryChip, selected ? styles.categoryChipActive : undefined]}
                        >
                          <Text style={[styles.categoryChipLabel, selected ? styles.categoryChipLabelActive : undefined]}>
                            {category.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : null}
          </>
        ) : null}
        {role === "talent" && activeSection === "portfolio" ? (
          <View style={styles.portfolioSection}>
            <SectionHeader title="Portfolio" action={`${marketplace.talentMedia.length} items`} />
            <Text style={styles.portfolioIntro}>
              Keep your performance samples beside your profile so organizers can understand your sound and trust your work quickly.
            </Text>
            <View style={styles.actionStack}>
              <PrimaryButton
                label="Add portfolio sample"
                onPress={() => {
                  setPortfolioError(null);
                  setPortfolioForm({
                    mediaType: "image",
                    title: "",
                    description: "",
                    visibility: "public",
                    storageUrl: "",
                  });
                  setPortfolioOpen(true);
                }}
              />
            </View>
            <View style={styles.portfolioList}>
              {marketplace.talentMedia.length === 0 ? (
                <Text style={styles.portfolioEmpty}>No portfolio samples yet. Add a video, image, audio, or hosted link to strengthen your profile.</Text>
              ) : null}
              {marketplace.talentMedia.map((item) => (
                <View key={item.id} style={styles.portfolioCard}>
                  <Text style={styles.portfolioTitle}>{item.title}</Text>
                  <Text style={styles.portfolioMeta}>
                    {item.media_type} • {item.visibility} • {item.processing_status}
                  </Text>
                  <Text style={styles.portfolioMeta} numberOfLines={1}>
                    {item.file_url || item.storage_url}
                  </Text>
                  <SecondaryButton
                    label={savingPortfolio ? "Working..." : "Delete"}
                    onPress={() => {
                      void handleDeletePortfolio(item.id);
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {role !== "talent" || activeSection === "basic" ? (
          <PrimaryButton
            label={saving ? "Saving..." : "Save profile"}
            onPress={() => {
              void handleSave();
            }}
          />
        ) : null}
      </ScrollView>

      <Modal animationType="slide" visible={portfolioOpen} onRequestClose={() => setPortfolioOpen(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>Talent portfolio</Text>
              <Text style={styles.modalSubtitle}>Add samples that help organizers trust and book you faster.</Text>
            </View>
            <Pressable onPress={() => setPortfolioOpen(false)} style={styles.modalCloseButton}>
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <TextField label="Title" value={portfolioForm.title} onChangeText={(value) => setPortfolioForm((current) => ({ ...current, title: value }))} />
            <TextField label="Description" value={portfolioForm.description} onChangeText={(value) => setPortfolioForm((current) => ({ ...current, description: value }))} multiline />
            <TextField label="Media type (image, audio, video)" value={portfolioForm.mediaType} onChangeText={(value) => setPortfolioForm((current) => ({ ...current, mediaType: value.toLowerCase() }))} />
            <TextField label="Visibility (public or private)" value={portfolioForm.visibility} onChangeText={(value) => setPortfolioForm((current) => ({ ...current, visibility: value.toLowerCase() }))} />
            <TextField
              label="Hosted media URL"
              value={portfolioForm.storageUrl}
              onChangeText={(value) => setPortfolioForm((current) => ({ ...current, storageUrl: value }))}
              helperText="Optional if you upload a file directly."
            />
            <View style={styles.actionStack}>
              <PrimaryButton
                label={savingPortfolio ? "Uploading..." : "Pick image or video"}
                onPress={() => {
                  void handlePortfolioPick("image");
                }}
              />
              <SecondaryButton
                label="Pick document or audio"
                onPress={() => {
                  void handlePortfolioPick("document");
                }}
              />
              <SecondaryButton
                label="Save hosted URL"
                onPress={() => {
                  void handlePortfolioUrlCreate();
                }}
              />
            </View>
            {portfolioError ? <Text style={styles.error}>{portfolioError}</Text> : null}
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.updateMe(token, {
        profile: {
          display_name: form.displayName,
          bio: form.bio,
          city: form.city,
          region: form.region,
        },
      });
      if (role === "talent") {
        await api.updateTalentMe(token, {
          stage_name: form.stageName,
          years_of_experience: form.yearsOfExperience ? Number(form.yearsOfExperience) : null,
          primary_category: selectedSkillCategoryIds[0] || null,
          fixed_price_min: form.fixedPriceMin || null,
          fixed_price_max: form.fixedPriceMax || null,
          skill_category_ids: selectedSkillCategoryIds,
          profile: {
            display_name: form.displayName,
            bio: form.bio,
            city: form.city,
            region: form.region,
          },
        });
      }
      await marketplace.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePortfolioPick(source: "image" | "document") {
    setSavingPortfolio(true);
    setPortfolioError(null);
    try {
      if (source === "image") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          throw new Error("Media library permission is required to upload portfolio files.");
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images", "videos"],
          quality: 0.8,
        });
        if (result.canceled || !result.assets.length) {
          setSavingPortfolio(false);
          return;
        }
        const asset = result.assets[0];
        const detectedType = asset.type === "video" ? "video" : "image";
        const formData = new FormData();
        formData.append("media_type", detectedType);
        formData.append("title", portfolioForm.title || asset.fileName || "Portfolio sample");
        formData.append("description", portfolioForm.description);
        formData.append("visibility", portfolioForm.visibility || "public");
        formData.append("file", {
          uri: asset.uri,
          name: asset.fileName || `portfolio-${Date.now()}.${detectedType === "video" ? "mp4" : "jpg"}`,
          type: asset.mimeType || (detectedType === "video" ? "video/mp4" : "image/jpeg"),
        } as never);
        await api.createTalentMedia(token, formData);
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          multiple: false,
          type: ["audio/*", "video/*", "image/*", "*/*"],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets.length) {
          setSavingPortfolio(false);
          return;
        }
        const asset = result.assets[0];
        const inferredType = asset.mimeType?.startsWith("audio/")
          ? "audio"
          : asset.mimeType?.startsWith("video/")
            ? "video"
            : "image";
        const formData = new FormData();
        formData.append("media_type", portfolioForm.mediaType || inferredType);
        formData.append("title", portfolioForm.title || asset.name || "Portfolio sample");
        formData.append("description", portfolioForm.description);
        formData.append("visibility", portfolioForm.visibility || "public");
        formData.append("file", {
          uri: asset.uri,
          name: asset.name || `portfolio-${Date.now()}`,
          type: asset.mimeType || "application/octet-stream",
        } as never);
        await api.createTalentMedia(token, formData);
      }

      await marketplace.refresh();
      setPortfolioForm({
        mediaType: "image",
        title: "",
        description: "",
        visibility: "public",
        storageUrl: "",
      });
      setPortfolioOpen(false);
    } catch (caught) {
      setPortfolioError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to upload portfolio media.");
    } finally {
      setSavingPortfolio(false);
    }
  }

  async function handlePortfolioUrlCreate() {
    if (!portfolioForm.storageUrl.trim()) {
      setPortfolioError("Add a hosted media URL or choose a file to upload.");
      return;
    }
    setSavingPortfolio(true);
    setPortfolioError(null);
    try {
      const formData = new FormData();
      formData.append("media_type", portfolioForm.mediaType);
      formData.append("title", portfolioForm.title || "Hosted portfolio sample");
      formData.append("description", portfolioForm.description);
      formData.append("visibility", portfolioForm.visibility || "public");
      formData.append("storage_url", portfolioForm.storageUrl.trim());
      await api.createTalentMedia(token, formData);
      await marketplace.refresh();
      setPortfolioForm({
        mediaType: "image",
        title: "",
        description: "",
        visibility: "public",
        storageUrl: "",
      });
      setPortfolioOpen(false);
    } catch (caught) {
      setPortfolioError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to save portfolio item.");
    } finally {
      setSavingPortfolio(false);
    }
  }

  async function handleDeletePortfolio(mediaId: string) {
    setSavingPortfolio(true);
    setPortfolioError(null);
    try {
      await api.deleteTalentMedia(token, mediaId);
      await marketplace.refresh();
    } catch (caught) {
      setPortfolioError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to delete portfolio item.");
    } finally {
      setSavingPortfolio(false);
    }
  }
}

const styles = StyleSheet.create({
  utilityRow: {
    alignItems: "flex-end",
    paddingTop: theme.spacing[3],
  },
  signOutButton: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: "#FFF2EE",
    borderWidth: 1,
    borderColor: theme.colors.ember[300],
  },
  signOutLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.colors.ember[600],
  },
  header: {
    gap: theme.spacing[2],
    paddingTop: theme.spacing[2],
  },
  eyebrow: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["3xl"],
    lineHeight: theme.typography.lineHeight["3xl"],
    color: theme.semanticColors.textPrimary,
  },
  body: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  segmentedControl: {
    flexDirection: "row",
    gap: theme.spacing[2],
    paddingTop: theme.spacing[4],
  },
  segmentButton: {
    flex: 1,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing[3],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.stone[100],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.ink[900],
    borderColor: theme.colors.gold[400],
  },
  segmentLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  segmentLabelActive: {
    color: theme.semanticColors.textOnDark,
  },
  form: {
    gap: theme.spacing[4],
    paddingTop: theme.spacing[5],
    paddingBottom: theme.spacing[8],
  },
  portfolioSection: {
    gap: theme.spacing[4],
    marginTop: theme.spacing[2],
    borderRadius: theme.radius.xl,
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    padding: theme.spacing[5],
    ...theme.shadows.card,
  },
  portfolioIntro: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  categorySection: {
    gap: theme.spacing[3],
  },
  categoryIntro: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  categoryChip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.stone[100],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.ink[900],
    borderColor: theme.colors.gold[400],
  },
  categoryChipLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  categoryChipLabelActive: {
    color: theme.semanticColors.textOnDark,
  },
  portfolioList: {
    gap: theme.spacing[3],
  },
  portfolioCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    backgroundColor: theme.semanticColors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    gap: theme.spacing[2],
  },
  portfolioTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textPrimary,
  },
  portfolioMeta: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  portfolioEmpty: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textMuted,
  },
  actionStack: {
    gap: theme.spacing[3],
  },
  error: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.danger,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: theme.semanticColors.background,
    padding: theme.layout.screenPadding,
    gap: theme.spacing[4],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: theme.spacing[6],
    gap: theme.spacing[3],
  },
  modalTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size["2xl"],
    color: theme.semanticColors.textPrimary,
  },
  modalSubtitle: {
    marginTop: theme.spacing[1],
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  modalClose: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  modalCloseButton: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  modalContent: {
    gap: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
});
