# Musician's Arena Deployment Guide

This guide migrates Musician's Arena to a new Ubuntu VPS and deploys the Django backend, Channels WebSockets, Expo web build, PostgreSQL, Redis, Celery worker, Paystack checkout, and production media storage.

The deployment uses:

- musicianz.site for the Expo web application
- api.musicianz.site for Django REST APIs and WebSockets
- Caddy for HTTPS certificates and reverse proxying
- Docker Compose for the application services
- Hetzner Object Storage for private profile and portfolio media
- Paystack for deposit and balance collection

The native Android and iOS applications are built on a development Mac with EAS. They are not hosted inside the VPS.

## 1. Domain and server values

Before touching the new server, collect these values:

    NEW_SERVER_IP=the-public-ip-of-the-new-vps
    DEPLOY_EMAIL=an-email-you-monitor
    HETZNER_OBJECT_STORAGE_ENDPOINT=https://fsn1.your-objectstorage.com
    HETZNER_BUCKET=your-private-media-bucket
    PAYSTACK_SECRET_KEY=your-paystack-test-or-live-secret

The exact new server IP is intentionally not written into this repository. Replace NEW_SERVER_IP in the commands below with the IP assigned by Hetzner.

Create these DNS records at the provider that manages musicianz.site:

    Type  Name  Value
    A     @     NEW_SERVER_IP
    A     api   NEW_SERVER_IP

Optional browser alias:

    CNAME www   musicianz.site

Wait until the records resolve before starting Caddy. From your Mac, verify them with:

    dig +short musicianz.site
    dig +short api.musicianz.site

Both commands should return the new server IP. Caddy cannot obtain HTTPS certificates until both hostnames point to the new VPS and ports 80 and 443 are reachable.

## 2. Connect to the new VPS

Use the root account for the initial server setup:

    ssh root@NEW_SERVER_IP

Update Ubuntu and install the basic tools:

    apt update
    apt upgrade -y
    apt install -y ca-certificates curl git ufw

Install Docker Engine and the Compose plugin using Docker's official Ubuntu instructions:

    https://docs.docker.com/engine/install/ubuntu/

After installation, verify both commands:

    docker --version
    docker compose version

If you prefer to deploy as a non-root user, create one after Docker is installed:

    adduser deploy
    usermod -aG sudo deploy
    usermod -aG docker deploy

Log out and back in before using Docker as deploy:

    exit
    ssh deploy@NEW_SERVER_IP

The commands below work from either root or a user in the docker group. Keep the repository and secret files owned by the deployment user.

## 3. Configure the firewall

Only SSH and the HTTPS gateway should be public. The API and web containers bind to localhost and are reached through Caddy.

Run:

    ufw allow OpenSSH
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    ufw status verbose

Do not open ports 5432, 6379, 8000, or 8080 for this production layout.

Check whether another web server already owns ports 80 or 443:

    ss -tulpn | grep -E ':80|:443'

If the new server is empty, no process should be using those ports. If Nginx or another project is already installed, do not stop it blindly. Either migrate that site into the same gateway or choose a separate VPS. Caddy cannot bind a port already owned by another service.

## 4. Clone the repository

Create a predictable application directory:

    mkdir -p /opt
    cd /opt
    git clone https://github.com/Remedy1995/musicians-arena.git musicians-arena
    cd /opt/musicians-arena

For a checkout that already exists:

    cd /opt/musicians-arena
    git fetch origin
    git pull --ff-only origin main

Use HTTPS cloning if the server has no GitHub SSH key. Use SSH cloning only after you have configured a deploy key.

## 5. Create the production environment files

The example files are safe templates. Copy them into ignored files:

    cd /opt/musicians-arena
    cp backend/.env.production.example backend/.env
    cp infra/.env.production.example infra/.env.production
    chmod 600 backend/.env infra/.env.production

Generate strong secrets on the server:

    python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
    python3 -c 'import secrets; print(secrets.token_urlsafe(32))'

Edit the Django environment:

    nano backend/.env

At minimum, replace the secret and database placeholders:

    DJANGO_SECRET_KEY=paste-the-long-random-value
    DB_PASSWORD=use-a-strong-database-password
    POSTGRES_PASSWORD=use-the-same-strong-database-password

The two database passwords must match because PostgreSQL uses POSTGRES_PASSWORD on first initialization and Django uses DB_PASSWORD to connect.

The domain values should be:

    DJANGO_ENV=production
    DJANGO_DEBUG=False
    DJANGO_ALLOWED_HOSTS=api.musicianz.site,localhost,127.0.0.1
    DJANGO_CSRF_TRUSTED_ORIGINS=https://api.musicianz.site,https://musicianz.site
    DJANGO_CORS_ALLOWED_ORIGINS=https://musicianz.site,https://www.musicianz.site
    DJANGO_SECURE_SSL_REDIRECT=True
    DJANGO_USE_X_FORWARDED_HOST=True
    DJANGO_USE_X_FORWARDED_PORT=True

Edit the Compose environment:

    nano infra/.env.production

Set:

    APP_DOMAIN=api.musicianz.site
    WEB_DOMAIN=musicianz.site
    ACME_EMAIL=DEPLOY_EMAIL
    API_PORT=8000
    WEB_PORT=8080
    EXPO_PUBLIC_API_BASE_URL=https://api.musicianz.site/api/v1
    EXPO_PUBLIC_WS_BASE_URL=wss://api.musicianz.site

The API and web ports are internal host ports. Caddy is the only service that publishes 80 and 443.

Never commit backend/.env or infra/.env.production. They contain passwords, storage keys, and payment credentials.

## 6. Configure Hetzner Object Storage

Create a private bucket in the Hetzner Object Storage console and create an access key with access limited to that bucket where possible.

For a bucket in Falkenstein, edit backend/.env and set:

    MEDIA_FILE_STORAGE_BACKEND=storages.backends.s3.S3Storage
    AWS_STORAGE_BUCKET_NAME=HETZNER_BUCKET
    AWS_ACCESS_KEY_ID=your-hetzner-access-key
    AWS_SECRET_ACCESS_KEY=your-hetzner-secret-key
    AWS_S3_REGION_NAME=fsn1
    AWS_S3_ENDPOINT_URL=https://fsn1.your-objectstorage.com
    AWS_S3_SIGNATURE_VERSION=s3v4
    AWS_S3_ADDRESSING_STYLE=virtual
    AWS_S3_CUSTOM_DOMAIN=
    AWS_QUERYSTRING_AUTH=True
    AWS_S3_FILE_OVERWRITE=False
    AWS_LOCATION=media

Keep the bucket private. The API returns signed media URLs when AWS_QUERYSTRING_AUTH is enabled.

The Docker media volume remains mounted as a safe fallback. Do not remove it until any files from the old server have been copied and verified in Object Storage.

If the old server still has local media, copy it to a temporary directory first and then upload it with an S3-compatible client:

    mkdir -p /opt/media-backup
    docker compose --env-file infra/.env.production -f docker-compose.prod.yml cp api:/app/media /opt/media-backup
    aws s3 sync /opt/media-backup s3://HETZNER_BUCKET/media/ --endpoint-url https://fsn1.your-objectstorage.com --region fsn1

Install the AWS CLI only if it is not already available. Replace HETZNER_BUCKET and the endpoint with your actual values.

## 7. Configure Paystack

Start with Paystack test mode. Put the secret only in backend/.env:

    PAYSTACK_SECRET_KEY=sk_test_your_secret
    PAYSTACK_BASE_URL=https://api.paystack.co
    PAYSTACK_CURRENCY=GHS
    PAYSTACK_PAYMENT_CHANNELS=card,mobile_money,bank,ussd
    PAYSTACK_REQUEST_TIMEOUT_SECONDS=20

After the HTTPS domain is working, register this webhook in Paystack:

    https://api.musicianz.site/api/v1/payments/paystack/webhook/

The Paystack secret is never included in the mobile app. The backend calculates the deposit and balance, initializes checkout, verifies the reference and amount, and records the money as held funds.

Test the business flow:

1. Create a gig and convert a suitable applicant into a booking.
2. Accept the booking offer.
3. Open the booking as the organizer and pay the deposit through Paystack test checkout.
4. Return to the app and use the payment refresh action.
5. Verify that the booking reflects the deposit as held and does not pay the talent yet.
6. After the service, record completion and collect the remaining balance.
7. Release the talent payout only after the organizer confirms completion and the dispute window has passed.

Paystack test cards and test payment guidance are available at:

    https://paystack.com/docs/payments/test-payments/

## 8. Validate the Compose configuration

Before starting services, inspect the resolved Compose configuration:

    cd /opt/musicians-arena
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml config

Check that:

- caddy has APP_DOMAIN api.musicianz.site and WEB_DOMAIN musicianz.site
- api and web bind to 127.0.0.1
- no secret values are pasted into logs or committed files
- the Caddyfile is mounted read-only

## 9. Start the full production stack

Run the gateway profile so Caddy, the API, the Expo web build, PostgreSQL, Redis, and the Celery worker start together:

    cd /opt/musicians-arena
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml up -d --build

The API entrypoint waits for PostgreSQL and Redis, runs migrations, collects static files, and then starts Daphne. Daphne serves both REST and WebSocket traffic on port 8000 inside the Docker network.

Check service state:

    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml ps

The expected services are:

    caddy
    api
    web
    worker
    db
    redis

Read startup logs:

    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs --tail=100 api
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs --tail=100 caddy
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs --tail=100 web
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs --tail=100 worker

## 10. Verify the domain deployment

From the VPS:

    curl -I https://api.musicianz.site/api/v1/health/
    curl https://api.musicianz.site/api/v1/health/
    curl -I https://musicianz.site

The API health response should be:

    {"status":"ok","service":"musicians-arena-api"}

The web response should return HTTP 200 or a normal redirect. The Caddy logs should show successful certificate issuance. If certificates fail, check DNS, firewall rules, and whether another service owns port 80 or 443.

The API documentation is available from the API domain at the configured Swagger route. Use the API domain rather than the server IP for browser testing.

## 11. Deploy updates safely

For a normal application update:

    cd /opt/musicians-arena
    git fetch origin
    git pull --ff-only origin main
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml up -d --build
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml ps

Follow the API logs until Daphne reports that it is listening:

    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs -f api

Never use docker compose down -v during an update. The -v option can delete PostgreSQL, Redis, and local media volumes.

For a database backup before a risky migration:

    mkdir -p /opt/backups
    docker compose --env-file infra/.env.production -f docker-compose.prod.yml exec -T db pg_dump -U musicians_arena -d musicians_arena > /opt/backups/musicians_arena-$(date +%F-%H%M).sql

Back up the database and Object Storage separately. A Docker volume is not a complete backup strategy.

## 12. Build the Android app

Run native builds on the development Mac, not on the VPS:

    cd "/Users/japhetadjetey/Documents/Musician's arena/mobile/app"
    npm install
    npm run typecheck
    npx eas-cli@latest login
    npm run build:android:preview:clean

The preview and production profiles now use:

    https://api.musicianz.site/api/v1
    wss://api.musicianz.site

When EAS finishes, download the APK and install it on a running emulator or physical Android device:

    adb install -r /path/to/musicians-arena.apk
    adb shell monkey -p com.remedy1995.musiciansarena -c android.intent.category.LAUNCHER 1

If an older APK was installed with cleartext HTTP settings, uninstall it before testing the new secure build:

    adb uninstall com.remedy1995.musiciansarena

EAS manages the Android signing keystore. Keep the EAS account and project ID secure.

For a release build:

    npm run build:android:production

## 13. Build the iOS app

An installable iOS preview or TestFlight build requires a paid Apple Developer Program membership. The Expo account alone does not provide an Apple signing team.

From the development Mac:

    cd "/Users/japhetadjetey/Documents/Musician's arena/mobile/app"
    npm run build:ios:preview

After QA:

1. Increment IOS_BUILD_NUMBER in the build environment.
2. Run npm run build:ios:production.
3. Submit the build to App Store Connect.
4. Test through TestFlight before public release.

The app uses the same HTTPS API and secure WebSocket domain on iOS.

## 14. Troubleshooting

Caddy does not start:

    ss -tulpn | grep -E ':80|:443'
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs caddy

If Nginx or another project owns the ports, move that project or make one gateway route all sites. Do not run two services on the same ports.

The API is unhealthy:

    docker compose --env-file infra/.env.production -f docker-compose.prod.yml logs --tail=200 api
    docker compose --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py check
    docker compose --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py showmigrations

Database authentication fails:

- DB_PASSWORD and POSTGRES_PASSWORD must match.
- If the PostgreSQL volume already exists, changing POSTGRES_PASSWORD does not change the existing database password automatically.
- Do not delete the database volume to solve a password problem. Reset the password deliberately from psql or restore from backup.

The browser shows a CORS error:

- confirm the browser URL is https://musicianz.site
- confirm DJANGO_CORS_ALLOWED_ORIGINS contains https://musicianz.site
- recreate the API after changing backend/.env

The mobile app cannot connect:

- open https://api.musicianz.site/api/v1/health/ on the device browser
- confirm the EAS build contains https:// and wss://, not the old IP or ws://
- rebuild the APK after changing app configuration
- check Caddy and API logs for the request

WebSockets do not connect:

- confirm the mobile build uses wss://api.musicianz.site
- confirm Caddy is proxying api.musicianz.site to api:8000
- confirm Redis is healthy
- inspect API logs while opening the chat screen

## 15. Release checklist

- [ ] Both DNS records resolve to the new VPS.
- [ ] Ports 80 and 443 are allowed; ports 5432, 6379, 8000, and 8080 are not public.
- [ ] backend/.env and infra/.env.production contain unique secrets and are not committed.
- [ ] Caddy serves musicianz.site and api.musicianz.site over HTTPS.
- [ ] API health returns HTTP 200.
- [ ] Swagger is reachable from the API domain.
- [ ] PostgreSQL and Redis containers are healthy.
- [ ] Celery worker starts without errors.
- [ ] Profile and portfolio media upload to private Hetzner Object Storage.
- [ ] Paystack test deposit and webhook have been verified.
- [ ] Booking funds remain held until completion and dispute handling is complete.
- [ ] Chat works through wss://.
- [ ] Android preview works on an emulator and physical device.
- [ ] Apple Developer membership is active before iOS internal distribution.
- [ ] Database and media backups are configured.
- [ ] Privacy policy, terms, support contact, app icon, screenshots, and store metadata are ready before public release.

Useful official references:

    Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
    Caddy automatic HTTPS: https://caddyserver.com/docs/automatic-https
    Expo EAS Build: https://docs.expo.dev/build/introduction/
    Paystack test payments: https://paystack.com/docs/payments/test-payments/
