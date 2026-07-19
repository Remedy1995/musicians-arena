# Musician's Arena Deployment Guide

This guide deploys the Django/Channels backend to a Hetzner VPS and builds the Expo React Native mobile app. The current setup supports controlled testing against the server IP. Public production should use a domain, HTTPS, and secure WebSockets.

## 1. Architecture

The production Compose stack runs:

- `api`: Django ASGI/Daphne API and WebSockets on port 8000
- `worker`: Celery background worker
- `db`: PostgreSQL
- `redis`: Redis for Channels and Celery
- `web`: exported Expo web preview on port 8080
- `caddy`: optional gateway profile; keep it disabled when host Nginx owns ports 80 and 443

PostgreSQL and Redis are internal services. Do not expose ports 5432 or 6379 publicly.

## 2. Prepare the VPS

SSH into the server:

    ssh root@157.90.144.124

Verify Docker and Git:

    docker --version
    docker compose version
    git --version

If Docker is missing, install Docker Engine using the official Ubuntu instructions: https://docs.docker.com/engine/install/ubuntu/

Clone the repository:

    cd /root
    git clone git@github.com:Remedy1995/musicians-arena.git
    cd /root/musicians-arena

For an existing checkout:

    cd /root/musicians-arena
    git pull --ff-only origin main

## 3. Configure Environment Files

Create the deployment files once:

    cd /root/musicians-arena
    cp backend/.env.production.example backend/.env
    cp infra/.env.production.example infra/.env.production

Edit backend secrets:

    nano backend/.env

Replace at least:

    DJANGO_SECRET_KEY=use-a-long-random-secret
    DB_PASSWORD=use-a-strong-database-password
    POSTGRES_PASSWORD=use-a-strong-database-password

For the current IP-only HTTP test setup:

    DJANGO_ENV=production
    DJANGO_DEBUG=False
    DJANGO_ALLOWED_HOSTS=157.90.144.124,localhost
    DJANGO_CSRF_TRUSTED_ORIGINS=http://157.90.144.124:8080
    DJANGO_CORS_ALLOWED_ORIGINS=http://157.90.144.124:8080
    DJANGO_SECURE_SSL_REDIRECT=False

Edit Compose values:

    nano infra/.env.production

For the current IP preview:

    API_PORT=8000
    WEB_PORT=8080
    EXPO_PUBLIC_API_BASE_URL=http://157.90.144.124:8000/api/v1
    EXPO_PUBLIC_WS_BASE_URL=ws://157.90.144.124:8000

Never commit backend/.env or infra/.env.production.

## 4. Configure Hetzner Object Storage

Create a private Object Storage bucket and generate S3 credentials in the Hetzner Console. For a Falkenstein bucket, use the fsn1 endpoint.

Add this to backend/.env:

    MEDIA_FILE_STORAGE_BACKEND=storages.backends.s3.S3Storage
    AWS_STORAGE_BUCKET_NAME=musicians-arena-media
    AWS_ACCESS_KEY_ID=your_hetzner_access_key
    AWS_SECRET_ACCESS_KEY=your_hetzner_secret_key
    AWS_S3_REGION_NAME=fsn1
    AWS_S3_ENDPOINT_URL=https://fsn1.your-objectstorage.com
    AWS_S3_SIGNATURE_VERSION=s3v4
    AWS_S3_ADDRESSING_STYLE=virtual
    AWS_S3_CUSTOM_DOMAIN=
    AWS_QUERYSTRING_AUTH=True
    AWS_S3_FILE_OVERWRITE=False
    AWS_LOCATION=media

The private bucket and signed URLs protect profile and portfolio media. Keep the local media volume until the existing files have been copied and verified.

Optional local-media migration:

    cd /root/musicians-arena
    mkdir -p media-backup
    docker compose --env-file infra/.env.production -f docker-compose.prod.yml cp api:/app/media ./media-backup
    aws s3 sync ./media-backup s3://musicians-arena-media/media/ --endpoint-url https://fsn1.your-objectstorage.com --region fsn1

## 5. Configure Paystack Test Mode

Add the test secret to backend/.env:

    PAYSTACK_SECRET_KEY=sk_test_replace_me
    PAYSTACK_BASE_URL=https://api.paystack.co
    PAYSTACK_CURRENCY=GHS
    PAYSTACK_PAYMENT_CHANNELS=card,mobile_money,bank,ussd
    PAYSTACK_REQUEST_TIMEOUT_SECONDS=20

The secret remains on the backend and is never placed in the mobile app.

Test flow:

1. Create and accept a booking.
2. Open the booking as the organizer and select Pay deposit.
3. Complete Paystack's test checkout.
4. Return to the app and select I've completed payment.
5. Confirm that the booking becomes confirmed and the summary says Deposit held safely.
6. Pay the balance before the event.
7. Confirm completion after the service; only then is a pending talent payout created.

Paystack test values are available at https://paystack.com/docs/payments/test-payments/

After HTTPS is enabled, register this webhook in Paystack:

    https://api.example.com/api/v1/payments/paystack/webhook/

IP-only HTTP testing can use the in-app verification action. Webhooks should be used through a public HTTPS endpoint.

## 6. Start or Update the Backend

Build and start the default services:

    cd /root/musicians-arena
    docker compose --env-file infra/.env.production -f docker-compose.prod.yml up -d --build

The API entrypoint automatically runs migrations and collectstatic before Daphne starts.

Check the deployment:

    docker compose --env-file infra/.env.production -f docker-compose.prod.yml ps
    curl http://127.0.0.1:8000/api/v1/health/
    docker compose --env-file infra/.env.production -f docker-compose.prod.yml logs -f api

Expected response:

    {"status":"ok","service":"musicians-arena-api"}

Useful commands:

    docker compose --env-file infra/.env.production -f docker-compose.prod.yml logs --tail=100 api
    docker compose --env-file infra/.env.production -f docker-compose.prod.yml logs --tail=100 worker
    docker compose --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py check
    docker compose --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py migrate

Do not run docker compose down -v. That deletes database, Redis, and media volumes.

## 7. Firewall and HTTPS

For controlled IP testing:

    ufw allow OpenSSH
    ufw allow 8000/tcp
    ufw allow 8080/tcp
    ufw status

For public release, expose only ports 80 and 443 through Nginx or Caddy. Proxy the API and WebSockets to 127.0.0.1:8000 and the web preview to 127.0.0.1:8080.

Then change the backend environment:

    DJANGO_ALLOWED_HOSTS=api.example.com
    DJANGO_CSRF_TRUSTED_ORIGINS=https://api.example.com
    DJANGO_CORS_ALLOWED_ORIGINS=https://app.example.com
    DJANGO_SECURE_SSL_REDIRECT=True

And the mobile environment:

    EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
    EXPO_PUBLIC_WS_BASE_URL=wss://api.example.com
    ALLOW_INSECURE_HTTP=false

Only enable the Compose Caddy gateway when ports 80 and 443 are not already in use:

    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml up -d --build

## 8. Build Android

Run these commands on the development Mac, not the VPS:

    cd "/Users/japhetadjetey/Documents/Musician's arena/mobile/app"
    npm install
    npm run typecheck
    npx eas-cli@latest login
    npm run build:android:preview:clean

The preview profile currently targets http://157.90.144.124:8000/api/v1 and ws://157.90.144.124:8000.

Install the finished APK on a running emulator:

    adb install -r /path/to/musicians-arena.apk
    adb shell monkey -p com.remedy1995.musiciansarena -c android.intent.category.LAUNCHER 1

EAS manages the Android signing keystore.

## 9. Build iOS

An installable iOS preview or TestFlight build requires a paid Apple Developer Program account.

    cd "/Users/japhetadjetey/Documents/Musician's arena/mobile/app"
    npm run build:ios:preview

Before iOS production builds:

1. Move the backend to HTTPS.
2. Update the production API and WebSocket values in mobile/app/eas.json.
3. Increment IOS_BUILD_NUMBER.
4. Run npm run build:ios:production.
5. Submit through App Store Connect after testing.

Android production:

    npm run build:android:production

## 10. Release Checklist

- [ ] Production secrets are unique and deployment env files are not committed.
- [ ] PostgreSQL and Redis are not publicly exposed.
- [ ] API health returns HTTP 200.
- [ ] Profile and portfolio media upload to Hetzner and display through signed URLs.
- [ ] Paystack deposit verification changes the booking to confirmed.
- [ ] Paystack webhook is registered after HTTPS is enabled.
- [ ] Chat works through wss:// after the domain migration.
- [ ] Android preview is tested on an emulator and physical device.
- [ ] Apple Developer membership is active before iOS internal distribution.
- [ ] Database and media backups are configured.
- [ ] Privacy policy, terms, support contact, app icon, screenshots, and store metadata are ready before public release.
