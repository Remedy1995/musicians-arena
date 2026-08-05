# Musician's Arena Deployment Guide

This is the authoritative, end-to-end deployment runbook for a fresh Ubuntu VPS. It deploys the Django backend, Channels WebSockets, Expo web build, PostgreSQL, Redis, Celery worker, Paystack checkout, and production media storage.

The commands are written for a server where the application is deployed from `/opt/musicians-arena` and run by a non-root `deploy` user. Root is used only for initial OS, Docker, firewall, and optional Nginx setup.

The deployment uses:

- musicianz.site for the Expo web application
- api.musicianz.site for Django REST APIs and WebSockets
- shirleytrading.com and www.shirleytrading.com for the existing Next.js application on port 3002
- Caddy for HTTPS certificates and reverse proxying
- Docker Compose for the application services
- Hetzner Object Storage for private profile and portfolio media
- Paystack for deposit and balance collection

The native Android and iOS applications are built on a development Mac. Android tester APKs and signed iOS distribution builds use EAS; local iOS development builds use Xcode. Neither mobile binary is hosted inside the VPS.

Caddy is the single public gateway. Do not run Nginx on ports 80 or 443 at the same time. Nginx may continue serving Shirley Trading internally on port 8081, while Caddy handles public HTTPS.

## Deployment modes

Use **domain mode** for any shared test environment or production deployment. It requires DNS and HTTPS, but it matches the mobile app configuration and prevents credentials and WebSockets from using insecure HTTP.

The Compose production file binds the API and web services to `127.0.0.1`; they are intentionally not directly public. An IP-only deployment is suitable only for local verification from the VPS or through an SSH tunnel. Do not change the bindings or turn off HTTPS security just to make a production mobile build reach an IP address.

The commands below use the current domains:

    musicianz.site       web application
    api.musicianz.site   REST API, Swagger, and WebSockets

Replace these values if deploying to a different domain.

For a backend-only deployment without the mobile and web release steps, use the focused runbook [`docs/backend-deployment-guide.md`](docs/backend-deployment-guide.md). This root guide remains the full platform runbook.

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
    apt install -y ca-certificates curl git ufw nano openssl

Install Docker Engine, BuildKit, and the Compose v2 plugin from Docker's official apt repository. This is important: installing Ubuntu's unrelated `docker.io` package or an old `docker-compose` binary can make `docker compose --profile gateway` fail with `unknown flag: --profile`.

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    . /etc/os-release
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker

After installation, verify both commands:

    docker --version
    docker compose version

`docker compose version` must report a Compose v2 release. If it still reports the old Docker CLI or the command is unavailable, stop here and fix Docker installation before cloning the application.

Create the deployment user and application directory:

    adduser deploy
    usermod -aG sudo deploy
    usermod -aG docker deploy
    install -d -o deploy -g deploy /opt/musicians-arena

Set a strong password when `adduser` prompts. If the root account uses SSH keys, copy the authorized key so the same key can log in as `deploy`:

    if [ -f /root/.ssh/authorized_keys ]; then
        install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
        cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
        chown deploy:deploy /home/deploy/.ssh/authorized_keys
        chmod 600 /home/deploy/.ssh/authorized_keys
    fi

Log out and back in before using Docker as `deploy` so the new group membership is loaded:

    exit
    ssh deploy@NEW_SERVER_IP

Confirm that the deployment user can use Docker without sudo:

    docker info

Keep the repository and secret files owned by `deploy`. Do not run application containers as root from a shell unless you are recovering the server.

### Optional SSH hardening

Before disabling password authentication, verify that a second terminal can log in as `deploy` using an SSH key. Only then, as root, edit `/etc/ssh/sshd_config` and set:

    PasswordAuthentication no
    PermitRootLogin prohibit-password

Validate and reload SSH without closing the working session:

    sshd -t
    systemctl reload ssh

## 3. Configure the firewall

Only SSH and the HTTPS gateway should be public. The API and web containers bind to localhost and are reached through Caddy.

Run:

    ufw allow OpenSSH
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    ufw status verbose

Do not open ports 5432, 6379, 8000, or 8080 for this production layout.

If a Hetzner Cloud Firewall is attached to the server, allow inbound TCP 22, 80, and 443 there as well. UFW and the provider firewall are separate layers; both must allow the traffic. Restrict SSH to your office or home IP when practical.

Check whether another web server already owns ports 80 or 443:

    ss -tulpn | grep -E ':80|:443'

If the new server is empty, no process should be using those ports. If Nginx or another project is already installed, do not stop it blindly. Either migrate that site into the same gateway or choose a separate VPS. Caddy cannot bind a port already owned by another service.

## 4. Clone the repository

From the `deploy` account, clone into the directory created above:

    cd /opt
    git clone https://github.com/Remedy1995/musicians-arena.git musicians-arena
    cd /opt/musicians-arena

For a checkout that already exists:

    cd /opt/musicians-arena
    git fetch origin
    git pull --ff-only origin main

Use HTTPS cloning if the server has no GitHub SSH key. Use SSH cloning only after you have configured a read-only deploy key. The production server must deploy the `main` branch unless a deliberate rollback is in progress.

## 5. Create the production environment files

The example files are safe templates. Copy them into ignored files:

    cd /opt/musicians-arena
    cp backend/.env.production.example backend/.env
    cp infra/.env.production.example infra/.env.production
    chmod 600 backend/.env infra/.env.production

Generate strong secrets on the server:

    python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
    python3 -c 'import secrets; print(secrets.token_urlsafe(32))'
    openssl rand -hex 32

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
    SHIRLEY_DOMAIN=shirleytrading.com
    SHIRLEY_WWW_DOMAIN=www.shirleytrading.com
    ACME_EMAIL=DEPLOY_EMAIL
    API_PORT=8000
    WEB_PORT=8080
    EXPO_PUBLIC_API_BASE_URL=https://api.musicianz.site/api/v1
    EXPO_PUBLIC_WS_BASE_URL=wss://api.musicianz.site

The API and web ports are internal host ports. Caddy is the only service that publishes 80 and 443.

After saving both files, verify ownership and permissions:

    chown deploy:deploy backend/.env infra/.env.production
    chmod 600 backend/.env infra/.env.production

Do not paste secrets directly into shell commands. Edit the files with `nano`, and never commit either file.

## 6.1 Keep Shirley Trading available

Keep the existing Next.js service on 127.0.0.1:3002 and move only the Shirley Nginx server block to internal port 8081:

    server {
        listen 0.0.0.0:8081;
        server_name shirleytrading.com www.shirleytrading.com;

        location / {
            proxy_pass http://127.0.0.1:3002;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

After editing the Shirley Nginx site configuration, validate and restart Nginx:

    nginx -t
    systemctl restart nginx
    systemctl status nginx --no-pager

Confirm both internal services are running:

    ss -ltnp | grep ':3002'
    ss -ltnp | grep ':8081'
    curl http://127.0.0.1:3002
    curl -H 'Host: shirleytrading.com' http://127.0.0.1:8081

The Caddy container proxies both Shirley domains to host.docker.internal:8081. Ensure both DNS records point to this VPS before Caddy requests certificates. Do not open port 8081 publicly; only ports 80 and 443 should be exposed.

Never commit backend/.env or infra/.env.production. They contain passwords, storage keys, and payment credentials.

## 7. Configure Hetzner Object Storage

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

## 8. Configure Paystack

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

## 9. Validate the Compose configuration

Before starting services, inspect the resolved Compose configuration:

    cd /opt/musicians-arena
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml config

The command must complete without an interpolation or parsing error. Before the first build, also download the third-party images:

    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml pull

Check that:

- caddy has APP_DOMAIN api.musicianz.site and WEB_DOMAIN musicianz.site
- caddy has Shirley Trading routes for shirleytrading.com and www.shirleytrading.com
- api and web bind to 127.0.0.1
- no secret values are pasted into logs or committed files
- the Caddyfile is mounted read-only

## 10. Start the full production stack

Run the gateway profile so Caddy, the API, the Expo web build, PostgreSQL, Redis, and the Celery worker start together:

    cd /opt/musicians-arena
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml up -d --build

The API entrypoint waits for PostgreSQL and Redis, runs migrations, collects static files, and then starts Daphne. Daphne serves both REST and WebSocket traffic on port 8000 inside the Docker network. The API health check includes the forwarded HTTPS headers so it works with DJANGO_SECURE_SSL_REDIRECT enabled.

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

If the API stays unhealthy, wait for the first migration/collectstatic run to finish and then inspect the API logs. Do not repeatedly rebuild while the first container is still running; the health check waits for Daphne to start after PostgreSQL and Redis are ready.

### 10.1 Create the first admin and seed reference data

Create an administrator for Django admin and support operations:

    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py createsuperuser

Seed the marketplace categories and event types used by gig and talent forms. This command is safe to run again because it updates the reference records:

    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py seed_marketplace_reference_data

Keep `/admin/` private to administrators. Do not create a shared admin account for testers.

### 10.2 Move an existing database to the new server

For a new installation with no existing data, skip this subsection. For a migration, make the dump on the old server first:

    cd /opt/musicians-arena
    mkdir -p /opt/backups
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > /opt/backups/musicians_arena-old-$(date +%F-%H%M).sql.gz

Copy the dump to the new server over SSH, then start only the database and Redis before restoring it:

    scp /opt/backups/musicians_arena-old-YYYY-MM-DD-HHMM.sql.gz deploy@NEW_SERVER_IP:/opt/backups/
    cd /opt/musicians-arena
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml up -d db redis
    gunzip -c /opt/backups/musicians_arena-old-YYYY-MM-DD-HHMM.sql.gz | docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'

Then start the full stack. The API entrypoint applies any migrations that were added after the dump:

    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml up -d --build

Do not restore a production dump into a database with a different application secret or unverified schema. Verify users, gigs, bookings, payments, and media references before switching DNS.

## 11. Verify the domain deployment

From the VPS:

    curl -I https://api.musicianz.site/api/v1/health/
    curl https://api.musicianz.site/api/v1/health/
    curl -I https://musicianz.site
    curl -I https://shirleytrading.com

The API health response should be:

    {"status":"ok","service":"musicians-arena-api"}

The web response should return HTTP 200 or a normal redirect. The Caddy logs should show successful certificate issuance. If certificates fail, check DNS, firewall rules, and whether another service owns port 80 or 443.

The API documentation is available from the API domain at the configured Swagger route. Use the API domain rather than the server IP for browser testing.

## 12. Deploy updates safely

For a normal application update:

    cd /opt/musicians-arena
    git fetch origin
    git pull --ff-only origin main
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml up -d --build
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml ps

Follow the API logs until Daphne reports that it is listening:

    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs -f api

Never use docker compose down -v during an update. The -v option can delete PostgreSQL, Redis, and local media volumes.

For a controlled update, record the current release before pulling:

    git rev-parse --short HEAD | tee /opt/musicians-arena.previous-release

If a new application image fails, return to the previous known-good commit, rebuild, and restart:

    git log --oneline -10
    git switch --detach KNOWN_GOOD_COMMIT
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml up -d --build

After recovery, investigate the failed release before switching `main` forward again. A database migration is not automatically reversible; restore a database backup or ship a forward migration rather than guessing with `migrate zero`.

Return to the deployment branch after the incident is resolved:

    git switch main

For a database backup before a risky migration:

    mkdir -p /opt/backups
    docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > /opt/backups/musicians_arena-$(date +%F-%H%M).sql.gz
    chmod 600 /opt/backups/musicians_arena-*.sql.gz

Check that the backup is non-empty:

    ls -lh /opt/backups
    gzip -t /opt/backups/musicians_arena-YYYY-MM-DD-HHMM.sql.gz

For a simple daily backup on a single VPS, add a cron entry with `crontab -e` as `deploy`:

    15 2 * * * cd /opt/musicians-arena && docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > /opt/backups/musicians_arena-$(date +\%F-\%H\%M).sql.gz

Copy these files off the VPS regularly. A cron job that writes only to the same disk does not protect against server loss.

Restore a backup only during a planned recovery window. This replaces the current database contents:

    gunzip -c /opt/backups/musicians_arena-YYYY-MM-DD-HHMM.sql.gz | docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'

Back up the database and Object Storage separately. A Docker volume is not a complete backup strategy. Copy `/opt/backups` to storage outside the VPS and retain at least one backup from before each migration.

To inspect volume names and disk usage:

    docker volume ls | grep musicians-arena
    docker system df
    df -h

Never run `docker system prune --volumes` on this server unless you have verified the volumes and backups. It can remove data that the application still needs.

## 13. Build and share the Android APK

Run mobile builds on the development Mac, not on the VPS. The `preview` EAS profile is the QA profile intended for sharing: it produces an installable APK and is already configured for the live API and WebSockets.

### 13.1 Prepare the Mac

Install Node.js and confirm the project dependencies can be installed:

    cd "/Users/japhetadjetey/Documents/Musician's arena/mobile/app"
    npm ci
    npm run typecheck

Log into the Expo account that owns the EAS project:

    npx eas-cli@latest login
    npx eas-cli@latest whoami

The app is linked to the EAS project through `EAS_PROJECT_ID` in `app.config.ts`. If this is a newly created Expo project, run `npx eas-cli@latest init` once and keep the generated project ID in the dynamic Expo config.

### 13.2 Build the shareable preview APK

For the first build, or after native Android configuration changes, clear the EAS cache:

    npm run build:android:preview:clean

For normal builds, use:

    npm run build:android:preview

The profile embeds these live endpoints into the app:

    EXPO_PUBLIC_API_BASE_URL=https://api.musicianz.site/api/v1
    EXPO_PUBLIC_WS_BASE_URL=wss://api.musicianz.site
    ALLOW_INSECURE_HTTP=false

When EAS finishes, open the build page and download the `.apk` artifact. Share that download link with testers. The link may expire according to the EAS artifact retention policy, so keep the build page URL with the release notes.

EAS manages the Android signing keystore. Do not delete or regenerate the keystore unless you understand the consequences for future updates; Android updates must continue using the same signing identity.

### 13.3 Install the APK on an Android phone

On a tester's phone:

1. Open the EAS APK link in the browser.
2. Download the APK.
3. Allow the browser or file manager to install unknown apps when Android asks.
4. Install the APK and open **Musician's Arena**.

Before testing, open this URL in the same phone browser:

    https://api.musicianz.site/api/v1/health/

It must return the JSON health response. The phone needs internet access; it does not need to be on the VPS's local network.

### 13.4 Install the APK on an Android emulator

Start the emulator, confirm ADB sees it, and install the downloaded artifact:

    adb devices
    adb install -r /path/to/musicians-arena.apk
    adb shell monkey -p com.remedy1995.musiciansarena -c android.intent.category.LAUNCHER 1

If the emulator has an older build with insecure HTTP settings, remove it first:

    adb uninstall com.remedy1995.musiciansarena

For a store-oriented build after QA:

    npm run build:android:production

Increase `ANDROID_VERSION_CODE` for each new Android release that will replace an existing installed build.

## 14. Build and install an iOS development build with Xcode

This section is for local development and QA through Xcode. The repository does not commit an `ios/` directory because it uses Expo prebuild; Xcode files are generated locally from `app.config.ts`.

### 14.1 Install the iOS toolchain

On the development Mac, install Xcode from the Mac App Store, open it once, accept the license, and install the required iOS Simulator runtime. Then verify:

    xcodebuild -version
    xcode-select -p
    pod --version

If CocoaPods is missing and Homebrew is installed:

    brew install cocoapods

The development build uses the live HTTPS API, so no local backend is required. Keep the Mac connected to the internet.

### 14.2 Generate the Xcode project with live endpoints

Expo's iOS autolinking command is not safe when the absolute project path contains an apostrophe. The current local path contains `Musician's arena`, so use a path without an apostrophe for the Xcode build. This keeps the source project unchanged and avoids editing generated files in `node_modules`.

Create a clean local build copy:

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
    cd ios
    pod install
    cd ..
    open ios/*.xcworkspace

Run `npx expo prebuild --platform ios` again whenever the native Expo configuration changes. Do not use `--clean` unless you intentionally want Expo to regenerate the native project and have backed up any native changes.

### 14.3 Run on an iOS Simulator

In Xcode:

1. Select the `Musician's Arena` scheme.
2. Select an iPhone Simulator from the run-destination menu.
3. Choose **Product → Run** or press `Cmd + R`.

Xcode builds and installs the `.app` into the selected simulator. A paid Apple Developer membership is not required for simulator testing. If the app cannot connect to Metro, run this in a second terminal and run again from Xcode:

    cd "/Users/japhetadjetey/Documents/Musician's arena/mobile/app"
    npx expo start

### 14.4 Run on a physical iPhone

For local development on your own iPhone:

1. Open **Xcode → Settings → Accounts** and add your Apple ID.
2. Connect the iPhone by USB, unlock it, and tap **Trust** if prompted.
3. On the iPhone, enable **Settings → Privacy & Security → Developer Mode**, then restart if requested.
4. In Xcode, select the app project and the app target.
5. Open **Signing & Capabilities**.
6. Enable **Automatically manage signing**.
7. Select your Apple **Team**. For a free personal team, choose your Personal Team if Xcode offers it.
8. Confirm the bundle identifier is `com.remedy1995.musiciansarena`.
9. Select the connected iPhone as the run destination.
10. Press `Cmd + R` and approve the developer certificate on the phone if iOS asks.

The first device build is simplest over USB. After the iPhone is paired in **Window → Devices and Simulators**, enable **Connect via network** to run over Wi-Fi. The Mac and iPhone must be on the same network, and Metro must be reachable from the phone.

A free Personal Team is suitable for local testing on the associated device, but it is not a distribution channel for other testers. The locally signed app may need to be rebuilt or re-authorized after the free signing period expires.

### 14.5 iOS distribution for other testers

An iOS build that can be shared through TestFlight or Ad Hoc distribution requires a paid Apple Developer Program membership. The Apple ID must belong to an Apple Developer team; an Expo account alone is not enough.

With a paid team, use EAS for the signed preview build:

    cd "/Users/japhetadjetey/Documents/Musician's arena/mobile/app"
    npm run build:ios:preview

For Ad Hoc installation, register each tester's device UDID with EAS before building. For TestFlight, build the production profile and submit to App Store Connect:

    IOS_BUILD_NUMBER=2 npm run build:ios:production

Then upload the resulting build through App Store Connect Transporter or EAS Submit and invite testers through TestFlight. Do not share an iOS `.app` built for the simulator with physical iPhones; simulator and device binaries are different.

The iOS app uses the same secure endpoints as Android:

    https://api.musicianz.site/api/v1
    wss://api.musicianz.site

## 15. Troubleshooting

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

## 16. Release checklist

- [ ] Both DNS records resolve to the new VPS.
- [ ] Shirley Trading DNS records resolve to the new VPS and its Next.js service is running on port 3002.
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
