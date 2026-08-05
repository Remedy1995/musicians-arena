# Musician's Arena Backend Deployment

This is the backend-only deployment runbook for a fresh Ubuntu VPS. It deploys the Django REST API, Django Channels WebSockets, PostgreSQL, Redis, Celery, Caddy HTTPS, static files, optional Hetzner Object Storage, and optional Paystack configuration.

The mobile application and Expo web application are built separately. They use these public backend endpoints:

    REST API:  https://api.musicianz.site/api/v1/
    Swagger:   https://api.musicianz.site/api/v1/docs/swagger/
    WebSocket: wss://api.musicianz.site/ws/

The commands assume:

- Ubuntu 24.04 or later on a new VPS.
- The server is reachable as NEW_SERVER_IP.
- The application lives at /opt/musicians-arena.
- A non-root deploy user runs the application.
- api.musicianz.site points to this server.
- Caddy is the only service using public ports 80 and 443.

## 1. Architecture

    Mobile/web client
            |
            | HTTPS and WSS
            v
    Caddy :443
            |
            v
    Daphne API :8000 ---- PostgreSQL
            |
            +------------- Redis
            |
    Celery worker -------- Redis and PostgreSQL

The API and worker are Docker containers. Daphne serves HTTP and WebSocket traffic from the same API process. PostgreSQL and Redis are private Docker services.

## 2. DNS and server values

Create this DNS record before requesting HTTPS:

    Type:  A
    Name:  api
    Value: NEW_SERVER_IP

From your development computer, verify DNS:

~~~bash
dig +short api.musicianz.site
~~~

The result must be the new server IP. If you use a different domain, replace api.musicianz.site in this guide, backend/.env, infra/.env.production, and the Caddy configuration.

## 3. Prepare Ubuntu and Docker

Log in as root for the initial server setup:

~~~bash
ssh root@NEW_SERVER_IP
~~~

Update Ubuntu and install base tools:

~~~bash
apt update
apt upgrade -y
apt install -y ca-certificates curl git ufw nano openssl
~~~

Install Docker Engine and Compose v2 from Docker's official repository. This avoids the old docker-compose package and the unknown flag: --profile error.

~~~bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
CODENAME="$(printf '%s' "$VERSION_CODENAME")"
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $CODENAME stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
~~~

Verify both commands:

~~~bash
docker --version
docker compose version
~~~

The second command must report Compose v2. If docker compose is unavailable or rejects --profile, fix Docker installation before continuing.

Create the deployment user:

~~~bash
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy
install -d -o deploy -g deploy /opt/musicians-arena
~~~

If root uses SSH keys, copy the authorized key:

~~~bash
if [ -f /root/.ssh/authorized_keys ]; then
    install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
    chown deploy:deploy /home/deploy/.ssh/authorized_keys
    chmod 600 /home/deploy/.ssh/authorized_keys
fi
~~~

Start a new SSH session so the Docker group is loaded:

~~~bash
exit
ssh deploy@NEW_SERVER_IP
docker info
~~~

Do not disable root SSH or password authentication until key-based login as deploy has been tested in a second terminal.

## 4. Configure the firewall

Allow only SSH and the public HTTPS gateway:

~~~bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
~~~

Do not expose these internal ports:

    5432  PostgreSQL
    6379  Redis
    8000  Daphne
    8080  Expo web service

If a Hetzner Cloud Firewall is attached, allow TCP 22, 80, and 443 there too. Check for existing port owners:

~~~bash
ss -tulpn | grep -E ':80|:443' || true
~~~

Nginx, Apache, or another Caddy process must not already own ports 80 or 443. Reconfigure another site deliberately before starting this gateway.

## 5. Clone the repository

As the deploy user:

~~~bash
cd /opt
git clone https://github.com/Remedy1995/musicians-arena.git musicians-arena
cd /opt/musicians-arena
~~~

For an existing checkout:

~~~bash
cd /opt/musicians-arena
git fetch origin
git pull --ff-only origin main
~~~

Use a read-only GitHub deploy key instead of storing a personal GitHub credential on the server.

## 6. Create production environment files

Copy the templates:

~~~bash
cd /opt/musicians-arena
cp backend/.env.production.example backend/.env
cp infra/.env.production.example infra/.env.production
chmod 600 backend/.env infra/.env.production
~~~

Generate secrets without committing them:

~~~bash
python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
openssl rand -hex 32
~~~

Edit the Django environment:

~~~bash
nano backend/.env
~~~

Set the following values, replacing placeholders:

~~~dotenv
DJANGO_ENV=production
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=paste-a-long-random-value
DJANGO_ALLOWED_HOSTS=api.musicianz.site,localhost,127.0.0.1
DJANGO_CSRF_TRUSTED_ORIGINS=https://api.musicianz.site,https://musicianz.site
DJANGO_CORS_ALLOWED_ORIGINS=https://musicianz.site,https://www.musicianz.site
DJANGO_CORS_ALLOW_ALL_ORIGINS=False
DJANGO_TIME_ZONE=Africa/Accra
DJANGO_USE_X_FORWARDED_HOST=True
DJANGO_USE_X_FORWARDED_PORT=True
DJANGO_SESSION_COOKIE_SECURE=True
DJANGO_CSRF_COOKIE_SECURE=True
DJANGO_SECURE_SSL_REDIRECT=True

DB_ENGINE=django.db.backends.postgresql
DB_NAME=musicians_arena
DB_USER=musicians_arena
DB_PASSWORD=paste-a-strong-database-password
DB_HOST=db
DB_PORT=5432
DB_CONN_MAX_AGE=60

POSTGRES_DB=musicians_arena
POSTGRES_USER=musicians_arena
POSTGRES_PASSWORD=paste-the-same-database-password

REDIS_URL=redis://redis:6379/0
CHANNELS_USE_REDIS=True
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
CELERY_TASK_ALWAYS_EAGER=False

MEDIA_FILE_STORAGE_BACKEND=django.core.files.storage.FileSystemStorage
PAYSTACK_SECRET_KEY=sk_test_replace_me
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_CURRENCY=GHS
PAYSTACK_PAYMENT_CHANNELS=card,mobile_money,bank,ussd
PAYSTACK_REQUEST_TIMEOUT_SECONDS=20
~~~

DB_PASSWORD and POSTGRES_PASSWORD must match. On an existing PostgreSQL volume, changing POSTGRES_PASSWORD does not change the existing database password.

Edit the Compose environment:

~~~bash
nano infra/.env.production
~~~

Set:

~~~dotenv
APP_DOMAIN=api.musicianz.site
WEB_DOMAIN=musicianz.site
ACME_EMAIL=you@example.com
API_PORT=8000
WEB_PORT=8080
EXPO_PUBLIC_API_BASE_URL=https://api.musicianz.site/api/v1
EXPO_PUBLIC_WS_BASE_URL=wss://api.musicianz.site
~~~

Set ownership and permissions:

~~~bash
sudo chown deploy:deploy backend/.env infra/.env.production
chmod 600 backend/.env infra/.env.production
~~~

Never commit either environment file. Do not paste secrets into shell commands where they will remain in shell history.

The current gateway profile also includes the Expo web service because the shared Caddy configuration serves musicianz.site and api.musicianz.site. No mobile build is required on this VPS. If the web application is hosted elsewhere, use a separate Caddy or Nginx configuration that proxies only api.musicianz.site to 127.0.0.1:8000.

## 7. Optional Hetzner Object Storage

For initial testing, local FileSystemStorage writes media to the persistent media_data Docker volume. For production durability, create a private Hetzner Object Storage bucket and a bucket-scoped access key.

Replace the local storage setting in backend/.env:

~~~dotenv
MEDIA_FILE_STORAGE_BACKEND=storages.backends.s3.S3Storage
AWS_STORAGE_BUCKET_NAME=your-private-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_REGION_NAME=fsn1
AWS_S3_ENDPOINT_URL=https://fsn1.your-objectstorage.com
AWS_S3_SIGNATURE_VERSION=s3v4
AWS_S3_ADDRESSING_STYLE=virtual
AWS_S3_CUSTOM_DOMAIN=
AWS_QUERYSTRING_AUTH=True
AWS_S3_FILE_OVERWRITE=False
AWS_LOCATION=media
~~~

Keep the bucket private. Signed URLs are generated when AWS_QUERYSTRING_AUTH is enabled. Do not delete the media_data volume until existing files have been copied and verified in Object Storage.

## 8. Validate Compose

Render the final Compose configuration:

~~~bash
cd /opt/musicians-arena
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml config
~~~

The command must complete without a parsing or interpolation error. Confirm that:

- API database host is db.
- Redis URL is redis://redis:6379/0.
- API binds to 127.0.0.1:8000.
- Caddy is the only service publishing ports 80 and 443.
- API migrations and collectstatic are enabled.
- No secrets are in tracked files.

Pull third-party images:

~~~bash
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml pull
~~~

## 9. Start the backend

Start PostgreSQL, Redis, Daphne, Celery, and the public gateway:

~~~bash
cd /opt/musicians-arena
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml up -d --build
~~~

The API entrypoint waits for PostgreSQL and Redis, runs migrations, collects static files, and starts Daphne on port 8000. Daphne serves REST and WebSocket traffic from the same process.

Check service state:

~~~bash
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml ps
~~~

Expected services:

    api       healthy
    db        healthy
    redis     healthy
    worker    running
    caddy     running

Read startup logs:

~~~bash
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs --tail=150 api
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs --tail=100 worker
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs --tail=100 caddy
~~~

Wait for Daphne to report Listening on TCP address 0.0.0.0:8000. Do not repeatedly rebuild while the first migrations and static-file collection are running.

## 10. Create admin and reference data

Create the first administrator:

~~~bash
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py createsuperuser
~~~

Seed categories and event types used by the app:

~~~bash
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py seed_marketplace_reference_data
~~~

For staging or QA search demonstrations, seed ten talents and ten organizers. This is idempotent and prints the shared demo password:

~~~bash
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py seed_demo_users
~~~

The default demo password is `DemoPass123!`. Change it with `--password` and never use demo credentials for production accounts.

The seed command is safe to run again. Keep the admin account private and do not share it with testers.

## 11. Configure Paystack

Start in Paystack test mode. Set PAYSTACK_SECRET_KEY=sk_test_... in backend/.env, then recreate the API and worker:

~~~bash
docker compose --env-file infra/.env.production -f docker-compose.prod.yml up -d --force-recreate api worker
~~~

After HTTPS is working, register this webhook in Paystack:

    https://api.musicianz.site/api/v1/payments/paystack/webhook/

The secret key remains on the backend. The backend initializes and verifies payment references, validates amount and currency, and records deposit and balance payments as held funds.

Complete a booking deposit, balance, webhook, cancellation, dispute, and payout test before switching to live Paystack keys.

## 12. Verify the public API

Run checks from the VPS and from another computer:

~~~bash
curl -i https://api.musicianz.site/api/v1/health/
curl https://api.musicianz.site/api/v1/health/
curl -I https://api.musicianz.site/api/v1/docs/swagger/
~~~

Expected health response:

~~~json
{"status":"ok","service":"musicians-arena-api"}
~~~

Open Swagger:

    https://api.musicianz.site/api/v1/docs/swagger/

The mobile client should use:

    API:       https://api.musicianz.site/api/v1
    WebSocket: wss://api.musicianz.site

Verify chat and notifications from the app. The phone needs internet access; it does not need to be on the VPS's local network.

## 13. Update safely

Record the current release and create a database backup before a risky update:

~~~bash
cd /opt/musicians-arena
git rev-parse --short HEAD | tee /opt/musicians-arena.previous-release
mkdir -p /opt/backups
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > /opt/backups/musicians_arena-$(date +%F-%H%M).sql.gz
chmod 600 /opt/backups/musicians_arena-*.sql.gz
ls -lh /opt/backups
~~~

Pull and rebuild:

~~~bash
git fetch origin
git pull --ff-only origin main
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml up -d --build
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml ps
~~~

Follow the API logs:

~~~bash
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs -f api
~~~

Never run docker compose down -v during an update. The -v flag can delete PostgreSQL, Redis, and local media volumes.

## 14. Roll back and restore

If an application image fails, return to the last known-good commit and rebuild:

~~~bash
git log --oneline -10
git switch --detach KNOWN_GOOD_COMMIT
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml up -d --build
~~~

Do not reverse a production migration with migrate zero. Ship a forward migration or restore a planned database backup.

Restore a backup only during a planned recovery window:

~~~bash
gunzip -c /opt/backups/musicians_arena-YYYY-MM-DD-HHMM.sql.gz | docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
~~~

Copy backups off the VPS. A backup stored only on the same disk does not protect against server loss. Back up the database and Object Storage separately.

## 15. Troubleshooting

### docker compose rejects --profile

The old Docker Compose binary is installed. Verify:

~~~bash
docker compose version
docker --version
~~~

Install Docker's docker-compose-plugin using Section 3. Do not substitute podman-docker for production.

### API is unhealthy or connection is reset

~~~bash
docker compose --env-file infra/.env.production -f docker-compose.prod.yml logs --tail=250 api
docker compose --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py check
docker compose --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py showmigrations
ss -ltnp | grep ':8000' || true
~~~

Wait for migrations and Daphne startup. If the API logs show database authentication errors, verify both database passwords and whether the PostgreSQL volume was initialized with an older password.

### Caddy cannot bind port 80 or 443

~~~bash
ss -tulpn | grep -E ':80|:443'
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs caddy
~~~

Only one public gateway may own each port. Reconfigure Nginx or another Caddy service deliberately.

### HTTPS returns 502

~~~bash
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml ps
docker compose --profile gateway --env-file infra/.env.production -f docker-compose.prod.yml logs --tail=200 api
curl http://127.0.0.1:8000/api/v1/health/
~~~

If the localhost check fails, fix Daphne/API first. If it succeeds but HTTPS returns 502, inspect Caddy logs, DNS, and the Caddy upstream name.

### REST works but WebSockets fail

- Confirm the app uses wss://api.musicianz.site, not ws:// or the old IP.
- Confirm Redis is healthy.
- Confirm Caddy proxies api.musicianz.site to api:8000.
- Inspect API logs while opening chat.
- Rebuild the mobile app after changing endpoint variables.

### Media upload fails

- Confirm the selected storage backend and all S3 endpoint credentials.
- Keep the bucket private and use signed URLs.
- Check API logs for Object Storage errors.
- Do not delete media_data until migration is verified.

## 16. Backend release checklist

- [ ] DNS api.musicianz.site resolves to the new VPS.
- [ ] Docker Engine and Compose v2 are installed.
- [ ] deploy can run Docker without root.
- [ ] Only ports 22, 80, and 443 are public.
- [ ] backend/.env and infra/.env.production are private and uncommitted.
- [ ] PostgreSQL and Redis are healthy.
- [ ] Migrations and static collection complete.
- [ ] Daphne serves HTTP and WebSockets.
- [ ] Celery worker is running.
- [ ] HTTPS health check returns HTTP 200.
- [ ] Swagger is reachable.
- [ ] Paystack test payment and webhook are verified.
- [ ] Media storage and backups are verified.
- [ ] Mobile clients use the live HTTPS and WSS endpoints.

## References

- Docker Engine: https://docs.docker.com/engine/install/ubuntu/
- Caddy automatic HTTPS: https://caddyserver.com/docs/automatic-https
- Paystack test payments: https://paystack.com/docs/payments/test-payments/
