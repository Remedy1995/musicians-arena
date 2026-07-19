# Musician's Arena Backend

## Stack

- Django
- Django REST Framework
- Django Channels
- Celery
- PostgreSQL or SQLite for local bootstrap

## Quick Start

1. Create and activate the virtual environment.
2. Install dependencies from `requirements.txt`.
3. Copy `.env.example` to `.env` and update values.
4. Run migrations.
5. Start the development server.

## Commands

```bash
.venv/bin/python backend/manage.py makemigrations
.venv/bin/python backend/manage.py migrate
.venv/bin/python backend/manage.py runserver
cd backend && ../.venv/bin/daphne -b 127.0.0.1 -p 8002 config.asgi:application
```

## Docker

```bash
docker compose up --build
```

This starts:
- PostgreSQL
- Redis
- ASGI API server on `http://127.0.0.1:8000`
- Celery worker

## Initial API Endpoints

- `GET /api/v1/health/`
- `GET /api/v1/schema/`
- `GET /api/v1/docs/swagger/`
- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/login/`
- `GET /api/v1/auth/me/`
- `GET /api/v1/profiles/me/`
- `PATCH /api/v1/profiles/me/`
- `GET /api/v1/profiles/categories/`
- `GET /api/v1/profiles/event-types/`
- `GET /api/v1/profiles/talent/me/`
- `PATCH /api/v1/profiles/talent/me/`
- `GET /api/v1/profiles/talents/`
- `GET /api/v1/profiles/talents/<uuid>/`
- `GET /api/v1/profiles/talent/me/media/`
- `POST /api/v1/profiles/talent/me/media/`
- `GET /api/v1/profiles/talent/me/media/<uuid>/`
- `PATCH /api/v1/profiles/talent/me/media/<uuid>/`
- `DELETE /api/v1/profiles/talent/me/media/<uuid>/`
- `GET /api/v1/bookings/`
- `POST /api/v1/bookings/`
- `GET /api/v1/bookings/<uuid>/`
- `PATCH /api/v1/bookings/<uuid>/`
- `POST /api/v1/bookings/<uuid>/action/`
- `POST /api/v1/bookings/<uuid>/counteroffer/`
- `GET /api/v1/bookings/<uuid>/disputes/`
- `POST /api/v1/bookings/<uuid>/disputes/`
- `GET /api/v1/bookings/<uuid>/disputes/<uuid>/`
- `PATCH /api/v1/bookings/<uuid>/disputes/<uuid>/`
- `GET /api/v1/gigs/`
- `POST /api/v1/gigs/`
- `GET /api/v1/gigs/mine/`
- `GET /api/v1/gigs/<uuid>/`
- `PATCH /api/v1/gigs/<uuid>/`
- `POST /api/v1/gigs/<uuid>/interests/`
- `PATCH /api/v1/gigs/interests/<uuid>/`
- `POST /api/v1/gigs/interests/<uuid>/convert-to-booking/`
- `GET /api/v1/messaging/conversations/`
- `POST /api/v1/messaging/conversations/`
- `GET /api/v1/messaging/conversations/<uuid>/`
- `GET /api/v1/messaging/conversations/<uuid>/messages/`
- `POST /api/v1/messaging/conversations/<uuid>/messages/`
- `POST /api/v1/messaging/conversations/<uuid>/read/`
- `GET /api/v1/notifications/`
- `GET /api/v1/notifications/unread-count/`
- `PATCH /api/v1/notifications/<uuid>/read/`
- `GET /api/v1/payments/`
- `GET /api/v1/payments/payouts/`
- `GET /api/v1/payments/bookings/<uuid>/summary/`
- `POST /api/v1/payments/bookings/<uuid>/paystack/initialize/`
- `POST /api/v1/payments/bookings/<uuid>/paystack/verify/`
- `POST /api/v1/payments/paystack/webhook/`

## Discovery Filters

`GET /api/v1/profiles/talents/` supports:
- `search`
- `primary_category`
- `skill_category`
- `event_type`
- `city`
- `region`
- `country`
- `is_featured`
- `is_verified`
- `min_rating`
- `min_reliability`
- `min_experience`
- `min_hourly_rate`
- `max_hourly_rate`
- `min_fixed_price`
- `max_fixed_price`
- `ordering`

`GET /api/v1/gigs/` supports:
- `search`
- `event_type`
- `required_category`
- `city`
- `region`
- `status`
- `visibility`
- `is_urgent`
- `budget_min_gte`
- `budget_max_lte`
- `event_date_from`
- `event_date_to`
- `ordering`

## Portfolio Uploads

- Use `multipart/form-data` for `POST /api/v1/profiles/talent/me/media/`
- Supported media categories:
  - `image`
  - `audio`
  - `video`
- You may send either:
  - a file upload in `file`
  - an existing hosted URL in `storage_url`

The API stores metadata such as:
- `mime_type`
- `file_size_bytes`
- `processing_status`
- `visibility`
- `sort_order`

## Disputes

- A booking can have only one active dispute at a time.
- Creating a dispute automatically moves the booking into `disputed` status.
- Only admin users can resolve or reject disputes through the dispute detail update endpoint.

## Held-Funds Booking Payment Policy

Paystack checkout is now available in test mode through these endpoints:

- `POST /api/v1/payments/bookings/<booking_id>/paystack/initialize/` with `{"payment_type":"deposit"}` or `{"payment_type":"balance"}`.
- `POST /api/v1/payments/bookings/<booking_id>/paystack/verify/` with the returned `provider_reference` after checkout.
- `POST /api/v1/payments/paystack/webhook/` for signed `charge.success` notifications.

The backend calculates the outstanding milestone amount, sends it to Paystack in the currency subunit, checks the returned amount/currency/reference, and only then marks the local payment as `successful` and `held`. The Paystack secret key must never be placed in the mobile app.

For local/test setup, add `PAYSTACK_SECRET_KEY=sk_test_...` to `backend/.env`. In the Paystack dashboard test settings, register the public URL `https://<api-domain>/api/v1/payments/paystack/webhook/`. On an IP-only HTTP deployment, use the mobile “I’ve completed payment” verification action for testing; webhooks require a publicly reachable HTTPS endpoint.

Production media uses the same Django file fields with an S3-compatible storage backend. Set `MEDIA_FILE_STORAGE_BACKEND=storages.backends.s3.S3Storage`, bucket credentials, region/endpoint, and a public custom domain or signed URLs in `backend/.env`. Do not delete the local media volume until existing files have been copied to the bucket.

- Booking deposit and balance payments are recorded as successful provider payments, but their internal `fund_state` stays `held`.
- Deposit payment moves an accepted booking from `awaiting_deposit` to `confirmed`; no talent payout is created at this point.
- Balance payment is required before the organizer can confirm completion.
- Organizer completion confirmation moves the booking to `completed` and creates a pending payout, minus platform commission.
- Early organizer cancellation refunds held funds to the organizer.
- Late organizer cancellation compensates the talent from the held deposit.
- Talent cancellation or talent no-show keeps the organizer protected through refund outcomes.
- No-show reports move the booking to `disputed` and freeze held funds for support/admin review.

## Seed Reference Data

```bash
.venv/bin/python backend/manage.py seed_marketplace_reference_data
```

## WebSocket Chat

- Endpoint: `ws://127.0.0.1:8000/ws/chat/conversations/<conversation_id>/?token=<auth_token>`
- Send message payload:

```json
{
  "action": "message.send",
  "message_type": "text",
  "body": "Hello"
}
```

- Mark conversation read:

```json
{
  "action": "message.read"
}
```

## WebSocket Notifications

- Endpoint: `ws://127.0.0.1:8000/ws/notifications/?token=<auth_token>`
- Event payload:

```json
{
  "event": "notification.created",
  "notification": {
    "id": "uuid",
    "type": "booking_created"
  },
  "unread_count": 3
}
```
