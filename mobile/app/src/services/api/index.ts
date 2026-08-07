import { apiRequest } from "./client";
import {
  AuthResponse,
  BookingItem,
  BookingPaymentSummary,
  PaystackCheckout,
  ConversationItem,
  DisputeItem,
  EventType,
  GigDetailItem,
  GigListItem,
  MeResponse,
  NotificationItem,
  NotificationUnreadCount,
  PushDevice,
  PayoutItem,
  TalentCategory,
  TalentMediaItem,
  TalentProfileMe,
  TalentListItem,
  TalentDetailItem,
  Capability,
  UserSummary,
} from "./types";

type CreateGigPayload = {
  event_type?: string | null;
  title: string;
  description: string;
  requirements: string;
  visibility: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue_name: string;
  venue_address: string;
  city: string;
  region: string;
  budget_min?: string | null;
  budget_max?: string | null;
  currency_code: string;
  is_urgent: boolean;
  required_category_ids: string[];
};

export const api = {
  register: (payload: {
    username: string;
    email: string;
    phone: string;
    password: string;
    display_name: string;
  }) => apiRequest<AuthResponse>("/auth/register/", { method: "POST", body: payload }),

  login: (payload: { username: string; password: string }) =>
    apiRequest<AuthResponse>("/auth/login/", { method: "POST", body: payload }),

  addCapability: (token: string, capability: Capability) =>
    apiRequest<UserSummary>("/auth/capabilities/", { method: "POST", token, body: { capability } }),

  me: (token: string) => apiRequest<MeResponse>("/profiles/me/", { token }),
  updateMe: (
    token: string,
    payload: Partial<Pick<MeResponse, "username" | "email" | "phone">> & {
      profile?: Partial<MeResponse["profile"]>;
    },
  ) => apiRequest<MeResponse>("/profiles/me/", { method: "PATCH", token, body: payload }),
  uploadProfilePhoto: (token: string, payload: FormData) =>
    apiRequest<MeResponse["profile"]>("/profiles/me/photo/", { method: "PATCH", token, body: payload, isMultipart: true }),
  talentMe: (token: string) => apiRequest<TalentProfileMe>("/profiles/talent/me/", { token }),
  updateTalentMe: (
    token: string,
    payload: Partial<{
      stage_name: string;
      years_of_experience: number | null;
      primary_category: string | null;
      hourly_rate_min: string | null;
      hourly_rate_max: string | null;
      fixed_price_min: string | null;
      fixed_price_max: string | null;
      travel_radius_km: number | null;
      profile: Partial<MeResponse["profile"]>;
      skill_category_ids: string[];
      event_type_ids: string[];
    }>,
  ) => apiRequest<TalentProfileMe>("/profiles/talent/me/", { method: "PATCH", token, body: payload }),

  talentCategories: () => apiRequest<TalentCategory[]>("/profiles/categories/"),
  eventTypes: () => apiRequest<EventType[]>("/profiles/event-types/"),
  talents: (search = "", primaryCategory = "") => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (primaryCategory) params.set("primary_category", primaryCategory);
    const query = params.toString();
    return apiRequest<TalentListItem[]>(`/profiles/talents/${query ? `?${query}` : ""}`);
  },
  talentDetail: (talentId: string) => apiRequest<TalentDetailItem>(`/profiles/talents/${talentId}/`),
  talentMedia: (token: string) => apiRequest<TalentMediaItem[]>("/profiles/talent/me/media/", { token }),
  createTalentMedia: (token: string, payload: FormData) =>
    apiRequest<TalentMediaItem>("/profiles/talent/me/media/", { method: "POST", token, body: payload, isMultipart: true }),
  createTalentMediaLink: (
    token: string,
    payload: {
      media_type: "image" | "audio" | "video";
      title: string;
      description: string;
      visibility: "public" | "private";
      storage_url: string;
    },
  ) => apiRequest<TalentMediaItem>("/profiles/talent/me/media/", { method: "POST", token, body: payload }),
  updateTalentMedia: (token: string, mediaId: string, payload: FormData) =>
    apiRequest<TalentMediaItem>(`/profiles/talent/me/media/${mediaId}/`, { method: "PATCH", token, body: payload, isMultipart: true }),
  deleteTalentMedia: (token: string, mediaId: string) =>
    apiRequest<void>(`/profiles/talent/me/media/${mediaId}/`, { method: "DELETE", token }),
  gigs: (token: string) => apiRequest<GigListItem[]>("/gigs/", { token }),
  gigDetail: (token: string, gigId: string) => apiRequest<GigDetailItem>(`/gigs/${gigId}/`, { token }),
  bookings: (token: string) => apiRequest<BookingItem[]>("/bookings/", { token }),
  bookingPaymentSummary: (token: string, bookingId: string) =>
    apiRequest<BookingPaymentSummary>(`/payments/bookings/${bookingId}/summary/`, { token }),
  payouts: (token: string) => apiRequest<PayoutItem[]>("/payments/payouts/", { token }),
  recordBookingPayment: (
    token: string,
    bookingId: string,
    payload: {
      payment_type: "deposit" | "balance" | "full";
      amount?: string;
      provider?: string;
      provider_reference?: string;
    },
  ) => apiRequest(`/payments/bookings/${bookingId}/pay/`, { method: "POST", token, body: payload }),
  initializePaystackPayment: (token: string, bookingId: string, paymentType: "deposit" | "balance" | "full") =>
    apiRequest<PaystackCheckout>(`/payments/bookings/${bookingId}/paystack/initialize/`, {
      method: "POST",
      token,
      body: { payment_type: paymentType },
    }),
  verifyPaystackPayment: (token: string, bookingId: string, reference: string) =>
    apiRequest(`/payments/bookings/${bookingId}/paystack/verify/`, {
      method: "POST",
      token,
      body: { reference },
    }),
  conversations: (token: string) => apiRequest<ConversationItem[]>("/messaging/conversations/", { token }),
  conversationMessages: (token: string, conversationId: string) =>
    apiRequest(`/messaging/conversations/${conversationId}/messages/`, { token }),
  markConversationRead: (token: string, conversationId: string) =>
    apiRequest(`/messaging/conversations/${conversationId}/read/`, { method: "POST", token }),
  notifications: (token: string) => apiRequest<NotificationItem[]>("/notifications/", { token }),
  unreadNotificationCount: (token: string) =>
    apiRequest<NotificationUnreadCount>("/notifications/unread-count/", { token }),
  registerPushDevice: (
    token: string,
    payload: { expo_push_token: string; platform: "ios" | "android"; device_name?: string },
  ) => apiRequest<PushDevice>("/notifications/devices/", { method: "POST", token, body: payload }),
  markNotificationRead: (token: string, notificationId: string) =>
    apiRequest(`/notifications/${notificationId}/read/`, { method: "PATCH", token }),
  createGig: (token: string, payload: CreateGigPayload) => apiRequest("/gigs/", { method: "POST", token, body: payload }),
  showInterestInGig: (token: string, gigId: string, payload: { note?: string; proposed_amount?: string | null }) =>
    apiRequest(`/gigs/${gigId}/interests/`, { method: "POST", token, body: payload }),
  updateGigInterestStatus: (token: string, interestId: string, payload: { status: "shortlisted" | "invited" | "declined" }) =>
    apiRequest(`/gigs/interests/${interestId}/`, { method: "PATCH", token, body: payload }),
  convertGigInterestToBooking: (
    token: string,
    interestId: string,
    payload: {
      quoted_amount?: string;
      deposit_amount?: string;
      balance_amount?: string;
      notes?: string;
    },
  ) => apiRequest(`/gigs/interests/${interestId}/convert-to-booking/`, { method: "POST", token, body: payload }),
  bookingAction: (
    token: string,
    bookingId: string,
    payload: {
      action: "accept" | "reject" | "cancel" | "confirm" | "complete" | "report_no_show";
      reason?: string;
      no_show_party?: "client" | "talent";
      quoted_amount?: string;
      deposit_amount?: string;
      balance_amount?: string;
    },
  ) => apiRequest(`/bookings/${bookingId}/action/`, { method: "POST", token, body: payload }),
  bookingCounteroffer: (token: string, bookingId: string, payload: { amount: string; notes?: string }) =>
    apiRequest(`/bookings/${bookingId}/counteroffer/`, { method: "POST", token, body: payload }),
  bookingDisputes: (token: string, bookingId: string) => apiRequest<DisputeItem[]>(`/bookings/${bookingId}/disputes/`, { token }),
  createBookingDispute: (
    token: string,
    bookingId: string,
    payload: { dispute_type: "no_show" | "payment" | "quality" | "misconduct" | "other"; description: string },
  ) => apiRequest<DisputeItem>(`/bookings/${bookingId}/disputes/`, { method: "POST", token, body: payload }),
  sendMessage: (token: string, conversationId: string, payload: { message_type: "text"; body: string }) =>
    apiRequest(`/messaging/conversations/${conversationId}/messages/`, { method: "POST", token, body: payload }),
};
