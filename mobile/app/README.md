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

For a live VPS preview that targets `https://api.musicianz.site`, start from `.env.preview.example`.

Key values:

- `EXPO_PUBLIC_API_BASE_URL`: REST base URL such as `https://api.yourdomain.com/api/v1`
- `EXPO_PUBLIC_WS_BASE_URL`: websocket base URL such as `wss://api.yourdomain.com`
- `ALLOW_INSECURE_HTTP`: keep this `false` for the domain-based HTTPS deployment
- `IOS_BUNDLE_IDENTIFIER`: final iOS bundle identifier for TestFlight and App Store builds
- `ANDROID_PACKAGE`: final Android package name for Play Store builds
- `EAS_PROJECT_ID`: Expo project ID after linking the app to EAS

## Current Capabilities

- role-aware sign in and registration for clients and talents
- one account can hold both organizer and talent capabilities, with workspace switching from Profile
- talent discovery, gig board, gig posting, and applicant review
- booking negotiation, counteroffers, and payment-summary scaffolding
- held-funds booking workflow with deposit, balance, completion confirmation, no-show reporting, refund/compensation summaries, and payout-pending states
- Paystack test checkout for deposit and balance payments with server-side verification
- messaging APIs with ASGI/WebSocket support via Daphne
- in-app notification WebSocket updates with HTTP fallback and native Expo push-token registration
- talent portfolio uploads and hosted-link portfolio items
- profile photo upload for both clients and talents

## Local Runtime Notes

- REST and WebSocket testing should use the ASGI app on the same port
- run Daphne for realtime flows:

```bash
cd backend
../.venv/bin/daphne -b 0.0.0.0 -p 8005 config.asgi:application
```

- the mobile app targets the local API only for development; preview and production use the deployed HTTPS API

## Release Builds

The app now uses dynamic Expo config through `app.config.ts`, plus `eas.json` build profiles:

- `development`: internal dev-client builds
- `preview`: internal QA builds wired to `https://api.musicianz.site/api/v1`
- `production`: release builds wired to the same HTTPS backend

Common commands:

```bash
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

Convenience scripts:

```bash
npm run eas:login
npm run eas:whoami
npm run build:android:preview
npm run build:android:preview:clean
npm run build:ios:preview
npm run build:android:production
npm run build:ios:production
```

### Local iOS development with Xcode

The repository uses Expo prebuild, so the `ios/` Xcode project is generated locally and is not committed. To run a development build against the live backend:

Expo's iOS autolinking command is not safe when the absolute project path contains an apostrophe. Since this project is currently under `Musician's arena`, use a copy or rename it to a path such as `~/Projects/musicians-arena-mobile` before running CocoaPods.

```bash
mkdir -p "$HOME/Projects"
rsync -a --exclude node_modules --exclude ios \
  "/Users/japhetadjetey/Documents/Musician's arena/mobile/app/" \
  "$HOME/Projects/musicians-arena-mobile/"
cd "$HOME/Projects/musicians-arena-mobile"
npm ci
export APP_VARIANT=development
export ALLOW_INSECURE_HTTP=false
export EXPO_PUBLIC_API_BASE_URL=https://api.musicianz.site/api/v1
export EXPO_PUBLIC_WS_BASE_URL=wss://api.musicianz.site
npx expo prebuild --platform ios
cd ios && pod install && cd ..
open ios/*.xcworkspace
```

For a physical iPhone Debug build, start Metro in a second terminal from the same safe copy:

```bash
cd "$HOME/Projects/musicians-arena-mobile"
export APP_VARIANT=development
export ALLOW_INSECURE_HTTP=false
export EXPO_PUBLIC_API_BASE_URL=https://api.musicianz.site/api/v1
export EXPO_PUBLIC_WS_BASE_URL=wss://api.musicianz.site
npx expo start --dev-client --host lan --port 8081
```

Keep the Mac and iPhone on the same Wi-Fi, then in Xcode select the `Musician's Arena` scheme, choose the iPhone, and press `Cmd + R`. On the iPhone, allow **Local Network** access for Musician's Arena under **Settings > Privacy & Security > Local Network**. If the permission does not appear, delete the app from the iPhone, run `npx expo prebuild --platform ios` again, reinstall it from Xcode, and relaunch. Also allow incoming connections for Node/Terminal in the macOS firewall and disable VPN or Wi-Fi client isolation while testing.

The `No script URL provided` message means Debug could not reach Metro; it is not caused by the dSYM warning. Confirm Metro is reachable from the Mac with `curl http://192.168.0.158:8081/status` and use the Mac's current LAN address if it has changed. Do not use `--host localhost` for a physical iPhone. If the Wi-Fi blocks device-to-device traffic, use `npx expo start --dev-client --host tunnel` instead.

To run a standalone local Release build that embeds the JavaScript bundle and does not need Metro, use the live HTTPS endpoints:

```bash
cd "$HOME/Projects/musicians-arena-mobile"
export APP_VARIANT=preview
export ALLOW_INSECURE_HTTP=false
export EXPO_PUBLIC_API_BASE_URL=https://api.musicianz.site/api/v1
export EXPO_PUBLIC_WS_BASE_URL=wss://api.musicianz.site
npx expo prebuild --platform ios
cd ios && pod install && cd ..
npx expo run:ios --device --configuration Release
```

In Xcode, the equivalent is **Product > Scheme > Edit Scheme > Run > Build Configuration > Release**, followed by `Cmd + R`. A simulator does not require a paid Apple Developer membership. A physical iPhone requires an Apple Team under **Signing & Capabilities**; distribution to other testers requires a paid Apple Developer Program membership and TestFlight or Ad Hoc signing.

The complete VPS, Android APK, and iOS/Xcode runbook is in [`DEPLOYMENT.md`](../../DEPLOYMENT.md).

Current mobile build behavior:

- Android and iOS preview builds use `https://api.musicianz.site/api/v1`
- websocket chat and notifications use `wss://api.musicianz.site`
- after native Android config changes, use `npm run build:android:preview:clean`, uninstall the old APK, then install the new APK

Native push setup:

- Build a development or preview binary; Expo Go is not a reliable target for production push testing.
- Allow notifications on the device when prompted.
- The app registers its Expo push token at `POST /api/v1/notifications/devices/` after login.
- Set `EXPO_PUSH_ENABLED=True` on the backend and restart both the API and Celery worker. Keep WebSocket notifications enabled as the realtime fallback.

## Payment and Media Production Setup

Paystack secret keys belong in `backend/.env`, never in the mobile app. The backend initializes checkout, verifies the returned reference and amount, and records successful payments as held funds. The mobile app then refreshes the booking payment summary.

For Hetzner Object Storage, use the S3-compatible backend in `backend/.env`:

```env
MEDIA_FILE_STORAGE_BACKEND=storages.backends.s3.S3Storage
AWS_STORAGE_BUCKET_NAME=musicians-arena-media
AWS_ACCESS_KEY_ID=your_hetzner_access_key
AWS_SECRET_ACCESS_KEY=your_hetzner_secret_key
AWS_S3_REGION_NAME=fsn1
AWS_S3_ENDPOINT_URL=https://fsn1.your-objectstorage.com
AWS_S3_SIGNATURE_VERSION=s3v4
AWS_S3_ADDRESSING_STYLE=virtual
AWS_QUERYSTRING_AUTH=True
AWS_S3_FILE_OVERWRITE=False
AWS_LOCATION=media
```

Keep the bucket private when using signed URLs. Copy existing files from the local `media_data` volume before removing local media storage. Register `/api/v1/payments/paystack/webhook/` with Paystack after the API is available over HTTPS.

Helpful validation commands:

```bash
npm run typecheck
npm run expo:config
npm run web:export
```

## VPS Deployment and Web Preview

The repo includes a lightweight web container that exports the Expo app and serves it with nginx behind Caddy.

- the internal web service defaults to port `8080`
- the internal API defaults to port `8000`
- set `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_WS_BASE_URL` in `infra/.env.production`
- Caddy exposes the web app at `https://musicianz.site` and the API at `https://api.musicianz.site`

After you pull the latest repo on the VPS:

```bash
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml up -d --build
```

Check the API and container state:

```bash
docker compose --env-file infra/.env.production -f docker-compose.prod.yml ps
curl https://api.musicianz.site/api/v1/health/
docker compose --env-file infra/.env.production -f docker-compose.prod.yml logs -f api
```

The domain-based setup is suitable for browser and native-device testing. Keep the API and WebSocket values on `https://` and `wss://`, and update Django allowed hosts and CORS origins when changing domains.

Then open:

```text
https://musicianz.site
```

## Remaining Release Work

- persistent auth session storage and refresh handling
- physical-device QA across Android and iOS
