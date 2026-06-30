import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

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
  const { width } = useWindowDimensions();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"basic" | "portfolio">("basic");
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [savingProfilePhoto, setSavingProfilePhoto] = useState(false);
  const [localProfilePhotoUri, setLocalProfilePhotoUri] = useState<string | null>(null);
  const [portfolioFilter, setPortfolioFilter] = useState<"all" | "image" | "video" | "audio" | "link">("all");
  const [portfolioEntryMode, setPortfolioEntryMode] = useState<"upload" | "link">("upload");
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
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
  const portfolioLimits = {
    image: 8 * 1024 * 1024,
    audio: 20 * 1024 * 1024,
    video: 60 * 1024 * 1024,
  } as const;
  const portfolioItems = useMemo(
    () => [...marketplace.talentMedia].sort((left, right) => right.created_at.localeCompare(left.created_at)),
    [marketplace.talentMedia],
  );
  const filteredPortfolioItems = useMemo(
    () =>
      portfolioItems.filter((item) =>
        portfolioFilter === "all" ? true : portfolioFilter === "link" ? isHostedLinkItem(item) : item.media_type === portfolioFilter,
      ),
    [portfolioFilter, portfolioItems],
  );
  const selectedMedia = useMemo(
    () => portfolioItems.find((item) => item.id === selectedMediaId) ?? null,
    [portfolioItems, selectedMediaId],
  );
  const portfolioCounts = useMemo(
    () => ({
      all: portfolioItems.length,
      image: portfolioItems.filter((item) => item.media_type === "image").length,
      video: portfolioItems.filter((item) => item.media_type === "video").length,
      audio: portfolioItems.filter((item) => item.media_type === "audio").length,
      link: portfolioItems.filter((item) => isHostedLinkItem(item)).length,
    }),
    [portfolioItems],
  );
  const tileGap = theme.spacing[2];
  const tileWidth = Math.max(Math.floor((width - theme.layout.screenPadding * 2 - tileGap * 2) / 3), 92);

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

  useEffect(() => {
    if (marketplace.me?.profile.profile_image_url) {
      setLocalProfilePhotoUri(marketplace.me.profile.profile_image_url);
    }
  }, [marketplace.me?.profile.profile_image_url]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  return (
    <Screen>
      <TopBar showNotifications={false} />

      <View style={styles.utilityRow}>
        <Pressable onPress={onSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <View style={styles.profileHeroRow}>
          <Pressable
            onPress={() => {
              void handleProfilePhotoPick();
            }}
            style={styles.avatarPressable}
          >
            {localProfilePhotoUri ? (
              <Image source={{ uri: localProfilePhotoUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackLabel}>
                  {getInitials(marketplace.me?.profile.display_name || marketplace.me?.username || "Profile")}
                </Text>
              </View>
            )}
            <View style={styles.avatarCameraBadge}>
              <MaterialCommunityIcons name="camera-outline" size={16} color={theme.semanticColors.textOnDark} />
            </View>
          </Pressable>
          <View style={styles.avatarMeta}>
            <Text style={styles.avatarLabel}>{role === "client" ? "Organizer profile" : "Talent profile"}</Text>
            <Pressable
              onPress={() => {
                void handleProfilePhotoPick();
              }}
              style={styles.avatarAction}
            >
              <Text style={styles.avatarActionLabel}>{savingProfilePhoto ? "Uploading..." : localProfilePhotoUri ? "Change photo" : "Add photo"}</Text>
            </Pressable>
          </View>
        </View>
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
        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
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
            <SectionHeader title="Portfolio" action={`${portfolioItems.length} items`} />
            <View style={styles.portfolioHero}>
              <View style={styles.portfolioHeroHeader}>
                <View style={styles.portfolioHeroBadge}>
                  <MaterialCommunityIcons name="play-box-multiple-outline" size={18} color={theme.colors.gold[500]} />
                  <Text style={styles.portfolioHeroBadgeLabel}>Creator reel</Text>
                </View>
                <Pressable
                  onPress={() => {
                  setPortfolioError(null);
                  setPortfolioEntryMode("upload");
                  setPortfolioForm({
                    mediaType: "image",
                    title: "",
                      description: "",
                      visibility: "public",
                      storageUrl: "",
                    });
                    setPortfolioOpen(true);
                  }}
                  style={styles.addPortfolioButton}
                >
                  <MaterialCommunityIcons name="plus" size={18} color={theme.semanticColors.textOnDark} />
                  <Text style={styles.addPortfolioButtonLabel}>Upload</Text>
                </Pressable>
              </View>
              <Text style={styles.portfolioHeroTitle}>Show your strongest moments first.</Text>
              <Text style={styles.portfolioIntro}>
                Arrange clips and visuals like a performance reel so organizers can scan your work quickly before they book you.
              </Text>
              <View style={styles.portfolioStatsRow}>
                <View style={styles.portfolioStatCard}>
                  <Text style={styles.portfolioStatValue}>{portfolioCounts.video}</Text>
                  <Text style={styles.portfolioStatLabel}>Videos</Text>
                </View>
                <View style={styles.portfolioStatCard}>
                  <Text style={styles.portfolioStatValue}>{portfolioCounts.image}</Text>
                  <Text style={styles.portfolioStatLabel}>Photos</Text>
                </View>
                <View style={styles.portfolioStatCard}>
                  <Text style={styles.portfolioStatValue}>{portfolioCounts.audio}</Text>
                  <Text style={styles.portfolioStatLabel}>Audio</Text>
                </View>
                <View style={styles.portfolioStatCard}>
                  <Text style={styles.portfolioStatValue}>{portfolioCounts.link}</Text>
                  <Text style={styles.portfolioStatLabel}>Links</Text>
                </View>
              </View>
            </View>
            <View style={styles.portfolioFilterRow}>
              {([
                ["all", "All"],
                ["video", "Videos"],
                ["image", "Photos"],
                ["audio", "Audio"],
                ["link", "Links"],
              ] as const).map(([key, label]) => {
                const active = portfolioFilter === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setPortfolioFilter(key)}
                    style={[styles.portfolioFilterChip, active ? styles.portfolioFilterChipActive : undefined]}
                  >
                    <Text style={[styles.portfolioFilterChipLabel, active ? styles.portfolioFilterChipLabelActive : undefined]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.portfolioGrid}>
              {filteredPortfolioItems.length === 0 ? (
                <View style={styles.portfolioEmptyState}>
                  <MaterialCommunityIcons name="image-multiple-outline" size={28} color={theme.colors.gold[500]} />
                  <Text style={styles.portfolioEmpty}>No media in this view yet. Upload a clip, photo, or audio sample to build your reel.</Text>
                </View>
              ) : null}
              {filteredPortfolioItems.map((item) => {
                const previewUrl = item.thumbnail_url || item.file_url || item.storage_url;
                const isImage = item.media_type === "image" && previewUrl;
                const isHostedLink = isHostedLinkItem(item);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedMediaId(item.id)}
                    style={[styles.portfolioTile, { width: tileWidth, height: Math.round(tileWidth * 1.38) }]}
                  >
                    {isHostedLink ? (
                      <View style={styles.portfolioTileLinkCard}>
                        <View style={styles.portfolioLinkIconWrap}>
                          <MaterialCommunityIcons name="link-variant" size={24} color={theme.semanticColors.textOnDark} />
                        </View>
                        <Text style={styles.portfolioLinkLabel}>Hosted link</Text>
                        <Text style={styles.portfolioLinkUrl} numberOfLines={3}>
                          {item.storage_url}
                        </Text>
                      </View>
                    ) : isImage ? (
                      <Image source={{ uri: previewUrl }} style={styles.portfolioTileImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.portfolioTileFallback, item.media_type === "video" ? styles.portfolioTileVideo : styles.portfolioTileAudio]}>
                        <MaterialCommunityIcons
                          name={item.media_type === "video" ? "play-circle-outline" : "waveform"}
                          size={26}
                          color={theme.semanticColors.textOnDark}
                        />
                      </View>
                    )}
                    <View style={styles.portfolioTileOverlay}>
                      <View style={styles.portfolioTypeBadge}>
                        <MaterialCommunityIcons
                          name={
                            isHostedLink
                              ? "link-variant"
                              : item.media_type === "video"
                                ? "play"
                                : item.media_type === "audio"
                                  ? "music-note"
                                  : "image-outline"
                          }
                          size={14}
                          color={theme.semanticColors.textOnDark}
                        />
                        <Text style={styles.portfolioTypeBadgeLabel}>{isHostedLink ? "Link" : formatPortfolioType(item.media_type)}</Text>
                      </View>
                      <Text style={styles.portfolioTileTitle} numberOfLines={2}>
                        {item.title || "Portfolio sample"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
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
            <View style={styles.entryModeRow}>
              {([
                ["upload", "Upload file"],
                ["link", "Add link"],
              ] as const).map(([mode, label]) => {
                const selected = portfolioEntryMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => setPortfolioEntryMode(mode)}
                    style={[styles.entryModeChip, selected ? styles.entryModeChipActive : undefined]}
                  >
                    <Text style={[styles.entryModeChipLabel, selected ? styles.entryModeChipLabelActive : undefined]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextField label="Title" value={portfolioForm.title} onChangeText={(value) => setPortfolioForm((current) => ({ ...current, title: value }))} />
            <TextField label="Description" value={portfolioForm.description} onChangeText={(value) => setPortfolioForm((current) => ({ ...current, description: value }))} multiline />
            <View style={styles.modalSelectorGroup}>
              <Text style={styles.modalSelectorLabel}>Media type</Text>
              <View style={styles.selectorRow}>
                {(["image", "audio", "video"] as const).map((mediaType) => {
                  const selected = portfolioForm.mediaType === mediaType;
                  return (
                    <Pressable
                      key={mediaType}
                      onPress={() => setPortfolioForm((current) => ({ ...current, mediaType }))}
                      style={[styles.selectorChip, selected ? styles.selectorChipActive : undefined]}
                    >
                      <Text style={[styles.selectorChipLabel, selected ? styles.selectorChipLabelActive : undefined]}>
                        {mediaType}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.modalSelectorGroup}>
              <Text style={styles.modalSelectorLabel}>Visibility</Text>
              <View style={styles.selectorRow}>
                {(["public", "private"] as const).map((visibility) => {
                  const selected = portfolioForm.visibility === visibility;
                  return (
                    <Pressable
                      key={visibility}
                      onPress={() => setPortfolioForm((current) => ({ ...current, visibility }))}
                      style={[styles.selectorChip, selected ? styles.selectorChipActive : undefined]}
                    >
                      <Text style={[styles.selectorChipLabel, selected ? styles.selectorChipLabelActive : undefined]}>
                        {visibility}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {portfolioEntryMode === "link" ? (
              <TextField
                label="Hosted media URL"
                value={portfolioForm.storageUrl}
                onChangeText={(value) => setPortfolioForm((current) => ({ ...current, storageUrl: value }))}
                helperText="Use a YouTube, cloud storage, or another hosted media link."
                keyboardType="url"
              />
            ) : null}
            <View style={styles.actionStack}>
              <PrimaryButton
                label={savingPortfolio ? "Uploading..." : portfolioEntryMode === "link" ? "Save link" : "Upload media"}
                onPress={() => {
                  if (portfolioEntryMode === "link") {
                    void handlePortfolioUrlCreate();
                    return;
                  }
                  void handlePortfolioPick(portfolioForm.mediaType === "audio" ? "document" : "image");
                }}
              />
            </View>
            {portfolioError ? <Text style={styles.error}>{portfolioError}</Text> : null}
          </ScrollView>
        </View>
      </Modal>
      <Modal animationType="slide" visible={Boolean(selectedMedia)} onRequestClose={() => setSelectedMediaId(null)}>
        <View style={styles.mediaModalScreen}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={[styles.modalTitle, styles.mediaModalTitle]}>{selectedMedia?.title || "Portfolio sample"}</Text>
              <Text style={[styles.modalSubtitle, styles.mediaModalSubtitle]}>Portfolio preview</Text>
            </View>
            <Pressable onPress={() => setSelectedMediaId(null)} style={styles.modalCloseButton}>
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          {selectedMedia ? (
            <ScrollView contentContainerStyle={styles.mediaModalContent}>
              {isHostedLinkItem(selectedMedia) ? (
                <View style={styles.mediaLinkDetailCard}>
                  <View style={styles.mediaLinkHero}>
                    <MaterialCommunityIcons name="link-variant" size={42} color={theme.semanticColors.textOnDark} />
                    <Text style={styles.mediaLinkHeroLabel}>Hosted media link</Text>
                  </View>
                  <Text style={styles.mediaLinkUrl} selectable>
                    {selectedMedia.storage_url}
                  </Text>
                  <PrimaryButton
                    label="Open link"
                    onPress={() => {
                      void Linking.openURL(selectedMedia.storage_url);
                    }}
                  />
                </View>
              ) : (
                <View style={styles.mediaPreviewFrame}>
                  {selectedMedia.media_type === "image" && (selectedMedia.thumbnail_url || selectedMedia.file_url || selectedMedia.storage_url) ? (
                  <Image
                    source={{ uri: selectedMedia.thumbnail_url || selectedMedia.file_url || selectedMedia.storage_url }}
                    style={styles.mediaPreviewImage}
                    resizeMode="cover"
                  />
                  ) : (
                    <View
                      style={[
                        styles.mediaPreviewFallback,
                        selectedMedia.media_type === "video" ? styles.mediaPreviewVideo : styles.mediaPreviewAudio,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={selectedMedia.media_type === "video" ? "play-circle-outline" : "waveform"}
                        size={54}
                        color={theme.semanticColors.textOnDark}
                      />
                      <Text style={styles.mediaPreviewFallbackLabel}>
                        {selectedMedia.media_type === "video" ? "Video sample" : "Audio sample"}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <View style={styles.mediaInfoCard}>
                <View style={styles.mediaInfoHeader}>
                  <View style={styles.mediaTypePill}>
                    <Text style={styles.mediaTypePillLabel}>
                      {isHostedLinkItem(selectedMedia) ? "Link" : formatPortfolioType(selectedMedia.media_type)}
                    </Text>
                  </View>
                  <Text style={styles.mediaProcessingLabel}>{formatPortfolioStatus(selectedMedia.processing_status)}</Text>
                </View>
                <Text style={styles.mediaInfoTitle}>{selectedMedia.title || "Portfolio sample"}</Text>
                <Text style={styles.mediaInfoDescription}>
                  {selectedMedia.description || "No description added yet. You can still use this sample to show your range."}
                </Text>
                <View style={styles.mediaMetaStack}>
                  <Text style={styles.mediaMetaLine}>Visibility: {selectedMedia.visibility}</Text>
                  <Text style={styles.mediaMetaLine}>Uploaded: {formatPortfolioDate(selectedMedia.created_at)}</Text>
                  {isHostedLinkItem(selectedMedia) ? <Text style={styles.mediaMetaLine}>Source: Hosted URL</Text> : null}
                  {selectedMedia.file_size_bytes ? (
                    <Text style={styles.mediaMetaLine}>Size: {formatFileSize(selectedMedia.file_size_bytes)}</Text>
                  ) : null}
                </View>
                <SecondaryButton
                  label={savingPortfolio ? "Working..." : isHostedLinkItem(selectedMedia) ? "Delete link" : "Delete media"}
                  onPress={() => {
                    void handleDeletePortfolio(selectedMedia.id);
                    setSelectedMediaId(null);
                  }}
                />
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
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
      setSuccessMessage("Profile updated successfully.");
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
        validatePortfolioAsset({
          type: detectedType,
          mimeType: asset.mimeType || (detectedType === "video" ? "video/mp4" : "image/jpeg"),
          fileSize: asset.fileSize ?? 0,
          limits: portfolioLimits,
        });
        const formData = new FormData();
        formData.append("media_type", detectedType);
        formData.append("title", portfolioForm.title || asset.fileName || "Portfolio sample");
        formData.append("description", portfolioForm.description);
        formData.append("visibility", portfolioForm.visibility || "public");
        await appendUploadFile(formData, "file", {
          uri: asset.uri,
          name: asset.fileName || `portfolio-${Date.now()}.${detectedType === "video" ? "mp4" : "jpg"}`,
          type: asset.mimeType || (detectedType === "video" ? "video/mp4" : "image/jpeg"),
          webFile: "file" in asset ? asset.file : undefined,
        });
        await api.createTalentMedia(token, formData);
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          multiple: false,
          type: portfolioForm.mediaType === "audio" ? ["audio/*"] : portfolioForm.mediaType === "video" ? ["video/*"] : ["image/*"],
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
        const normalizedType = portfolioForm.mediaType || inferredType;
        validatePortfolioAsset({
          type: normalizedType as "image" | "audio" | "video",
          mimeType: asset.mimeType || "application/octet-stream",
          fileSize: asset.size ?? 0,
          limits: portfolioLimits,
        });
        const formData = new FormData();
        formData.append("media_type", normalizedType);
        formData.append("title", portfolioForm.title || asset.name || "Portfolio sample");
        formData.append("description", portfolioForm.description);
        formData.append("visibility", portfolioForm.visibility || "public");
        await appendUploadFile(formData, "file", {
          uri: asset.uri,
          name: asset.name || `portfolio-${Date.now()}`,
          type: asset.mimeType || "application/octet-stream",
          webFile: "file" in asset ? asset.file : undefined,
        });
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
    try {
      const parsed = new URL(portfolioForm.storageUrl.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Hosted media URL must start with http or https.");
      }
    } catch (caught) {
      setPortfolioError(caught instanceof Error ? caught.message : "Enter a valid hosted media URL.");
      return;
    }
    setSavingPortfolio(true);
    setPortfolioError(null);
    try {
      await api.createTalentMediaLink(token, {
        media_type: portfolioForm.mediaType as "image" | "audio" | "video",
        title: portfolioForm.title || "Hosted portfolio sample",
        description: portfolioForm.description,
        visibility: (portfolioForm.visibility || "public") as "public" | "private",
        storage_url: portfolioForm.storageUrl.trim(),
      });
      await marketplace.refresh();
      setSuccessMessage("Portfolio link added.");
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

  async function handleProfilePhotoPick() {
    setSavingProfilePhoto(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Media library permission is required to upload a profile photo.");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets.length) {
        setSavingProfilePhoto(false);
        return;
      }

      const asset = result.assets[0];
      setLocalProfilePhotoUri(asset.uri);
      validatePortfolioAsset({
        type: "image",
        mimeType: asset.mimeType || "image/jpeg",
        fileSize: asset.fileSize ?? 0,
        limits: portfolioLimits,
      });

      const formData = new FormData();
      await appendUploadFile(formData, "profile_image", {
        uri: asset.uri,
        name: asset.fileName || `profile-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
        webFile: "file" in asset ? asset.file : undefined,
      });

      const uploadedProfile = await api.uploadProfilePhoto(token, formData);
      setLocalProfilePhotoUri(uploadedProfile.profile_image_url || asset.uri);
      await marketplace.refresh();
      setSuccessMessage("Profile photo updated.");
    } catch (caught) {
      if (!marketplace.me?.profile.profile_image_url) {
        setLocalProfilePhotoUri(null);
      } else {
        setLocalProfilePhotoUri(marketplace.me.profile.profile_image_url);
      }
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Unable to upload profile photo.");
    } finally {
      setSavingProfilePhoto(false);
    }
  }
}

function validatePortfolioAsset({
  type,
  mimeType,
  fileSize,
  limits,
}: {
  type: "image" | "audio" | "video";
  mimeType: string;
  fileSize: number;
  limits: { image: number; audio: number; video: number };
}) {
  const allowedTypes = {
    image: ["image/jpeg", "image/png", "image/webp"],
    audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4"],
    video: ["video/mp4", "video/quicktime", "video/webm"],
  };

  if (fileSize > limits[type]) {
    throw new Error(
      `${type.charAt(0).toUpperCase() + type.slice(1)} files must be ${Math.round(limits[type] / (1024 * 1024))}MB or smaller.`,
    );
  }

  if (mimeType && !allowedTypes[type].includes(mimeType)) {
    throw new Error(`Unsupported ${type} format selected for upload.`);
  }
}

function formatPortfolioType(value: "image" | "audio" | "video") {
  switch (value) {
    case "image":
      return "Photo";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    default:
      return value;
  }
}

function formatPortfolioStatus(value: "pending" | "ready" | "failed") {
  switch (value) {
    case "ready":
      return "Ready to share";
    case "pending":
      return "Processing";
    case "failed":
      return "Needs attention";
    default:
      return value;
  }
}

function formatPortfolioDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function formatFileSize(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function isHostedLinkItem(item: {
  storage_url: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string;
}) {
  return Boolean(item.storage_url) && item.storage_url !== item.file_url;
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

async function appendUploadFile(
  formData: FormData,
  field: string,
  file: { uri: string; name: string; type: string; webFile?: File | null },
) {
  if (Platform.OS === "web" && file.webFile) {
    formData.append(field, file.webFile, file.name);
    return;
  }

  try {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    formData.append(field, blob, file.name);
  } catch {
    formData.append(field, {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as never);
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
  profileHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  avatarPressable: {
    width: 92,
    height: 92,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: theme.colors.ink[900],
    position: "relative",
    ...theme.shadows.card,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.ink[900],
  },
  avatarFallbackLabel: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["2xl"],
    color: theme.semanticColors.textOnDark,
  },
  avatarCameraBadge: {
    position: "absolute",
    right: theme.spacing[2],
    bottom: theme.spacing[2],
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.ember[500],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.semanticColors.surface,
  },
  avatarMeta: {
    flex: 1,
    gap: theme.spacing[2],
  },
  avatarLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  avatarAction: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  avatarActionLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
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
  },
  portfolioHero: {
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.ink[900],
    borderWidth: 1,
    borderColor: theme.colors.gold[400],
    padding: theme.spacing[5],
    gap: theme.spacing[4],
    ...theme.shadows.floating,
  },
  portfolioHeroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  portfolioHeroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  portfolioHeroBadgeLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textOnDark,
  },
  addPortfolioButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.ember[500],
  },
  addPortfolioButtonLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textOnDark,
  },
  portfolioHeroTitle: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["2xl"],
    lineHeight: theme.typography.lineHeight["2xl"],
    color: theme.semanticColors.textOnDark,
  },
  portfolioIntro: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: "rgba(255,255,255,0.72)",
  },
  portfolioStatsRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
    flexWrap: "wrap",
  },
  portfolioStatCard: {
    minWidth: 72,
    flexGrow: 1,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: theme.spacing[1],
  },
  portfolioStatValue: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size.xl,
    color: theme.semanticColors.textOnDark,
  },
  portfolioStatLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: "rgba(255,255,255,0.64)",
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
  portfolioFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  portfolioFilterChip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  portfolioFilterChipActive: {
    backgroundColor: theme.colors.ink[900],
    borderColor: theme.colors.gold[400],
  },
  portfolioFilterChipLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  portfolioFilterChipLabelActive: {
    color: theme.semanticColors.textOnDark,
  },
  portfolioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  portfolioTile: {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    backgroundColor: theme.colors.ink[900],
    justifyContent: "flex-end",
    ...theme.shadows.card,
  },
  portfolioTileImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  portfolioTileFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  portfolioTileLinkCard: {
    flex: 1,
    backgroundColor: theme.colors.ink[800],
    padding: theme.spacing[3],
    justifyContent: "space-between",
  },
  portfolioLinkIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  portfolioLinkLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textOnDark,
  },
  portfolioLinkUrl: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
    color: "rgba(255,255,255,0.7)",
  },
  portfolioTileVideo: {
    backgroundColor: theme.colors.ink[900],
  },
  portfolioTileAudio: {
    backgroundColor: theme.colors.teal[600],
  },
  portfolioTileOverlay: {
    gap: theme.spacing[2],
    padding: theme.spacing[3],
    backgroundColor: "rgba(17, 19, 21, 0.48)",
  },
  portfolioTypeBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  portfolioTypeBadgeLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textOnDark,
  },
  portfolioTileTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textOnDark,
  },
  portfolioEmptyState: {
    width: "100%",
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    alignItems: "center",
    gap: theme.spacing[3],
  },
  portfolioEmpty: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textMuted,
    textAlign: "center",
  },
  actionStack: {
    gap: theme.spacing[3],
  },
  modalSelectorGroup: {
    gap: theme.spacing[2],
  },
  modalSelectorLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  selectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  selectorChip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  selectorChipActive: {
    backgroundColor: theme.colors.ink[900],
    borderColor: theme.colors.gold[400],
  },
  selectorChipLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
    textTransform: "capitalize",
  },
  selectorChipLabelActive: {
    color: theme.semanticColors.textOnDark,
  },
  error: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.danger,
  },
  success: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.success,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: theme.semanticColors.background,
    padding: theme.layout.screenPadding,
    gap: theme.spacing[4],
  },
  mediaModalScreen: {
    flex: 1,
    backgroundColor: theme.colors.ink[900],
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
  mediaModalTitle: {
    color: theme.semanticColors.textOnDark,
  },
  mediaModalSubtitle: {
    color: "rgba(255,255,255,0.7)",
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
  entryModeRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  entryModeChip: {
    flex: 1,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing[3],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.stone[100],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  entryModeChipActive: {
    backgroundColor: theme.colors.ink[900],
    borderColor: theme.colors.gold[400],
  },
  entryModeChipLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  entryModeChipLabelActive: {
    color: theme.semanticColors.textOnDark,
  },
  mediaModalContent: {
    gap: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  mediaPreviewFrame: {
    borderRadius: theme.radius.xl,
    overflow: "hidden",
    backgroundColor: theme.colors.ink[800],
    minHeight: 420,
  },
  mediaPreviewImage: {
    width: "100%",
    height: 420,
  },
  mediaPreviewFallback: {
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
  },
  mediaPreviewVideo: {
    backgroundColor: theme.colors.ink[800],
  },
  mediaPreviewAudio: {
    backgroundColor: theme.colors.teal[600],
  },
  mediaPreviewFallbackLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textOnDark,
  },
  mediaLinkDetailCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    backgroundColor: theme.colors.ink[800],
    gap: theme.spacing[4],
  },
  mediaLinkHero: {
    alignItems: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[6],
  },
  mediaLinkHeroLabel: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size.xl,
    color: theme.semanticColors.textOnDark,
  },
  mediaLinkUrl: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: "rgba(255,255,255,0.82)",
  },
  mediaInfoCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    backgroundColor: theme.semanticColors.surface,
    gap: theme.spacing[4],
  },
  mediaInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[3],
  },
  mediaTypePill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.semanticColors.accentSoft,
  },
  mediaTypePillLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.colors.gold[600],
  },
  mediaProcessingLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textSecondary,
  },
  mediaInfoTitle: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size.xl,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.semanticColors.textPrimary,
  },
  mediaInfoDescription: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  mediaMetaStack: {
    gap: theme.spacing[2],
  },
  mediaMetaLine: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textMuted,
  },
});
