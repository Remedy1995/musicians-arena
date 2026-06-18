# Musician's Arena Mobile Design System

## Design Intent

The Musician's Arena mobile design system should feel:
- premium but welcoming
- modern without looking generic
- confident and musical
- clean enough for trust-heavy booking flows
- expressive enough for creative talent discovery

This should not look like a plain fintech clone or a default startup marketplace. The app should feel culturally warm, polished, and alive.

## Visual Direction

### Brand Personality
- Rhythmic
- Elegant
- Trustworthy
- Human
- Performance-driven

### Aesthetic Direction
- Deep charcoal foundations for structure
- Warm ivory and stone neutrals for space and clarity
- Burnished gold for premium emphasis
- Ember red for urgency and bookings
- Moss/teal accents for success and active states

This creates a premium stage-like feel instead of a cold corporate product.

## Typography

### Recommended Font Pairing
- Display / headings: `Sora`
- Body / interface text: `IBM Plex Sans`

Why:
- `Sora` feels contemporary, clean, and slightly expressive
- `IBM Plex Sans` is very readable for dense mobile UI

### Typography Rules
- Large headings should feel intentional and slightly dramatic
- Booking and payment flows should reduce visual noise with calmer text rhythm
- Use sentence case, not all caps, for most primary labels
- Avoid overcrowded card text

## Color Strategy

### Core Principle
Use strong dark anchors with soft light surfaces and vivid action accents.

### Primary Roles
- `Ink` for deep anchors
- `Canvas` for light breathing room
- `Gold` for premium highlights
- `Ember` for call-to-action urgency
- `Verdant` for positive outcomes
- `Teal` for discovery and active states

## UI Principles

### 1. Discovery Should Feel Editorial
Talent cards should feel more like premium profile spotlights than plain directory rows.

### 2. Booking Should Feel Safe
Pricing, status, and next actions should always be easy to understand at a glance.

### 3. Messaging Should Feel Immediate
Chats should be fast, uncluttered, and easy to scan during active event planning.

### 4. Gig Board Should Feel Dynamic
Gig cards should communicate urgency, event type, location, and budget quickly.

### 5. Trust Signals Must Be Visible
Verification, reliability, completed jobs, and ratings should be highly visible without dominating the layout.

## Component Language

### Buttons
- Primary: dark fill or ember fill depending on screen context
- Secondary: tinted neutral surface with strong label contrast
- Ghost: low-emphasis text action

### Cards
- Large radius
- Soft elevation
- Generous vertical spacing
- Clear content hierarchy

### Inputs
- Comfortable height
- Strong focus ring
- Clear labels above fields
- Helper text for sensitive flows like payout and booking

### Badges
- Verified
- Top rated
- Urgent
- Open gig
- Awaiting deposit
- Confirmed

Badges should be compact, rounded, and color-coded.

## Screen Patterns

### Home / Discovery
- Strong welcome header
- Search bar with immediate value
- Featured talents carousel
- Nearby or recommended talents
- Open gigs section

### Talent Profile
- Full-width hero media or portrait
- Primary stats row
- Audio/video work samples
- Skills and event types
- Sticky CTA bar for `Message` and `Book`

### Gig Board
- Filter chips at top
- High-signal cards with event type, city, date, budget
- Urgent gigs visually elevated

### Booking Detail
- Timeline/status section at top
- Agreement details
- Payment summary
- Message shortcut
- Confirm / counter / accept actions anchored clearly

### Notifications
- Group by freshness
- Strong iconography
- One-line action clarity

## Motion

Use motion sparingly and meaningfully:
- soft fade and lift on card entrance
- horizontal slide for carousels
- scale feedback on primary actions
- subtle badge pulse only for urgent open gigs

Avoid noisy motion in trust-heavy payment flows.

## Accessibility

- Maintain strong text contrast
- Ensure touch targets are at least 44x44
- Never use color alone for booking state
- Support larger text gracefully
- Keep important actions reachable with one hand

## Recommended First Component Set

- `Screen`
- `TopBar`
- `SectionHeader`
- `PrimaryButton`
- `SecondaryButton`
- `Chip`
- `StatusBadge`
- `TalentCard`
- `GigCard`
- `MetricPill`
- `TextField`
- `SearchField`
- `MessageBubble`
- `NotificationRow`
- `BookingSummaryCard`

## Notes For React Native Build

- Use a token-driven theme from the beginning
- Keep shadows platform-aware
- Use consistent spacing instead of ad hoc margins
- Build dark mode later only if product direction demands it
- Start with a single polished light theme first
