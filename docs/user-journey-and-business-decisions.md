# Musician's Arena User Journey and Business Decisions

## Recommended User Journey

### Account And Workspace Onboarding
1. User creates one neutral account or signs in to an existing account
2. User can explore public opportunities and talent profiles without creating a workspace
3. User creates a talent profile, an organizer profile, or both when a role-specific action is needed
4. The selected profile becomes the active workspace
5. The authenticated header and Profile tab provide workspace switching and profile creation for any missing capability

### Path A: Client Searches for Talent
1. Organizer opens the app, signs in, and enters the organizer workspace
2. Client searches by talent type, location, event type, date, and budget
3. Client reviews talent profile, media, pricing, and reviews
4. Client starts chat or sends booking request
5. Talent accepts, rejects, or counters
6. Client pays deposit
7. Booking becomes confirmed
8. Event happens
9. Client confirms completion and leaves review

### Path B: Client Creates a Public Gig
1. Client creates a gig with date, venue, budget, and required talent types
2. Matching talents discover the gig
3. Talents show interest
4. Client reviews interested talents
5. Client starts chat with shortlisted talents
6. Client converts one or more into direct bookings

### Talent Journey
1. User creates or opens the talent workspace
2. Talent completes profile and verification
3. Talent uploads samples and sets availability
4. Talent receives direct requests or sees public gigs
5. Talent chats, counters if needed, and accepts suitable work
6. Talent performs the event
7. Talent receives payout and review

## Recommended Business Decisions

### Decision 1
Use both direct search and a public gig board.

Why:
- Direct search supports fast hiring.
- Public gigs help clients who prefer to receive applications.

### Decision 2
Use deposit-first confirmation.

Why:
- Reduces unserious bookings.
- Protects talents from date blocking without commitment.

### Decision 3
Keep messaging and negotiation inside the platform.

Why:
- Protects revenue.
- Improves trust and dispute handling.

### Decision 4
Give verified talents search and gig visibility advantage.

Why:
- Builds confidence for clients.
- Encourages high-quality onboarding.

### Decision 5
Start with church, wedding, and event musicians in Accra and Kumasi.

Why:
- Strong demand density.
- Easier early network effects.

## What We Are Agreeing To

- Mobile-first marketplace
- Django backend with realtime messaging
- Deposit-backed booking model
- Public gig board as an added acquisition channel
- One account with optional talent and organizer workspaces
- Profile-free browsing with capability gates for transactional actions
- Swagger-documented APIs
- Search, chat, booking, and payouts as the core operating loop
