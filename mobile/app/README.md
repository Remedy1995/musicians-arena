# Musician's Arena Mobile App

Premium React Native mobile foundation for the Musician's Arena marketplace.

## Stack

- Expo
- React Native
- TypeScript
- Expo Font
- Expo Linear Gradient

## Structure

- `App.tsx`: app entry point
- `src/AppShell.tsx`: font loading and app bootstrap
- `src/theme/`: mobile theme tokens and semantic roles
- `src/components/`: reusable UI primitives
- `src/screens/`: screen-level compositions
- `src/data/mock.ts`: placeholder data for early UI iteration

## Run

```bash
npm start
```

## Environment

Create a local env file from `.env.example` and set the API endpoints you want the app to use.

Key values:

- `EXPO_PUBLIC_API_BASE_URL`: REST base URL such as `https://api.yourdomain.com/api/v1`
- `EXPO_PUBLIC_WS_BASE_URL`: websocket base URL such as `wss://api.yourdomain.com`
- `IOS_BUNDLE_IDENTIFIER`: final iOS bundle identifier for TestFlight and App Store builds
- `ANDROID_PACKAGE`: final Android package name for Play Store builds
- `EAS_PROJECT_ID`: Expo project ID after linking the app to EAS

## Current Capabilities

- role-aware sign in and registration for clients and talents
- talent discovery, gig board, gig posting, and applicant review
- booking negotiation, counteroffers, and payment-summary scaffolding
- messaging APIs with ASGI/WebSocket support via Daphne
- talent portfolio uploads and hosted-link portfolio items
- profile photo upload for both clients and talents

## Local Runtime Notes

- REST and WebSocket testing should use the ASGI app on the same port
- run Daphne for realtime flows:

```bash
cd backend
../.venv/bin/daphne -b 0.0.0.0 -p 8005 config.asgi:application
```

- the mobile app currently targets `http://127.0.0.1:8005/api/v1` and `ws://127.0.0.1:8005`

## Release Builds

The app now uses dynamic Expo config through `app.config.ts`, plus `eas.json` build profiles:

- `development`: internal dev-client builds
- `preview`: internal QA builds
- `production`: store-ready builds

Common commands:

```bash
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

Helpful validation commands:

```bash
npm run typecheck
npm run expo:config
```

## MVP Gaps

- real payment gateway integration and webhook confirmation
- production media storage such as S3 or Cloudinary
- persistent auth session storage and refresh handling
- physical-device QA across Android and iOS
