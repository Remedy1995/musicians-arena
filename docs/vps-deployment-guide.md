# VPS Deployment Guide

This guide assumes:

- Ubuntu 24.04 or a similar Linux VPS
- Docker and Docker Compose plugin installed on the server

You can use this stack in two modes:

- IP preview mode for early testing on ports such as `8000` and `8080`
- domain mode later with the optional Caddy gateway profile for HTTPS

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
sudo ufw allow 8000/tcp
sudo ufw allow 8080/tcp
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

- set `API_PORT=8000`
- set `WEB_PORT=8080`
- set `EXPO_PUBLIC_API_BASE_URL=http://your-server-ip:8000/api/v1`
- set `EXPO_PUBLIC_WS_BASE_URL=ws://your-server-ip:8000`
- if you already have a domain and want HTTPS later, also set `APP_DOMAIN=api.yourdomain.com` and `ACME_EMAIL=you@yourdomain.com`

Important:

- database credentials are read from `backend/.env`
- `infra/.env.production` now carries port bindings and preview frontend build values in addition to optional gateway values
- if you deploy the preview web frontend on port `8080`, add `http://your-server-ip:8080` to `DJANGO_CORS_ALLOWED_ORIGINS`

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
curl http://your-server-ip:8000/api/v1/health/
curl http://your-server-ip:8000/api/v1/docs/swagger/
```

You should also verify the preview web frontend:

- `http://your-server-ip:8080`

You should also verify websocket traffic from the mobile app after you point:

- `EXPO_PUBLIC_API_BASE_URL=http://your-server-ip:8000/api/v1`
- `EXPO_PUBLIC_WS_BASE_URL=ws://your-server-ip:8000`

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

- The default stack now exposes the Django API directly on `API_PORT` and the preview web frontend on `WEB_PORT`.
- Caddy remains available behind the `gateway` profile for later domain-based HTTPS deployment.
- Postgres and Redis are kept internal to Docker and are not exposed publicly in production.
- Static files are collected into a shared Docker volume and served by Django/Caddy depending on the mode you use.
- Media files are stored on a shared Docker volume by default. For long-term production durability, S3-compatible storage is the better next step.
