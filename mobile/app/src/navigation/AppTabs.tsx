import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { UserRole } from "../AppShell";
import { useMarketplaceData } from "../hooks/useMarketplaceData";
import { UserSummary } from "../services/api/types";
import { BottomTabBar } from "../components/BottomTabBar";
import { BookingsScreen } from "../screens/BookingsScreen";
import { AccountHomeScreen } from "../screens/AccountHomeScreen";
import { DiscoveryScreen } from "../screens/DiscoveryScreen";
import { GigsScreen } from "../screens/GigsScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

export type TabKey = "discover" | "gigs" | "messages" | "bookings" | "profile";

type AppTabsProps = {
  role: UserRole | null;
  capabilities: Array<"talent" | "organizer">;
  currentUser: UserSummary;
  token: string;
  onRoleChange: (role: UserRole) => void;
  onCapabilityAdded: (user: UserSummary) => void;
  onExit: () => void;
  onSignOut: () => void;
};

export function AppTabs({ role, capabilities, currentUser, token, onRoleChange, onCapabilityAdded, onExit, onSignOut }: AppTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(role === "client" ? "gigs" : "discover");
  const [focusedConversationId, setFocusedConversationId] = useState<string | null>(null);
  const [focusedBookingId, setFocusedBookingId] = useState<string | null>(null);
  const [focusedGigId, setFocusedGigId] = useState<string | null>(null);
  const marketplace = useMarketplaceData(token);
  const bookingAttentionCount = marketplace.bookings.filter((booking) =>
    role === "talent" ? ["pending", "countered"].includes(booking.status) : role === "client" ? ["awaiting_deposit"].includes(booking.status) : false,
  ).length;
  const messageUnreadCount = marketplace.conversations.filter(
    (conversation) =>
      conversation.last_message &&
      !conversation.last_message.read_at &&
      conversation.last_message.sender_id !== currentUser.id,
  ).length;

  useEffect(() => {
    setActiveTab(role === "client" ? "gigs" : "discover");
  }, [role]);

  function handleCapabilityAdded(user: UserSummary) {
    onCapabilityAdded(user);
    void marketplace.refresh();
  }

  const sharedProps = {
    role,
    capabilities,
        currentUser,
        token,
    onRoleChange,
    onCapabilityAdded: handleCapabilityAdded,
    onExit,
    onSignOut,
    onNavigateTab: setActiveTab,
    onWorkspacePress: () => setActiveTab("profile"),
    focusedConversationId,
    setFocusedConversationId,
    focusedBookingId,
    setFocusedBookingId,
    focusedGigId,
    setFocusedGigId,
    onOpenGig: (gigId: string) => {
      setFocusedGigId(gigId);
      setActiveTab("gigs");
    },
    marketplace,
  };
  const roleProps = { ...sharedProps, role: role as UserRole };

  return (
    <View style={styles.container}>
      {!role ? (
        activeTab === "profile" ? (
          <ProfileScreen {...sharedProps} />
        ) : (
          <AccountHomeScreen
            activeTab={activeTab}
            capabilities={capabilities}
            currentUser={currentUser}
            marketplace={marketplace}
            token={token}
            onCapabilityAdded={handleCapabilityAdded}
            onOpenProfile={() => setActiveTab("profile")}
          />
        )
      ) : null}
      {role && activeTab === "discover" ? <DiscoveryScreen {...roleProps} /> : null}
      {role && activeTab === "gigs" ? <GigsScreen {...roleProps} /> : null}
      {role && activeTab === "messages" ? <MessagesScreen {...roleProps} /> : null}
      {role && activeTab === "bookings" ? <BookingsScreen {...roleProps} /> : null}
      {role && activeTab === "profile" ? <ProfileScreen {...sharedProps} /> : null}
      <BottomTabBar
        role={role}
        activeTab={activeTab}
        onTabPress={setActiveTab}
        badges={{
          messages: messageUnreadCount,
          bookings: bookingAttentionCount,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
