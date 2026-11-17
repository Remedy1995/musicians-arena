import hashlib
import hmac
import json
import urllib.error
import urllib.request
from datetime import datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.bookings.models import Booking
from apps.payments.models import Payment, Payout, PayoutRecipient, Refund


MONEY_QUANT = Decimal("0.01")


def money(value):
    return Decimal(value or "0").quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def commission_rate():
    return Decimal(str(settings.PAYMENT_PLATFORM_COMMISSION_RATE))


def event_start_at(booking: Booking):
    start = datetime.combine(booking.event_date, booking.start_time or time.min)
    if timezone.is_naive(start):
        return timezone.make_aware(start, timezone.get_current_timezone())
    return start


def event_end_at(booking: Booking):
    end_time = booking.end_time or booking.start_time or time.min
    end = datetime.combine(booking.event_date, end_time)
    if timezone.is_naive(end):
        return timezone.make_aware(end, timezone.get_current_timezone())
    return end


def balance_due_at(booking: Booking):
    return event_start_at(booking) - timedelta(hours=settings.PAYMENT_BALANCE_DUE_HOURS_BEFORE_EVENT)


def completion_confirmation_due_at(booking: Booking):
    return event_end_at(booking) + timedelta(hours=settings.PAYMENT_COMPLETION_CONFIRMATION_HOURS)


def successful_collection_payments(booking: Booking):
    return booking.payments.filter(status=Payment.Status.SUCCESSFUL).exclude(payment_type=Payment.PaymentType.REFUND)


def successful_or_pending_refunds(booking: Booking):
    return booking.refunds.filter(status__in=[Refund.Status.PENDING, Refund.Status.PROCESSING, Refund.Status.PAID])


def successful_or_pending_payouts(booking: Booking):
    return booking.payouts.filter(status__in=[Payout.Status.PENDING, Payout.Status.PROCESSING, Payout.Status.PAID])


def payment_totals(booking: Booking):
    payments = list(successful_collection_payments(booking))
    deposit_target = money(booking.deposit_amount)
    balance_target = money(booking.balance_amount)
    quoted_target = money(booking.quoted_amount)

    deposit_direct = sum((payment.amount for payment in payments if payment.payment_type == Payment.PaymentType.DEPOSIT), Decimal("0.00"))
    balance_direct = sum((payment.amount for payment in payments if payment.payment_type == Payment.PaymentType.BALANCE), Decimal("0.00"))
    full_paid = sum((payment.amount for payment in payments if payment.payment_type == Payment.PaymentType.FULL), Decimal("0.00"))
    total_paid = sum((payment.amount for payment in payments), Decimal("0.00"))

    full_deposit_allocation = min(full_paid, deposit_target)
    full_balance_allocation = max(full_paid - full_deposit_allocation, Decimal("0.00"))
    deposit_paid = min(deposit_direct + full_deposit_allocation, deposit_target) if deposit_target else deposit_direct
    balance_paid = min(balance_direct + full_balance_allocation, balance_target) if balance_target else balance_direct

    refund_amount = sum((refund.amount for refund in successful_or_pending_refunds(booking)), Decimal("0.00"))
    payout_gross_amount = sum((payout.gross_amount for payout in successful_or_pending_payouts(booking)), Decimal("0.00"))
    held_amount = max(total_paid - refund_amount - payout_gross_amount, Decimal("0.00"))
    outstanding_amount = max(quoted_target - total_paid, Decimal("0.00"))

    return {
        "deposit_paid": money(deposit_paid),
        "balance_paid": money(balance_paid),
        "total_paid": money(total_paid),
        "held_amount": money(held_amount),
        "refunded_or_pending_amount": money(refund_amount),
        "payout_gross_or_pending_amount": money(payout_gross_amount),
        "outstanding_amount": money(outstanding_amount),
        "deposit_is_paid": bool(deposit_target and deposit_paid >= deposit_target),
        "is_fully_funded": bool(quoted_target and total_paid >= quoted_target),
    }


def projected_commission(amount):
    return money(money(amount) * commission_rate())


def projected_net_payout(amount):
    gross = money(amount)
    return money(gross - projected_commission(gross))


def prepare_booking_payment_policy(booking: Booking):
    booking.balance_due_at = balance_due_at(booking)
    booking.completion_confirmation_due_at = completion_confirmation_due_at(booking)
    booking.payment_policy_json = {
        "deposit_percentage": str(settings.PAYMENT_DEPOSIT_PERCENTAGE),
        "commission_rate": str(settings.PAYMENT_PLATFORM_COMMISSION_RATE),
        "balance_due_hours_before_event": settings.PAYMENT_BALANCE_DUE_HOURS_BEFORE_EVENT,
        "free_cancellation_hours_before_event": settings.PAYMENT_FREE_CANCELLATION_HOURS_BEFORE_EVENT,
        "completion_confirmation_hours": settings.PAYMENT_COMPLETION_CONFIRMATION_HOURS,
    }


def create_successful_held_payment(*, booking: Booking, payer, payment_type, amount, provider="", provider_reference=""):
    return Payment.objects.create(
        booking=booking,
        payer=payer,
        payment_type=payment_type,
        amount=money(amount),
        currency_code=booking.currency_code,
        provider=provider,
        provider_reference=provider_reference,
        status=Payment.Status.SUCCESSFUL,
        fund_state=Payment.FundState.HELD,
        paid_at=timezone.now(),
    )


class PaystackError(Exception):
    """Raised when Paystack cannot initialize or verify a transaction."""


def _masked_account(account_number):
    normalized = str(account_number).strip()
    return f"****{normalized[-4:]}" if len(normalized) >= 4 else "****"


def create_paystack_transfer_recipient(*, user, recipient_type, display_name, account_number, bank_code=""):
    if not settings.PAYSTACK_TRANSFERS_ENABLED:
        raise PaystackError("Paystack transfers are not enabled for this environment.")
    if recipient_type not in {
        PayoutRecipient.RecipientType.MOBILE_MONEY,
        PayoutRecipient.RecipientType.GHIPSS,
    }:
        raise PaystackError("Unsupported Ghana payout recipient type.")

    payload = {
        "type": recipient_type,
        "name": display_name,
        "account_number": str(account_number).strip(),
        "bank_code": str(bank_code).strip(),
        "currency": settings.PAYSTACK_CURRENCY,
        "email": user.email or "",
        "description": "Musician's Arena talent payout recipient",
    }
    data = _paystack_request("POST", "/transferrecipient", payload)
    recipient_code = data.get("recipient_code")
    if not recipient_code:
        raise PaystackError("Paystack did not return a payout recipient code.")

    recipient, _ = PayoutRecipient.objects.update_or_create(
        user=user,
        defaults={
            "recipient_type": recipient_type,
            "display_name": display_name,
            "masked_account": _masked_account(account_number),
            "bank_code": str(bank_code).strip(),
            "currency_code": settings.PAYSTACK_CURRENCY,
            "recipient_code": recipient_code,
            "status": PayoutRecipient.Status.ACTIVE,
            "metadata_json": {"provider": "paystack"},
        },
    )
    return recipient


def paystack_amount_subunit(amount, currency_code):
    if currency_code != settings.PAYSTACK_CURRENCY:
        raise PaystackError(f"Paystack payments currently support {settings.PAYSTACK_CURRENCY} bookings only.")
    return int((money(amount) * 100).to_integral_value())


def _paystack_request(method, path, payload=None):
    if not settings.PAYSTACK_SECRET_KEY:
        raise PaystackError("Paystack is not configured. Add PAYSTACK_SECRET_KEY to the backend environment.")

    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        f"{settings.PAYSTACK_BASE_URL.rstrip('/')}/{path.lstrip('/')}",
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=settings.PAYSTACK_REQUEST_TIMEOUT_SECONDS) as response:
            response_body = json.loads(response.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise PaystackError("Paystack could not be reached. Please try again.") from exc

    if not response_body.get("status"):
        raise PaystackError(response_body.get("message") or "Paystack rejected the transaction.")
    return response_body.get("data") or {}


def payment_target_for_type(*, booking: Booking, payment_type):
    totals = payment_totals(booking)
    quoted_amount = money(booking.quoted_amount)
    if payment_type == Payment.PaymentType.DEPOSIT:
        if booking.status != Booking.Status.AWAITING_DEPOSIT:
            raise PaystackError("Deposit payments are only available while this booking is awaiting deposit.")
        amount = max(money(booking.deposit_amount) - totals["deposit_paid"], Decimal("0.00"))
    elif payment_type == Payment.PaymentType.BALANCE:
        if booking.status not in {Booking.Status.CONFIRMED, Booking.Status.IN_PROGRESS}:
            raise PaystackError("Balance payments are only available after the booking is confirmed.")
        amount = max(money(booking.balance_amount) - totals["balance_paid"], Decimal("0.00"))
    elif payment_type == Payment.PaymentType.FULL:
        if booking.status not in {Booking.Status.AWAITING_DEPOSIT, Booking.Status.CONFIRMED}:
            raise PaystackError("Full payments are not available for this booking state.")
        amount = max(quoted_amount - totals["total_paid"], Decimal("0.00"))
    else:
        raise PaystackError("This payment type is not supported by Paystack checkout.")

    if amount <= 0:
        raise PaystackError("There is no outstanding amount for this payment milestone.")
    return money(amount)


def initialize_paystack_payment(*, booking: Booking, payer, payment_type):
    amount = payment_target_for_type(booking=booking, payment_type=payment_type)
    existing = Payment.objects.filter(
        booking=booking,
        payer=payer,
        payment_type=payment_type,
        provider="paystack",
        status__in=[Payment.Status.PENDING, Payment.Status.PROCESSING],
    ).order_by("-created_at").first()
    if existing:
        paystack_metadata = existing.metadata_json.get("paystack", {})
        if paystack_metadata.get("authorization_url") and existing.amount == amount:
            return existing, paystack_metadata

    payment = Payment.objects.create(
        booking=booking,
        payer=payer,
        payment_type=payment_type,
        amount=amount,
        currency_code=booking.currency_code,
        provider="paystack",
        status=Payment.Status.PROCESSING,
        fund_state=Payment.FundState.PENDING,
        metadata_json={"payment_type": payment_type, "booking_id": str(booking.id)},
    )
    reference = f"ma-{booking.id.hex}-{payment.id.hex}"
    payload = {
        "email": payer.email,
        "amount": paystack_amount_subunit(amount, booking.currency_code),
        "currency": booking.currency_code,
        "reference": reference,
        "channels": list(settings.PAYSTACK_PAYMENT_CHANNELS),
        "metadata": {
            "booking_id": str(booking.id),
            "payment_id": str(payment.id),
            "payment_type": payment_type,
            "platform": "musicians-arena",
        },
    }
    if settings.PAYSTACK_CALLBACK_URL:
        payload["callback_url"] = settings.PAYSTACK_CALLBACK_URL

    try:
        checkout = _paystack_request("POST", "/transaction/initialize", payload)
    except PaystackError as exc:
        payment.status = Payment.Status.FAILED
        payment.metadata_json = {**payment.metadata_json, "paystack_error": str(exc)}
        payment.save(update_fields=["status", "metadata_json", "updated_at"])
        raise

    metadata = {
        "payment_type": payment_type,
        "booking_id": str(booking.id),
        "paystack": {
            "authorization_url": checkout.get("authorization_url", ""),
            "access_code": checkout.get("access_code", ""),
        },
    }
    payment.provider_reference = checkout.get("reference") or reference
    payment.metadata_json = metadata
    payment.save(update_fields=["provider_reference", "metadata_json", "updated_at"])
    return payment, metadata["paystack"]


def finalize_paystack_payment(*, payment: Payment, paystack_data):
    reference = paystack_data.get("reference")
    if reference != payment.provider_reference:
        raise PaystackError("Paystack reference does not match this payment.")

    expected_amount = paystack_amount_subunit(payment.amount, payment.currency_code)
    if int(paystack_data.get("amount") or 0) != expected_amount:
        raise PaystackError("Paystack amount does not match the booking amount.")
    if (paystack_data.get("currency") or payment.currency_code).upper() != payment.currency_code.upper():
        raise PaystackError("Paystack currency does not match the booking currency.")

    payment.metadata_json = {
        **payment.metadata_json,
        "paystack": {
            **payment.metadata_json.get("paystack", {}),
            "status": paystack_data.get("status"),
            "channel": paystack_data.get("channel"),
            "gateway_response": paystack_data.get("gateway_response"),
            "paid_at": paystack_data.get("paid_at"),
        },
    }
    paystack_status = paystack_data.get("status")
    if paystack_status != "success":
        terminal_failure_statuses = {"failed", "abandoned", "reversed"}
        payment.status = Payment.Status.FAILED if paystack_status in terminal_failure_statuses else Payment.Status.PROCESSING
        payment.save(update_fields=["status", "metadata_json", "updated_at"])
        if payment.status == Payment.Status.PROCESSING:
            raise PaystackError("Paystack is still processing this payment. Try verification again shortly.")
        raise PaystackError("Paystack has not marked this transaction as successful.")

    payment.status = Payment.Status.SUCCESSFUL
    payment.fund_state = Payment.FundState.HELD
    payment.provider_fee_amount = money(Decimal(str(paystack_data.get("fees") or 0)) / 100)
    payment.paid_at = timezone.now()
    payment.save(update_fields=["status", "fund_state", "provider_fee_amount", "paid_at", "metadata_json", "updated_at"])
    refresh_booking_after_payment(booking=payment.booking, changed_by=payment.payer)
    return payment


def verify_paystack_payment(*, payment: Payment):
    if payment.status == Payment.Status.SUCCESSFUL and payment.fund_state == Payment.FundState.HELD:
        return payment
    paystack_data = _paystack_request("GET", f"/transaction/verify/{payment.provider_reference}")
    return finalize_paystack_payment(payment=payment, paystack_data=paystack_data)


def verify_paystack_signature(*, raw_body, signature):
    if not signature or not settings.PAYSTACK_SECRET_KEY:
        return False
    expected = hmac.new(settings.PAYSTACK_SECRET_KEY.encode("utf-8"), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(expected, signature)


def _transfer_reference(payout):
    return payout.idempotency_key or f"ma_payout_{payout.id.hex}"


@transaction.atomic
def execute_paystack_payout(*, payout_id):
    payout = Payout.objects.select_for_update().select_related("payee").get(id=payout_id)
    if payout.status == Payout.Status.PAID:
        return payout
    if not settings.PAYSTACK_TRANSFERS_ENABLED:
        return payout

    recipient = PayoutRecipient.objects.filter(
        user=payout.payee,
        status=PayoutRecipient.Status.ACTIVE,
    ).first()
    if not recipient:
        payout.status = Payout.Status.FAILED
        payout.metadata_json = {
            **(payout.metadata_json or {}),
            "last_error": "Talent has not configured an active payout recipient.",
        }
        payout.save(update_fields=["status", "metadata_json", "updated_at"])
        from apps.notifications.services import notify_payout_event

        transaction.on_commit(lambda: notify_payout_event(payout=payout, event="failed"))
        return payout

    reference = _transfer_reference(payout)
    if payout.status == Payout.Status.PROCESSING and payout.provider_reference:
        return payout

    payout.idempotency_key = reference
    payout.provider_reference = reference
    payout.status = Payout.Status.PROCESSING
    payout.metadata_json = {
        **(payout.metadata_json or {}),
        "recipient_code": recipient.recipient_code,
    }
    payout.save(update_fields=["idempotency_key", "provider_reference", "status", "metadata_json", "updated_at"])

    try:
        transfer = _paystack_request(
            "POST",
            "/transfer",
            {
                "source": "balance",
                "amount": paystack_amount_subunit(payout.net_amount, payout.booking.currency_code),
                "recipient": recipient.recipient_code,
                "reference": reference,
                "reason": f"Musician's Arena payout for booking {payout.booking_id}",
            },
        )
    except PaystackError as exc:
        payout.status = Payout.Status.PENDING
        payout.metadata_json = {**(payout.metadata_json or {}), "last_error": str(exc)}
        payout.save(update_fields=["status", "metadata_json", "updated_at"])
        raise

    payout.metadata_json = {
        **(payout.metadata_json or {}),
        "transfer_code": transfer.get("transfer_code"),
        "provider_status": transfer.get("status"),
    }
    payout.save(update_fields=["metadata_json", "updated_at"])
    return payout


def _refund_allocations(refund):
    return (refund.metadata_json or {}).get("allocations", {})


@transaction.atomic
def execute_paystack_refund(*, refund_id):
    refund = Refund.objects.select_for_update().get(id=refund_id)
    if refund.status == Refund.Status.PAID:
        return refund
    if not settings.PAYSTACK_REFUNDS_ENABLED:
        return refund

    refund.status = Refund.Status.PROCESSING
    refund.save(update_fields=["status", "updated_at"])
    allocations = _refund_allocations(refund)
    remaining = money(refund.amount) - sum(
        (money(value.get("amount")) for value in allocations.values() if value.get("status") in {"accepted", "processing", "processed"}),
        Decimal("0.00"),
    )

    payments = successful_collection_payments(refund.booking).filter(
        provider="paystack",
        fund_state__in=[Payment.FundState.REFUND_PENDING, Payment.FundState.HELD],
    ).order_by("paid_at", "created_at")
    for payment in payments:
        if remaining <= 0:
            break
        reference = payment.provider_reference
        if not reference or reference in allocations:
            continue
        amount = min(remaining, money(payment.amount))
        try:
            response = _paystack_request(
                "POST",
                "/refund",
                {
                    "transaction": reference,
                    "amount": paystack_amount_subunit(amount, payment.currency_code),
                },
            )
        except PaystackError as exc:
            refund.status = Refund.Status.PENDING
            refund.metadata_json = {
                **(refund.metadata_json or {}),
                "last_error": str(exc),
            }
            refund.save(update_fields=["status", "metadata_json", "updated_at"])
            raise

        allocations[reference] = {
            "payment_id": str(payment.id),
            "amount": str(amount),
            "status": "accepted",
            "provider_id": response.get("id"),
        }
        remaining -= amount

    refund.metadata_json = {**(refund.metadata_json or {}), "allocations": allocations}
    if remaining <= 0:
        refund.status = Refund.Status.PROCESSING
    refund.save(update_fields=["status", "metadata_json", "updated_at"])
    return refund


def _find_payout_for_transfer(reference):
    return Payout.objects.filter(
        idempotency_key=reference,
    ).first() or Payout.objects.filter(provider_reference=reference).first()


@transaction.atomic
def process_paystack_transfer_webhook(*, event, data):
    reference = data.get("reference") or ""
    payout = _find_payout_for_transfer(reference)
    if not payout:
        return None

    payout.metadata_json = {
        **(payout.metadata_json or {}),
        "provider_status": data.get("status"),
        "gateway_response": data.get("gateway_response"),
        "failures": data.get("failures"),
    }
    if event == "transfer.success":
        payout.status = Payout.Status.PAID
        payout.paid_at = timezone.now()
        successful_collection_payments(payout.booking).filter(
            fund_state=Payment.FundState.RELEASE_PENDING,
        ).update(fund_state=Payment.FundState.RELEASED)
    elif event == "transfer.failed":
        payout.status = Payout.Status.FAILED
        successful_collection_payments(payout.booking).filter(
            fund_state=Payment.FundState.RELEASE_PENDING,
        ).update(fund_state=Payment.FundState.HELD)
    elif event == "transfer.reversed":
        payout.status = Payout.Status.REVERSED
        successful_collection_payments(payout.booking).filter(
            fund_state=Payment.FundState.RELEASE_PENDING,
        ).update(fund_state=Payment.FundState.HELD)
    else:
        return payout
    payout.save(update_fields=["status", "paid_at", "metadata_json", "updated_at"])
    if event in {"transfer.success", "transfer.failed", "transfer.reversed"}:
        from apps.notifications.services import notify_payout_event

        event_name = {
            "transfer.success": "paid",
            "transfer.failed": "failed",
            "transfer.reversed": "reversed",
        }[event]
        transaction.on_commit(lambda: notify_payout_event(payout=payout, event=event_name))
    return payout


@transaction.atomic
def process_paystack_refund_webhook(*, event, data):
    transaction_value = data.get("transaction")
    if isinstance(transaction_value, dict):
        transaction_value = transaction_value.get("reference") or transaction_value.get("id")
    reference = data.get("transaction_reference") or transaction_value or data.get("reference") or ""
    refunds = list(Refund.objects.select_for_update().filter(status__in=[Refund.Status.PENDING, Refund.Status.PROCESSING]))
    refund = next(
        (
            candidate
            for candidate in refunds
            if reference in _refund_allocations(candidate)
            or any(item.get("provider_id") == data.get("id") for item in _refund_allocations(candidate).values())
        ),
        None,
    )
    if not refund:
        return None

    allocations = _refund_allocations(refund)
    allocation_key = reference if reference in allocations else next(
        (
            key
            for key, item in allocations.items()
            if item.get("provider_id") == data.get("id")
        ),
        None,
    )
    allocation = allocations.get(allocation_key) if allocation_key else None
    if allocation is not None:
        allocation["status"] = {
            "refund.pending": "accepted",
            "refund.processing": "processing",
            "refund.processed": "processed",
            "refund.failed": "failed",
        }.get(event, allocation.get("status"))

    if event == "refund.processed":
        if allocation:
            payment = Payment.objects.filter(id=allocation.get("payment_id")).first()
            if payment:
                payment.fund_state = Payment.FundState.REFUNDED
                payment.save(update_fields=["fund_state", "updated_at"])
        if allocations and all(item.get("status") == "processed" for item in allocations.values()):
            refund.status = Refund.Status.PAID
            refund.processed_at = timezone.now()
    elif event == "refund.failed":
        refund.status = Refund.Status.FAILED
    else:
        refund.status = Refund.Status.PROCESSING

    refund.metadata_json = {**(refund.metadata_json or {}), "allocations": allocations}
    refund.save(update_fields=["status", "processed_at", "metadata_json", "updated_at"])
    if event == "refund.processed" and refund.status == Refund.Status.PAID:
        from apps.notifications.services import notify_refund_event

        transaction.on_commit(lambda: notify_refund_event(refund=refund, event="paid"))
    elif event == "refund.failed":
        from apps.notifications.services import notify_refund_event

        transaction.on_commit(lambda: notify_refund_event(refund=refund, event="failed"))
    return refund


def process_paystack_webhook(*, payload):
    event = payload.get("event")
    if event in {"transfer.success", "transfer.failed", "transfer.reversed"}:
        return process_paystack_transfer_webhook(event=event, data=payload.get("data") or {})
    if event in {"refund.pending", "refund.processing", "refund.processed", "refund.failed"}:
        return process_paystack_refund_webhook(event=event, data=payload.get("data") or {})
    if event != "charge.success":
        return None
    data = payload.get("data") or {}
    payment = Payment.objects.select_related("booking", "payer").filter(
        provider="paystack",
        provider_reference=data.get("reference", ""),
    ).first()
    if not payment:
        return None
    return finalize_paystack_payment(payment=payment, paystack_data=data)


def refresh_booking_after_payment(*, booking: Booking, changed_by):
    totals = payment_totals(booking)

    if booking.status == Booking.Status.AWAITING_DEPOSIT and totals["deposit_is_paid"]:
        prepare_booking_payment_policy(booking)
        booking.transition_status(
            to_status=Booking.Status.CONFIRMED,
            changed_by=changed_by,
            reason="Deposit received and funds are held by the platform.",
            save=False,
        )
        booking.save()

    if booking.status == Booking.Status.DISPUTED:
        successful_collection_payments(booking).update(fund_state=Payment.FundState.DISPUTED)

    return totals


def classify_cancellation(*, booking: Booking, cancelled_by):
    if cancelled_by.id == booking.talent_id:
        return Booking.CancellationPolicy.TALENT_CANCELLED

    free_cancel_cutoff = event_start_at(booking) - timedelta(hours=settings.PAYMENT_FREE_CANCELLATION_HOURS_BEFORE_EVENT)
    if timezone.now() <= free_cancel_cutoff:
        return Booking.CancellationPolicy.CLIENT_FREE_CANCELLATION
    return Booking.CancellationPolicy.CLIENT_LATE_CANCELLATION


def compensation_for_policy(*, booking: Booking, policy):
    totals = payment_totals(booking)
    held_amount = totals["held_amount"]
    deposit_paid = totals["deposit_paid"]

    if policy in {
        Booking.CancellationPolicy.CLIENT_LATE_CANCELLATION,
        Booking.CancellationPolicy.CLIENT_NO_SHOW,
    }:
        compensation_amount = min(deposit_paid, held_amount)
        refund_amount = max(held_amount - compensation_amount, Decimal("0.00"))
        return money(refund_amount), money(compensation_amount)

    if policy in {
        Booking.CancellationPolicy.CLIENT_FREE_CANCELLATION,
        Booking.CancellationPolicy.TALENT_CANCELLED,
        Booking.CancellationPolicy.TALENT_NO_SHOW,
    }:
        return money(held_amount), Decimal("0.00")

    return Decimal("0.00"), Decimal("0.00")


@transaction.atomic
def apply_cancellation_policy(*, booking: Booking, cancelled_by, reason=""):
    policy = classify_cancellation(booking=booking, cancelled_by=cancelled_by)
    refund_amount, compensation_amount = compensation_for_policy(booking=booking, policy=policy)

    booking.cancelled_by = cancelled_by
    booking.cancellation_policy = policy
    booking.cancellation_reason = reason
    booking.refund_due_amount = refund_amount
    booking.talent_compensation_amount = compensation_amount
    booking.save(
        update_fields=[
            "cancelled_by",
            "cancellation_policy",
            "cancellation_reason",
            "refund_due_amount",
            "talent_compensation_amount",
            "updated_at",
        ]
    )

    refund = None
    if refund_amount > 0:
        refund_reason = {
            Booking.CancellationPolicy.CLIENT_FREE_CANCELLATION: Refund.Reason.CLIENT_FREE_CANCELLATION,
            Booking.CancellationPolicy.TALENT_CANCELLED: Refund.Reason.TALENT_CANCELLED,
        }.get(policy, Refund.Reason.ADMIN_DECISION)
        refund, _ = Refund.objects.update_or_create(
            booking=booking,
            reason=refund_reason,
            defaults={
                "recipient": booking.client,
                "amount": refund_amount,
                "currency_code": booking.currency_code,
                "status": Refund.Status.PENDING,
                "metadata_json": {"policy": policy},
            },
        )
    payout = None
    if compensation_amount > 0:
        payout = create_or_update_payout(
            booking=booking,
            gross_amount=compensation_amount,
            trigger_reason=Payout.TriggerReason.LATE_CANCELLATION_COMPENSATION,
            metadata={"policy": policy},
        )

    settlement_ready = mark_held_payments_for_policy(booking)
    if settlement_ready and refund and settings.PAYSTACK_REFUNDS_ENABLED:
        from apps.payments.tasks import execute_refund_task

        transaction.on_commit(lambda: execute_refund_task.delay(str(refund.id)))
    if settlement_ready and payout and settings.PAYSTACK_TRANSFERS_ENABLED:
        from apps.payments.tasks import execute_payout_task

        transaction.on_commit(lambda: execute_payout_task.delay(str(payout.id)))
    return booking


@transaction.atomic
def report_no_show(*, booking: Booking, reported_by, no_show_party, reason=""):
    if no_show_party == Booking.NoShowParty.CLIENT:
        policy = Booking.CancellationPolicy.CLIENT_NO_SHOW
    else:
        policy = Booking.CancellationPolicy.TALENT_NO_SHOW

    refund_amount, compensation_amount = compensation_for_policy(booking=booking, policy=policy)
    booking.no_show_reported_by = reported_by
    booking.no_show_party = no_show_party
    booking.no_show_reported_at = timezone.now()
    booking.cancellation_policy = policy
    booking.cancellation_reason = reason
    booking.refund_due_amount = refund_amount
    booking.talent_compensation_amount = compensation_amount
    booking.transition_status(
        to_status=Booking.Status.DISPUTED,
        changed_by=reported_by,
        reason=reason or f"{no_show_party} no-show reported.",
        save=False,
    )
    booking.save()
    successful_collection_payments(booking).update(fund_state=Payment.FundState.DISPUTED)
    return booking


@transaction.atomic
def settle_disputed_booking(*, booking: Booking, approved: bool):
    """Apply an admin's final dispute decision without releasing funds early."""
    if not approved:
        successful_collection_payments(booking).filter(
            fund_state=Payment.FundState.DISPUTED,
        ).update(fund_state=Payment.FundState.HELD)
        return booking

    refund = None
    if booking.refund_due_amount > 0:
        refund_reason = {
            Booking.CancellationPolicy.TALENT_NO_SHOW: Refund.Reason.TALENT_NO_SHOW,
            Booking.CancellationPolicy.CLIENT_NO_SHOW: Refund.Reason.ADMIN_DECISION,
        }.get(booking.cancellation_policy, Refund.Reason.ADMIN_DECISION)
        refund, _ = Refund.objects.update_or_create(
            booking=booking,
            reason=refund_reason,
            defaults={
                "recipient": booking.client,
                "amount": booking.refund_due_amount,
                "currency_code": booking.currency_code,
                "status": Refund.Status.PENDING,
                "metadata_json": {"policy": booking.cancellation_policy, "source": "dispute_resolution"},
            },
        )

    payout = None
    if booking.talent_compensation_amount > 0:
        payout = create_or_update_payout(
            booking=booking,
            gross_amount=booking.talent_compensation_amount,
            trigger_reason=Payout.TriggerReason.CLIENT_NO_SHOW_COMPENSATION,
            metadata={"policy": booking.cancellation_policy, "source": "dispute_resolution"},
        )

    settlement_ready = mark_held_payments_for_policy(booking)
    if settlement_ready and refund and settings.PAYSTACK_REFUNDS_ENABLED:
        from apps.payments.tasks import execute_refund_task

        transaction.on_commit(lambda: execute_refund_task.delay(str(refund.id)))
    if settlement_ready and payout and settings.PAYSTACK_TRANSFERS_ENABLED:
        from apps.payments.tasks import execute_payout_task

        transaction.on_commit(lambda: execute_payout_task.delay(str(payout.id)))
    return booking


@transaction.atomic
def release_completion_payout(*, booking: Booking):
    totals = payment_totals(booking)
    if not totals["is_fully_funded"]:
        return None

    payout = create_or_update_payout(
        booking=booking,
        gross_amount=min(totals["total_paid"], money(booking.quoted_amount)),
        trigger_reason=Payout.TriggerReason.COMPLETION_RELEASE,
        metadata={"policy": "completion_after_organizer_confirmation"},
    )
    successful_collection_payments(booking).filter(
        fund_state__in=[Payment.FundState.HELD, Payment.FundState.DISPUTED]
    ).update(fund_state=Payment.FundState.RELEASE_PENDING)
    if settings.PAYSTACK_TRANSFERS_ENABLED:
        from apps.payments.tasks import execute_payout_task

        transaction.on_commit(lambda: execute_payout_task.delay(str(payout.id)))
    return payout


def create_or_update_payout(*, booking: Booking, gross_amount, trigger_reason, metadata=None):
    gross = money(gross_amount)
    commission_amount = projected_commission(gross)
    payout, created = Payout.objects.get_or_create(
        booking=booking,
        trigger_reason=trigger_reason,
        defaults={
            "payee": booking.talent,
            "gross_amount": gross,
            "commission_amount": commission_amount,
            "net_amount": money(gross - commission_amount),
            "status": Payout.Status.PENDING,
            "payout_method": Payout.PayoutMethod.MOBILE_MONEY,
            "metadata_json": metadata or {},
        },
    )
    if not created and payout.status not in {Payout.Status.PAID, Payout.Status.PROCESSING}:
        payout.gross_amount = gross
        payout.commission_amount = commission_amount
        payout.net_amount = money(gross - commission_amount)
        payout.status = Payout.Status.PENDING
        payout.metadata_json = {**(payout.metadata_json or {}), **(metadata or {})}
        payout.save(update_fields=["gross_amount", "commission_amount", "net_amount", "status", "metadata_json", "updated_at"])
    return payout


def mark_held_payments_for_policy(booking: Booking):
    payments = list(
        successful_collection_payments(booking)
        .filter(fund_state__in=[Payment.FundState.HELD, Payment.FundState.DISPUTED])
        .order_by("paid_at", "created_at")
    )
    refund_amount = money(booking.refund_due_amount)
    compensation_amount = money(booking.talent_compensation_amount)

    if refund_amount > 0 and compensation_amount > 0:
        balance_payments = [payment for payment in payments if payment.payment_type == Payment.PaymentType.BALANCE]
        deposit_payments = [payment for payment in payments if payment.payment_type == Payment.PaymentType.DEPOSIT]
        balance_total = sum((money(payment.amount) for payment in balance_payments), Decimal("0.00"))
        deposit_total = sum((money(payment.amount) for payment in deposit_payments), Decimal("0.00"))
        if balance_total != refund_amount or deposit_total != compensation_amount:
            booking.payment_policy_json = {
                **(booking.payment_policy_json or {}),
                "settlement_requires_manual_allocation": True,
            }
            booking.save(update_fields=["payment_policy_json", "updated_at"])
            return False
        for payment in balance_payments:
            payment.fund_state = Payment.FundState.REFUND_PENDING
            payment.save(update_fields=["fund_state", "updated_at"])
        for payment in deposit_payments:
            payment.fund_state = Payment.FundState.RELEASE_PENDING
            payment.save(update_fields=["fund_state", "updated_at"])
        return True

    if refund_amount > 0:
        successful_collection_payments(booking).filter(
            fund_state__in=[Payment.FundState.HELD, Payment.FundState.DISPUTED]
        ).update(fund_state=Payment.FundState.REFUND_PENDING)
    if compensation_amount > 0:
        successful_collection_payments(booking).filter(
            fund_state__in=[Payment.FundState.HELD, Payment.FundState.DISPUTED]
        ).update(fund_state=Payment.FundState.RELEASE_PENDING)
    return True


def funds_state_for_booking(booking: Booking):
    totals = payment_totals(booking)

    if booking.status == Booking.Status.DISPUTED:
        return "disputed"
    if booking.refund_due_amount > 0:
        return "refund_pending"
    if booking.talent_compensation_amount > 0:
        return "compensation_pending"
    if booking.payouts.filter(status=Payout.Status.PAID).exists():
        return "payout_paid"
    if booking.payouts.filter(status__in=[Payout.Status.PENDING, Payout.Status.PROCESSING]).exists():
        return "payout_pending"
    if booking.status == Booking.Status.COMPLETED and totals["is_fully_funded"]:
        return "payout_ready"
    if totals["is_fully_funded"]:
        return "fully_held"
    if totals["deposit_is_paid"]:
        return "deposit_held"
    return "awaiting_payment"


def next_step_for_booking(booking: Booking, *, user):
    totals = payment_totals(booking)
    if booking.payment_policy_json.get("settlement_requires_manual_allocation"):
        return "Support must allocate the refund and compensation before funds can move."
    if booking.status == Booking.Status.AWAITING_DEPOSIT:
        return "Organizer should pay the deposit. Funds will be held by the platform."
    if booking.status == Booking.Status.CONFIRMED and not totals["is_fully_funded"]:
        return "Organizer should pay the remaining balance before the programme starts."
    if booking.status == Booking.Status.CONFIRMED and totals["is_fully_funded"]:
        return "Funds are fully held. After the talent performs, organizer should confirm completion."
    if booking.status == Booking.Status.COMPLETED:
        return "Completion has been confirmed. Talent payout is pending provider transfer."
    if booking.status == Booking.Status.DISPUTED:
        return "Funds are frozen while support reviews the no-show or dispute report."
    if booking.status == Booking.Status.CANCELLED:
        return "Booking is cancelled. Refund or compensation outcome is shown in the payment summary."
    return "Continue the booking workflow."


def build_payment_summary_payload(booking: Booking, *, user):
    totals = payment_totals(booking)
    quoted_amount = money(booking.quoted_amount)
    projected_commission_amount = projected_commission(quoted_amount) if quoted_amount else Decimal("0.00")
    projected_payout_amount = projected_net_payout(quoted_amount) if quoted_amount else Decimal("0.00")
    payouts = booking.payouts.order_by("-created_at")
    refunds = booking.refunds.order_by("-created_at")

    return {
        "booking_id": booking.id,
        "booking_status": booking.status,
        "quoted_amount": booking.quoted_amount,
        "deposit_amount": booking.deposit_amount,
        "balance_amount": booking.balance_amount,
        "currency_code": booking.currency_code,
        "deposit_paid": totals["deposit_paid"],
        "balance_paid": totals["balance_paid"],
        "total_paid": totals["total_paid"],
        "held_amount": totals["held_amount"],
        "outstanding_amount": totals["outstanding_amount"],
        "refund_due_amount": money(booking.refund_due_amount),
        "talent_compensation_amount": money(booking.talent_compensation_amount),
        "commission_amount": sum((payout.commission_amount for payout in payouts), Decimal("0.00")),
        "platform_commission_rate": str(commission_rate()),
        "projected_commission_amount": projected_commission_amount,
        "projected_payout_amount": projected_payout_amount,
        "payout_due_amount": sum(
            (payout.net_amount for payout in payouts.filter(status__in=[Payout.Status.PENDING, Payout.Status.PROCESSING])),
            Decimal("0.00"),
        ),
        "payout_released_amount": sum(
            (payout.net_amount for payout in payouts.filter(status=Payout.Status.PAID)),
            Decimal("0.00"),
        ),
        "funds_state": funds_state_for_booking(booking),
        "next_step": next_step_for_booking(booking, user=user),
        "settlement_requires_manual_allocation": bool(
            booking.payment_policy_json.get("settlement_requires_manual_allocation")
        ),
        "balance_due_at": booking.balance_due_at,
        "completion_confirmation_due_at": booking.completion_confirmation_due_at,
        "can_pay_deposit": user.id == booking.client_id and booking.status == Booking.Status.AWAITING_DEPOSIT,
        "can_pay_balance": user.id == booking.client_id and booking.status == Booking.Status.CONFIRMED and not totals["is_fully_funded"],
        "can_confirm_completion": user.id == booking.client_id and booking.status == Booking.Status.CONFIRMED and totals["is_fully_funded"],
        "can_report_no_show": booking.status in {Booking.Status.CONFIRMED, Booking.Status.IN_PROGRESS},
        "payments": successful_collection_payments(booking).order_by("-created_at"),
        "payouts": payouts,
        "refunds": refunds,
    }
