# MVP Release Readiness

## Goal

Ship a stable mobile MVP for Android and iOS backed by the Django marketplace API and ASGI realtime messaging stack.

## Release Scope

- Client and talent account onboarding
- Talent profile editing and portfolio management
- Gig creation and gig-interest workflow
- Applicant review, shortlist, invite, and booking conversion
- Booking negotiation and simulated deposit workflow
- Direct messaging and notifications

## Must-Fix Before Release

- Confirm profile photo uploads work on Android and iOS physical devices
- Confirm portfolio file uploads work on Android and iOS physical devices
- Verify hosted-link portfolio items render correctly in the `Links` filter
- Verify realtime chat works against Daphne on the deployed ASGI service
- Verify notification websocket delivery and HTTP fallback behavior
- Confirm no silent actions remain in profile, portfolio, gig, booking, or message flows

## Backend Readiness

- Use PostgreSQL in production
- Use Redis-backed Channels in production
- Run the ASGI app behind Daphne or another ASGI-capable server
- Move media storage from local disk to a durable object store
- Set production `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, and CORS values
- Disable `DEBUG`
- Add structured logging and error tracking
- Review the new write throttle defaults before launch:
  - auth, profile, media, gig, booking, and message write paths are now scoped for DRF throttling
- Fill the new security env vars in `backend/.env.example` for:
  - SSL redirect, HSTS, cookie flags, upload limits, and log level
- If you use S3-compatible storage later, switch `MEDIA_FILE_STORAGE_BACKEND` and fill the AWS env values

## Mobile Readiness

- Set final Android package name
- Set final iOS bundle identifier
- Configure final API and WebSocket base URLs through:
  - `EXPO_PUBLIC_API_BASE_URL`
  - `EXPO_PUBLIC_WS_BASE_URL`
- Configure Expo build metadata through `mobile/app/.env.example`:
  - `IOS_BUNDLE_IDENTIFIER`
  - `ANDROID_PACKAGE`
  - `IOS_BUILD_NUMBER`
  - `ANDROID_VERSION_CODE`
  - `EAS_PROJECT_ID`
- Test media permissions on Android and iOS
- Validate icons, splash, and app metadata
- Prepare store screenshots and descriptions
- Use the new `mobile/app/eas.json` profiles for:
  - `development`
  - `preview`
  - `production`

## Suggested Deployment Order

1. Deploy backend API, ASGI websocket service, Redis, and Postgres
2. Configure production environment variables and media storage
3. Link the Expo app to EAS and set `EAS_PROJECT_ID`
4. Point the mobile app to production endpoints
5. Run the manual test checklist on physical Android and iOS devices
6. Create internal preview builds
7. Fix final blocker issues from internal QA
8. Generate store-ready production builds

## Known MVP Limitations

- Payment collection is still simulated, not gateway-backed
- Dispute resolution is not positioned as a polished in-app support workflow yet
- Auth session persistence can be improved further for production-grade reliability
- Portfolio uploads and link management still need full device QA coverage
