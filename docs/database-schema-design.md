# Musician's Arena Database Schema Design

## 1. Data Model Principles

- Use PostgreSQL as the source of truth for transactional data
- Keep booking and payment data strongly consistent
- Use UUIDs for primary keys
- Use audit timestamps on all major entities
- Soft-delete user-facing entities where recovery may be needed
- Push search-heavy profile data into OpenSearch

## 2. Core Entities

### users
Stores core account information for all user types.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| role | ENUM | `client`, `talent`, `admin` |
| phone | VARCHAR(20) | Unique, nullable if email-based |
| email | VARCHAR(255) | Unique, nullable |
| password_hash | TEXT | Nullable for OTP-only auth |
| phone_verified_at | TIMESTAMP | Verification timestamp |
| email_verified_at | TIMESTAMP | Verification timestamp |
| status | ENUM | `active`, `suspended`, `pending_verification` |
| last_login_at | TIMESTAMP | Last login |
| created_at | TIMESTAMP | Audit |
| updated_at | TIMESTAMP | Audit |

### user_profiles
Shared profile data.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| user_id | UUID FK | References users.id |
| first_name | VARCHAR(100) |  |
| last_name | VARCHAR(100) |  |
| display_name | VARCHAR(150) | Public-facing name |
| profile_image_url | TEXT |  |
| cover_image_url | TEXT |  |
| bio | TEXT |  |
| city | VARCHAR(120) |  |
| region | VARCHAR(120) |  |
| country | VARCHAR(120) | Default Ghana |
| timezone | VARCHAR(60) |  |
| created_at | TIMESTAMP | Audit |
| updated_at | TIMESTAMP | Audit |

### talent_profiles
Talent-specific business information.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| user_id | UUID FK | References users.id |
| stage_name | VARCHAR(150) | Optional public alias |
| years_of_experience | INTEGER |  |
| primary_category_id | UUID FK | References talent_categories.id |
| hourly_rate_min | NUMERIC(12,2) | Optional |
| hourly_rate_max | NUMERIC(12,2) | Optional |
| fixed_price_min | NUMERIC(12,2) | Optional |
| fixed_price_max | NUMERIC(12,2) | Optional |
| travel_radius_km | INTEGER |  |
| response_time_minutes | INTEGER | Computed/aggregated |
| average_rating | NUMERIC(3,2) | Denormalized |
| review_count | INTEGER | Denormalized |
| booking_count | INTEGER | Denormalized |
| verified_at | TIMESTAMP |  |
| reliability_score | NUMERIC(5,2) | Internal score |
| is_featured | BOOLEAN | Premium placement flag |
| created_at | TIMESTAMP | Audit |
| updated_at | TIMESTAMP | Audit |

### talent_categories
Supported creative roles.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| name | VARCHAR(100) | Example: Keyboardist |
| slug | VARCHAR(120) | Unique |
| created_at | TIMESTAMP | Audit |

### talent_skills
Many-to-many mapping between talents and skills.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| talent_profile_id | UUID FK | References talent_profiles.id |
| category_id | UUID FK | References talent_categories.id |
| skill_level | ENUM | `beginner`, `intermediate`, `advanced`, `expert` |
| created_at | TIMESTAMP | Audit |

### event_types
Supported event categories.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| name | VARCHAR(100) | Example: Wedding |
| slug | VARCHAR(120) | Unique |
| created_at | TIMESTAMP | Audit |

### talent_event_types
Mapping between talents and event types served.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| talent_profile_id | UUID FK | References talent_profiles.id |
| event_type_id | UUID FK | References event_types.id |
| created_at | TIMESTAMP | Audit |

### talent_media
Portfolio assets.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| talent_profile_id | UUID FK | References talent_profiles.id |
| media_type | ENUM | `image`, `audio`, `video` |
| storage_url | TEXT | Object storage URL |
| thumbnail_url | TEXT | Optional |
| title | VARCHAR(255) |  |
| description | TEXT | Optional |
| sort_order | INTEGER |  |
| visibility | ENUM | `public`, `private` |
| created_at | TIMESTAMP | Audit |

### talent_availability
Availability blocks or recurring schedules.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| talent_profile_id | UUID FK | References talent_profiles.id |
| availability_type | ENUM | `available`, `unavailable`, `tentative` |
| start_at | TIMESTAMP |  |
| end_at | TIMESTAMP |  |
| recurrence_rule | TEXT | Nullable |
| created_at | TIMESTAMP | Audit |
| updated_at | TIMESTAMP | Audit |

### client_profiles
Client-specific information.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| user_id | UUID FK | References users.id |
| organization_name | VARCHAR(255) | Optional |
| client_type | ENUM | `individual`, `church`, `event_planner`, `corporate`, `studio` |
| created_at | TIMESTAMP | Audit |
| updated_at | TIMESTAMP | Audit |

### bookings
Core booking transaction entity.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| client_user_id | UUID FK | References users.id |
| talent_user_id | UUID FK | References users.id |
| event_type_id | UUID FK | References event_types.id |
| status | ENUM | `pending`, `countered`, `awaiting_deposit`, `confirmed`, `in_progress`, `completed`, `cancelled`, `disputed`, `refunded` |
| title | VARCHAR(255) | Short event title |
| description | TEXT | Event notes |
| event_date | DATE |  |
| start_time | TIME |  |
| end_time | TIME | Nullable |
| venue_name | VARCHAR(255) | Optional |
| venue_address | TEXT |  |
| city | VARCHAR(120) |  |
| region | VARCHAR(120) |  |
| budget_min | NUMERIC(12,2) | Optional |
| budget_max | NUMERIC(12,2) | Optional |
| quoted_amount | NUMERIC(12,2) | Final agreed price |
| deposit_amount | NUMERIC(12,2) | Booking deposit |
| balance_amount | NUMERIC(12,2) | Remaining amount |
| currency_code | CHAR(3) | Default `GHS` |
| accepted_at | TIMESTAMP | Nullable |
| confirmed_at | TIMESTAMP | Nullable |
| completed_at | TIMESTAMP | Nullable |
| cancelled_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | Audit |
| updated_at | TIMESTAMP | Audit |

### booking_status_history
Tracks all booking state changes.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| booking_id | UUID FK | References bookings.id |
| from_status | VARCHAR(50) | Nullable for initial state |
| to_status | VARCHAR(50) |  |
| changed_by_user_id | UUID FK | References users.id |
| reason | TEXT | Optional |
| created_at | TIMESTAMP | Audit |

### booking_offers
Supports negotiation and counteroffers.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| booking_id | UUID FK | References bookings.id |
| proposed_by_user_id | UUID FK | References users.id |
| amount | NUMERIC(12,2) | Proposed amount |
| notes | TEXT | Optional |
| status | ENUM | `pending`, `accepted`, `rejected`, `expired` |
| created_at | TIMESTAMP | Audit |
| responded_at | TIMESTAMP | Nullable |

### conversations
Chat conversation container.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| booking_id | UUID FK | Nullable, references bookings.id |
| initiated_by_user_id | UUID FK | References users.id |
| conversation_type | ENUM | `inquiry`, `booking` |
| last_message_at | TIMESTAMP |  |
| created_at | TIMESTAMP | Audit |

### conversation_participants
Maps users into conversations.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| conversation_id | UUID FK | References conversations.id |
| user_id | UUID FK | References users.id |
| joined_at | TIMESTAMP | Audit |

### messages
Stores text chat data.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| conversation_id | UUID FK | References conversations.id |
| sender_user_id | UUID FK | References users.id |
| message_type | ENUM | `text`, `image`, `audio`, `system` |
| body | TEXT | Nullable for media-only messages |
| media_url | TEXT | Nullable |
| delivered_at | TIMESTAMP | Nullable |
| read_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | Audit |

### payments
Tracks all money movement initiated by client.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| booking_id | UUID FK | References bookings.id |
| payer_user_id | UUID FK | References users.id |
| payment_type | ENUM | `deposit`, `balance`, `full`, `refund` |
| amount | NUMERIC(12,2) |  |
| currency_code | CHAR(3) | Default `GHS` |
| provider | VARCHAR(100) | Mobile money/card processor |
| provider_reference | VARCHAR(255) | External reference |
| status | ENUM | `pending`, `processing`, `successful`, `failed`, `refunded` |
| paid_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | Audit |
| updated_at | TIMESTAMP | Audit |

### payouts
Tracks platform payout to talent.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| booking_id | UUID FK | References bookings.id |
| payee_user_id | UUID FK | References users.id |
| gross_amount | NUMERIC(12,2) |  |
| commission_amount | NUMERIC(12,2) |  |
| net_amount | NUMERIC(12,2) |  |
| status | ENUM | `pending`, `processing`, `paid`, `failed`, `reversed` |
| payout_method | ENUM | `mobile_money`, `bank_transfer` |
| provider_reference | VARCHAR(255) | External reference |
| paid_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | Audit |
| updated_at | TIMESTAMP | Audit |

### reviews
Post-booking ratings and feedback.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| booking_id | UUID FK | References bookings.id |
| reviewer_user_id | UUID FK | References users.id |
| reviewee_user_id | UUID FK | References users.id |
| rating | INTEGER | 1 to 5 |
| comment | TEXT | Optional |
| created_at | TIMESTAMP | Audit |

### notifications
In-app notification records.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| user_id | UUID FK | References users.id |
| type | VARCHAR(100) | Example: `booking_confirmed` |
| title | VARCHAR(255) |  |
| body | TEXT |  |
| payload_json | JSONB | Deep link and metadata |
| read_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | Audit |

### verification_records
Talent verification workflow.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| user_id | UUID FK | References users.id |
| verification_type | ENUM | `identity`, `payment`, `professional` |
| status | ENUM | `pending`, `approved`, `rejected` |
| document_url | TEXT | Optional |
| reviewed_by_user_id | UUID FK | Nullable, references users.id |
| reviewed_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | Audit |
| updated_at | TIMESTAMP | Audit |

### disputes
Booking or payment disputes.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| booking_id | UUID FK | References bookings.id |
| raised_by_user_id | UUID FK | References users.id |
| dispute_type | ENUM | `no_show`, `payment`, `quality`, `misconduct`, `other` |
| status | ENUM | `open`, `under_review`, `resolved`, `rejected` |
| description | TEXT |  |
| resolution_notes | TEXT | Nullable |
| resolved_by_user_id | UUID FK | Nullable, references users.id |
| resolved_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | Audit |
| updated_at | TIMESTAMP | Audit |

### favorites
Client-saved talents.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| client_user_id | UUID FK | References users.id |
| talent_user_id | UUID FK | References users.id |
| created_at | TIMESTAMP | Audit |

## 3. Relationships Summary

- One `users` record has one optional `client_profiles` record
- One `users` record has one optional `talent_profiles` record
- One `talent_profiles` record has many `talent_media`
- One `talent_profiles` record has many `talent_availability`
- One `bookings` record can have many `booking_status_history`
- One `bookings` record can have many `payments`
- One `bookings` record can have one or more `payouts` depending on policy
- One `conversations` record has many `messages`

## 4. Suggested Indexes

### PostgreSQL Indexes
- `users(phone)`
- `users(email)`
- `talent_profiles(primary_category_id, verified_at)`
- `bookings(client_user_id, created_at desc)`
- `bookings(talent_user_id, event_date desc)`
- `bookings(status, event_date)`
- `messages(conversation_id, created_at desc)`
- `notifications(user_id, read_at, created_at desc)`
- `reviews(reviewee_user_id, created_at desc)`
- `favorites(client_user_id, created_at desc)`

## 5. Search Index Projection

Project talent data into OpenSearch with fields such as:
- talent_user_id
- display_name
- stage_name
- city
- region
- categories
- event_types
- price_min
- price_max
- verified
- average_rating
- booking_count
- reliability_score
- availability_state
- searchable_tags
- media_presence_flags

## 6. Future Schema Extensions

- Team or band accounts
- Subscription plans
- Promo codes and discounts
- Wallet ledger
- Referral tracking
- Talent badges and achievements
- AI scoring and personalization tables
