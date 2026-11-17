# Payment And Settlement Flow

This document explains the business and technical flow for opportunity gigs, bookings, held funds, refunds, and talent payouts.

## Business Flow

1. An organizer publishes an opportunity.
2. A talent shows interest, or the organizer invites a talent.
3. Both parties negotiate in the booking conversation.
4. The organizer converts the selected interest into a booking with a quote, deposit, and balance.
5. The talent accepts the terms. The booking becomes `awaiting_deposit` and the terms are locked.
6. The organizer pays the deposit through Paystack.
7. The API verifies the Paystack reference and amount. A signed `charge.success` webhook is also accepted as confirmation.
8. The booking becomes `confirmed`. The payment is recorded as held in the platform ledger.
9. The organizer pays the remaining balance before the event.
10. The talent performs the agreed service.
11. The organizer confirms completion.
12. The API creates a pending talent payout. The payout worker transfers the net amount only after a valid Paystack recipient exists.
13. Paystack sends a transfer webhook. Only `transfer.success` marks the payout paid and the held payment released.

The platform's held state is an accounting state backed by the merchant's Paystack balance. It should not be advertised as regulated escrow without confirming the legal and provider arrangement.

## Cancellation And No-Show

- A cancellation applies the configured free or late-cancellation policy.
- A no-show opens a dispute and freezes the payment ledger.
- An administrator must choose the final booking outcome and provide resolution notes.
- An approved outcome creates the refund and/or compensation records.
- A rejected dispute returns disputed funds to the held state.
- Provider-backed refunds and payouts are asynchronous and remain visible as pending or processing until their webhooks arrive.
- When a late cancellation contains separate deposit and balance payments, the deposit can be allocated to talent compensation and the balance to the organizer refund. If the payment history cannot be separated safely, the platform keeps the funds pending for manual allocation rather than releasing the same money twice.

Users receive in-app and push notifications when a booking concern is opened, a dispute is resolved, a payout succeeds or fails, or a refund is processed or fails.

## API Contracts

### Talent payout recipient

`GET /api/v1/payments/payout-recipient/`

Returns the talent's masked payout recipient, or `null` when one has not been configured.

`POST /api/v1/payments/payout-recipient/`

Request body:

```json
{
  "recipient_type": "mobile_money",
  "display_name": "Talent name",
  "account_number": "233200000000",
  "bank_code": "provider-code"
}
```

The backend sends the details to Paystack, stores the returned recipient code, and never returns the raw account number to the mobile app.

### Paystack webhook

`POST /api/v1/payments/paystack/webhook/`

The API verifies the `x-paystack-signature` header. It handles:

- `charge.success`
- `transfer.success`
- `transfer.failed`
- `transfer.reversed`
- `refund.pending`
- `refund.processing`
- `refund.processed`
- `refund.failed`

## Production Configuration

Keep provider execution disabled until the Paystack account, recipients, webhook URL, and sandbox rehearsal are complete:

```dotenv
PAYSTACK_SECRET_KEY=<live-secret-key-from-paystack>
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_CURRENCY=GHS
PAYSTACK_TRANSFERS_ENABLED=False
PAYSTACK_REFUNDS_ENABLED=False
PAYMENT_ALLOW_MANUAL_RECORDING=False
```

Enable transfers and refunds only after the production Paystack account is approved for those capabilities:

```dotenv
PAYSTACK_TRANSFERS_ENABLED=True
PAYSTACK_REFUNDS_ENABLED=True
```

Never commit the real secret key. Set it only in the server's protected environment file or secret manager.

## Operational Checks

Before launch, test all of the following in the Paystack test environment:

- Deposit success and duplicate `charge.success` delivery.
- Balance success and an abandoned checkout.
- Talent recipient creation and invalid recipient details.
- Successful payout and duplicate `transfer.success` delivery.
- Failed and reversed payouts.
- Full refund and partial refund.
- Organizer cancellation before the free-cancellation cutoff.
- Late cancellation compensation.
- Organizer no-show and talent no-show dispute resolution.
- Retry after a worker or provider timeout.

Paystack's transfer lifecycle is documented in [Single Transfers](https://paystack.com/docs/transfers/single-transfers/), and payment confirmation guidance is available in [Verify Payments](https://paystack.com/docs/payments/verify-payments/) and [Webhooks](https://paystack.com/docs/payments/webhooks/).
