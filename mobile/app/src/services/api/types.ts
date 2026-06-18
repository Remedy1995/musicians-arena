export type UserRole = "client" | "talent";

export type UserSummary = {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  status: string;
};

export type AuthResponse = {
  token: string;
  user: UserSummary;
};

export type UserProfile = {
  id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  profile_image_url: string | null;
  cover_image_url: string | null;
  bio: string;
  city: string;
  region: string;
  country: string;
  timezone: string;
};

export type MeResponse = {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  status: string;
  profile: UserProfile;
};

export type TalentSkillItem = {
  id: string;
  name: string;
  slug: string;
  skill_level?: string;
};

export type TalentEventTypeItem = {
  id: string;
  name: string;
  slug: string;
};

export type TalentMediaItem = {
  id: string;
  media_type: "image" | "audio" | "video";
  storage_url: string;
  file_url: string;
  thumbnail_url: string;
  mime_type: string;
  file_size_bytes: number | null;
  title: string;
  description: string;
  sort_order: number;
  visibility: "public" | "private";
  processing_status: "pending" | "ready" | "failed";
  created_at: string;
  updated_at: string;
};

export type TalentProfileMe = {
  stage_name: string;
  years_of_experience: number | null;
  primary_category: string | null;
  hourly_rate_min: string | null;
  hourly_rate_max: string | null;
  fixed_price_min: string | null;
  fixed_price_max: string | null;
  travel_radius_km?: number | null;
  profile: UserProfile;
  skills?: TalentSkillItem[];
  event_types?: TalentEventTypeItem[];
  media?: TalentMediaItem[];
};

export type TalentCategory = {
  id: string;
  name: string;
  slug: string;
};

export type EventType = {
  id: string;
  name: string;
  slug: string;
};

export type TalentListItem = {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  city: string;
  region: string;
  bio: string;
  stage_name: string;
  years_of_experience: number | null;
  primary_category: TalentCategory | null;
  hourly_rate_min: string | null;
  hourly_rate_max: string | null;
  fixed_price_min: string | null;
  fixed_price_max: string | null;
  average_rating: string | number;
  review_count: number;
  booking_count: number;
  is_featured: boolean;
};

export type GigCategory = {
  id: string;
  name: string;
  slug: string;
};

export type GigListItem = {
  id: string;
  organizer_id: string;
  organizer_name: string;
  event_type: string | null;
  event_type_name: string | null;
  title: string;
  description: string;
  status: string;
  visibility: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  city: string;
  region: string;
  budget_min: string | null;
  budget_max: string | null;
  currency_code: string;
  is_urgent: boolean;
  required_categories: GigCategory[];
  interests_count: number;
  my_interest_status: string | null;
  my_interest_id: string | null;
  created_at: string;
};

export type GigInterestItem = {
  id: string;
  talent_id: string;
  talent_username: string;
  display_name: string;
  note: string;
  proposed_amount: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type GigDetailItem = GigListItem & {
  requirements: string;
  venue_name: string;
  venue_address: string;
  interests: GigInterestItem[];
};

export type BookingTalent = {
  id: string;
  username: string;
};

export type BookingItem = {
  id: string;
  client_id: string;
  talent: BookingTalent;
  event_type: string | null;
  status: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue_name: string;
  venue_address: string;
  city: string;
  region: string;
  budget_min: string | null;
  budget_max: string | null;
  quoted_amount: string | null;
  deposit_amount: string | null;
  balance_amount: string | null;
  currency_code: string;
  created_at: string;
  updated_at: string;
};

export type DisputeItem = {
  id: string;
  booking: string;
  raised_by_id: string;
  dispute_type: "no_show" | "payment" | "quality" | "misconduct" | "other";
  status: "open" | "under_review" | "resolved" | "rejected";
  description: string;
  resolution_notes: string;
  resolved_by_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentItem = {
  id: string;
  booking: string;
  payer: string;
  payment_type: string;
  amount: string;
  currency_code: string;
  provider: string;
  provider_reference: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PayoutItem = {
  id: string;
  booking: string;
  payee: string;
  gross_amount: string;
  commission_amount: string;
  net_amount: string;
  status: string;
  payout_method: string;
  provider_reference: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingPaymentSummary = {
  booking_id: string;
  booking_status: string;
  quoted_amount: string | null;
  deposit_amount: string | null;
  balance_amount: string | null;
  currency_code: string;
  deposit_paid: string;
  balance_paid: string;
  total_paid: string;
  outstanding_amount: string;
  commission_amount: string;
  payout_due_amount: string;
  payments: PaymentItem[];
  payouts: PayoutItem[];
};

export type ConversationParticipant = {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  joined_at: string;
};

export type MessageItem = {
  id: string;
  conversation: string;
  sender_id: string;
  sender_username: string;
  message_type: string;
  body: string;
  media_url: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
};

export type ConversationItem = {
  id: string;
  booking: string | null;
  gig: string | null;
  initiated_by: string;
  conversation_type: string;
  last_message_at: string | null;
  created_at: string;
  participants: ConversationParticipant[];
  last_message: MessageItem | null;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  payload_json: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationUnreadCount = {
  unread_count: number;
};
