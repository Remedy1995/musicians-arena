# VPS Deployment Guide

This guide assumes:

- Ubuntu 24.04 or a similar Linux VPS
- a domain or subdomain pointed to the VPS, for example `api.example.com`
- Docker and Docker Compose plugin installed on the server

## 1. Prepare the VPS

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw
```

Install Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

Open the firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2. Clone the project

```bash
git clone git@github.com-remedy:Remedy1995/musicians-arena.git
cd musicians-arena
```

## 3. Create the production env files

```bash
cp backend/.env.production.example backend/.env
cp infra/.env.production.example infra/.env.production
```

Update `backend/.env`:

- set `DJANGO_SECRET_KEY`
- set `DJANGO_ALLOWED_HOSTS`
- set `DJANGO_CSRF_TRUSTED_ORIGINS`
- set `DJANGO_CORS_ALLOWED_ORIGINS`
- set `DB_PASSWORD`
- set `POSTGRES_PASSWORD`
- if you will keep local media on the VPS for now, leave `MEDIA_FILE_STORAGE_BACKEND=django.core.files.storage.FileSystemStorage`
- if you will use S3 later, switch `MEDIA_FILE_STORAGE_BACKEND=storages.backends.s3.S3Storage` and fill the AWS values

Update `infra/.env.production`:

- set `APP_DOMAIN=api.yourdomain.com`
- set `ACME_EMAIL=you@yourdomain.com`

## 4. Start the stack

```bash
docker compose --env-file infra/.env.production -f docker-compose.prod.yml up -d --build
```

Check status:

```bash
docker compose --env-file infra/.env.production -f docker-compose.prod.yml ps
docker compose --env-file infra/.env.production -f docker-compose.prod.yml logs -f api
```

## 5. Verify the deployment

Once the containers are healthy, test:

```bash
curl https://api.yourdomain.com/api/v1/health/
curl https://api.yourdomain.com/api/v1/docs/swagger/
```

You should also verify websocket traffic from the mobile app after you point:

- `EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1`
- `EXPO_PUBLIC_WS_BASE_URL=wss://api.yourdomain.com`

## 6. Run admin tasks

Create a superuser:

```bash
docker compose --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py createsuperuser
```

Open a Django shell if needed:

```bash
docker compose --env-file infra/.env.production -f docker-compose.prod.yml exec api python manage.py shell
```

## 7. Update the server after new pushes

```bash
git pull origin main
docker compose --env-file infra/.env.production -f docker-compose.prod.yml up -d --build
```

## 8. Useful troubleshooting commands

```bash
docker compose --env-file infra/.env.production -f docker-compose.prod.yml logs -f
docker compose --env-file infra/.env.production -f docker-compose.prod.yml logs -f caddy
docker compose --env-file infra/.env.production -f docker-compose.prod.yml logs -f worker
docker compose --env-file infra/.env.production -f docker-compose.prod.yml restart api
docker compose --env-file infra/.env.production -f docker-compose.prod.yml ps
```

## Notes

- Caddy handles HTTPS termination and proxies both HTTP and websocket traffic to Daphne.
- Postgres and Redis are kept internal to Docker and are not exposed publicly in production.
- Static files are collected into a shared Docker volume and served by Caddy.
- Media files are stored on a shared Docker volume by default. For long-term production durability, S3-compatible storage is the better next step.
