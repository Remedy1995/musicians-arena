import { useEffect, useState } from "react";

import { UserRole } from "../AppShell";
import { useMarketplaceData } from "../hooks/useMarketplaceData";
import { UserSummary } from "../services/api/types";
import { BottomTabBar } from "../components/BottomTabBar";
import { BookingsScreen } from "../screens/BookingsScreen";
import { DiscoveryScreen } from "../screens/DiscoveryScreen";
import { GigsScreen } from "../screens/GigsScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

export type TabKey = "discover" | "gigs" | "messages" | "bookings" | "profile";

type AppTabsProps = {
  role: UserRole;
  currentUser: UserSummary;
  token: string;
  onExit: () => void;
  onSignOut: () => void;
};

export function AppTabs({ role, currentUser, token, onExit, onSignOut }: AppTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(role === "client" ? "gigs" : "discover");
  const [focusedConversationId, setFocusedConversationId] = useState<string | null>(null);
  const [focusedBookingId, setFocusedBookingId] = useState<string | null>(null);
  const marketplace = useMarketplaceData(token);
  const bookingAttentionCount = marketplace.bookings.filter((booking) =>
    ["pending", "countered", "awaiting_deposit"].includes(booking.status),
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

  const sharedProps = {
    role,
    currentUser,
    token,
    onExit,
    onSignOut,
    onNavigateTab: setActiveTab,
    focusedConversationId,
    setFocusedConversationId,
    focusedBookingId,
    setFocusedBookingId,
    marketplace,
  };

  return (
    <>
      {activeTab === "discover" ? <DiscoveryScreen {...sharedProps} /> : null}
      {activeTab === "gigs" ? <GigsScreen {...sharedProps} /> : null}
      {activeTab === "messages" ? <MessagesScreen {...sharedProps} /> : null}
      {activeTab === "bookings" ? <BookingsScreen {...sharedProps} /> : null}
      {activeTab === "profile" ? <ProfileScreen {...sharedProps} /> : null}
      <BottomTabBar
        role={role}
        activeTab={activeTab}
        onTabPress={setActiveTab}
        badges={{
          messages: messageUnreadCount,
          bookings: bookingAttentionCount,
        }}
      />
    </>
  );
}
