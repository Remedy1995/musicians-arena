# VPS Deployment Guide

The complete, current deployment procedure is maintained in the repository root:

- [`DEPLOYMENT.md`](../DEPLOYMENT.md)
- [`backend-deployment-guide.md`](backend-deployment-guide.md) for the backend-only API deployment.

That runbook is the source of truth for a new Ubuntu VPS. It covers Docker Engine and Compose v2 installation, the non-root deployment user, firewall rules, DNS, Django and Compose environment files, PostgreSQL, Redis, Daphne, Celery, Caddy HTTPS, WebSockets, Hetzner Object Storage, Paystack, backups, restores, updates, rollback, and Android/iOS build configuration.

Do not use the old direct-IP instructions from this file. The production Compose file binds the API and web services to localhost and expects the public Caddy gateway to terminate HTTPS. Direct IP mode is only appropriate for local checks or an SSH tunnel.
