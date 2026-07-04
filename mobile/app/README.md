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

For a live VPS preview that targets the current deployment at `157.90.144.124:8000`, start from `.env.preview.example`.

Key values:

- `EXPO_PUBLIC_API_BASE_URL`: REST base URL such as `https://api.yourdomain.com/api/v1`
- `EXPO_PUBLIC_WS_BASE_URL`: websocket base URL such as `wss://api.yourdomain.com`
- `ALLOW_INSECURE_HTTP`: set to `true` while your backend is still served over plain `http://` by IP
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
- `preview`: internal QA builds wired to `http://157.90.144.124:8000/api/v1`
- `production`: release builds currently wired to the same backend until you switch to a domain and HTTPS

Common commands:

```bash
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

Convenience scripts:

```bash
npm run build:android:preview
npm run build:ios:preview
npm run build:android:production
npm run build:ios:production
```

Current mobile build behavior:

- Android and iOS preview builds are configured to talk directly to `http://157.90.144.124:8000/api/v1`
- websocket chat and notifications use `ws://157.90.144.124:8000`
- cleartext HTTP is explicitly enabled so the current IP-based backend works on real devices
- once you move the backend behind a real HTTPS domain, switch the build env values to `https://` and `wss://`, then set `ALLOW_INSECURE_HTTP=false`

Helpful validation commands:

```bash
npm run typecheck
npm run expo:config
npm run web:export
```

## VPS Web Preview

The repo includes a lightweight preview web container that exports the Expo app and serves it with nginx for browser testing.

- the preview frontend defaults to port `8080`
- the production API defaults to port `8000`
- set `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_WS_BASE_URL` in `infra/.env.production`
- allow the preview origin in Django CORS, for example `http://157.90.144.124:8080`

After you pull the latest repo on the VPS:

```bash
docker compose --env-file infra/.env.production -f docker-compose.prod.yml up -d --build
```

Then open:

```text
http://157.90.144.124:8080
```

## MVP Gaps

- real payment gateway integration and webhook confirmation
- production media storage such as S3 or Cloudinary
- persistent auth session storage and refresh handling
- physical-device QA across Android and iOS
