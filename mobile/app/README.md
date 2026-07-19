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
- held-funds booking workflow with deposit, balance, completion confirmation, no-show reporting, refund/compensation summaries, and payout-pending states
- Paystack test checkout for deposit and balance payments with server-side verification
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

Current mobile build behavior:

- Android and iOS preview builds are configured to talk directly to `http://157.90.144.124:8000/api/v1`
- websocket chat and notifications use `ws://157.90.144.124:8000`
- cleartext HTTP is explicitly enabled so the current IP-based backend works on real devices
- after native Android config changes, use `npm run build:android:preview:clean`, uninstall the old APK, then install the new APK
- once you move the backend behind a real HTTPS domain, switch the build env values to `https://` and `wss://`, then set `ALLOW_INSECURE_HTTP=false`

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

Keep the bucket private when using signed URLs. Copy existing files from the local `media_data` volume before removing local media storage. Register `/api/v1/payments/paystack/webhook/` with Paystack after the API is available over HTTPS; IP-only HTTP testing can use the in-app verification action instead.

Helpful validation commands:

```bash
npm run typecheck
npm run expo:config
npm run web:export
```

## VPS Deployment and Web Preview

The repo includes a lightweight preview web container that exports the Expo app and serves it with nginx for browser testing.

- the preview frontend defaults to port `8080`
- the production API defaults to port `8000`
- set `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_WS_BASE_URL` in `infra/.env.production`
- allow the preview origin in Django CORS, for example `http://157.90.144.124:8080`

After you pull the latest repo on the VPS:

```bash
docker compose --env-file infra/.env.production -f docker-compose.prod.yml up -d --build
```

Check the API and container state:

```bash
docker compose --env-file infra/.env.production -f docker-compose.prod.yml ps
curl http://127.0.0.1:8000/api/v1/health/
docker compose --env-file infra/.env.production -f docker-compose.prod.yml logs -f api
```

The current IP-based setup is suitable for controlled testing. Before public release, put the API behind HTTPS, change the mobile REST/WebSocket values to `https://` and `wss://`, update Django allowed hosts and CORS origins, and register the HTTPS Paystack webhook.

Then open:

```text
http://157.90.144.124:8080
```

## Remaining Release Work

- persistent auth session storage and refresh handling
- physical-device QA across Android and iOS
