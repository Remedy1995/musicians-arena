from decimal import Decimal
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from unittest.mock import patch

from apps.bookings.models import Booking
from apps.payments.models import Payment, Payout, PayoutRecipient, Refund
from apps.payments.services import (
    apply_cancellation_policy,
    create_successful_held_payment,
    payment_totals,
    refresh_booking_after_payment,
    release_completion_payout,
    initialize_paystack_payment,
    execute_paystack_payout,
    execute_paystack_refund,
    process_paystack_transfer_webhook,
    process_paystack_refund_webhook,
    verify_paystack_payment,
)


class BookingPaymentPolicyTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.client_user = user_model.objects.create_user(
            username="client",
            email="client@example.com",
            phone="233200000001",
            password="Password123",
            role="client",
        )
        self.talent_user = user_model.objects.create_user(
            username="talent",
            email="talent@example.com",
            phone="233200000002",
            password="Password123",
            role="talent",
        )

    def make_booking(self, *, event_days_from_now=10):
        return Booking.objects.create(
            client=self.client_user,
            talent=self.talent_user,
            status=Booking.Status.AWAITING_DEPOSIT,
            title="31st Night Service",
            description="Worship service",
            event_date=timezone.localdate() + timedelta(days=event_days_from_now),
            start_time=datetime.strptime("18:00", "%H:%M").time(),
            venue_address="Accra",
            city="Accra",
            region="Greater Accra",
            quoted_amount=Decimal("100.00"),
            deposit_amount=Decimal("40.00"),
            balance_amount=Decimal("60.00"),
            currency_code="GHS",
        )

    def test_deposit_is_held_and_confirms_booking_without_payout(self):
        booking = self.make_booking()

        payment = create_successful_held_payment(
            booking=booking,
            payer=self.client_user,
            payment_type=Payment.PaymentType.DEPOSIT,
            amount=Decimal("40.00"),
        )
        refresh_booking_after_payment(booking=booking, changed_by=self.client_user)

        booking.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CONFIRMED)
        self.assertEqual(payment.fund_state, Payment.FundState.HELD)
        self.assertFalse(booking.payouts.exists())
        self.assertEqual(payment_totals(booking)["held_amount"], Decimal("40.00"))

    def test_completion_creates_pending_payout_only_after_full_funding(self):
        booking = self.make_booking()
        create_successful_held_payment(
            booking=booking,
            payer=self.client_user,
            payment_type=Payment.PaymentType.DEPOSIT,
            amount=Decimal("40.00"),
        )
        refresh_booking_after_payment(booking=booking, changed_by=self.client_user)
        create_successful_held_payment(
            booking=booking,
            payer=self.client_user,
            payment_type=Payment.PaymentType.BALANCE,
            amount=Decimal("60.00"),
        )

        booking.transition_status(
            to_status=Booking.Status.COMPLETED,
            changed_by=self.client_user,
            reason="Organizer confirmed completion.",
        )
        payout = release_completion_payout(booking=booking)

        self.assertIsNotNone(payout)
        self.assertEqual(payout.status, Payout.Status.PENDING)
        self.assertEqual(payout.gross_amount, Decimal("100.00"))
        self.assertEqual(payout.commission_amount, Decimal("10.00"))
        self.assertEqual(payout.net_amount, Decimal("90.00"))
        self.assertFalse(booking.payments.filter(fund_state=Payment.FundState.RELEASED).exists())
        self.assertEqual(
            booking.payments.filter(fund_state=Payment.FundState.RELEASE_PENDING).count(),
            2,
        )

    def test_late_client_cancellation_compensates_talent_from_deposit(self):
        booking = self.make_booking(event_days_from_now=1)
        create_successful_held_payment(
            booking=booking,
            payer=self.client_user,
            payment_type=Payment.PaymentType.DEPOSIT,
            amount=Decimal("40.00"),
        )
        refresh_booking_after_payment(booking=booking, changed_by=self.client_user)
        booking.transition_status(
            to_status=Booking.Status.CANCELLED,
            changed_by=self.client_user,
            reason="Organizer cancelled late.",
        )

        apply_cancellation_policy(
            booking=booking,
            cancelled_by=self.client_user,
            reason="Organizer cancelled late.",
        )

        booking.refresh_from_db()
        payout = booking.payouts.get()
        self.assertEqual(booking.cancellation_policy, Booking.CancellationPolicy.CLIENT_LATE_CANCELLATION)
        self.assertEqual(booking.talent_compensation_amount, Decimal("40.00"))
        self.assertEqual(booking.refund_due_amount, Decimal("0.00"))
        self.assertEqual(payout.trigger_reason, Payout.TriggerReason.LATE_CANCELLATION_COMPENSATION)
        self.assertEqual(payout.net_amount, Decimal("36.00"))
        self.assertFalse(booking.refunds.exists())

    def test_early_client_cancellation_refunds_held_deposit(self):
        booking = self.make_booking(event_days_from_now=10)
        create_successful_held_payment(
            booking=booking,
            payer=self.client_user,
            payment_type=Payment.PaymentType.DEPOSIT,
            amount=Decimal("40.00"),
        )
        refresh_booking_after_payment(booking=booking, changed_by=self.client_user)
        booking.transition_status(
            to_status=Booking.Status.CANCELLED,
            changed_by=self.client_user,
            reason="Organizer cancelled early.",
        )

        apply_cancellation_policy(
            booking=booking,
            cancelled_by=self.client_user,
            reason="Organizer cancelled early.",
        )

        booking.refresh_from_db()
        refund = booking.refunds.get()
        self.assertEqual(booking.cancellation_policy, Booking.CancellationPolicy.CLIENT_FREE_CANCELLATION)
        self.assertEqual(booking.refund_due_amount, Decimal("40.00"))
        self.assertEqual(booking.talent_compensation_amount, Decimal("0.00"))
        self.assertEqual(refund.status, Refund.Status.PENDING)
        self.assertFalse(booking.payouts.exists())

    def test_late_client_cancellation_splits_balance_refund_and_deposit_compensation(self):
        booking = self.make_booking(event_days_from_now=1)
        deposit = create_successful_held_payment(
            booking=booking,
            payer=self.client_user,
            payment_type=Payment.PaymentType.DEPOSIT,
            amount=Decimal("40.00"),
        )
        refresh_booking_after_payment(booking=booking, changed_by=self.client_user)
        balance = create_successful_held_payment(
            booking=booking,
            payer=self.client_user,
            payment_type=Payment.PaymentType.BALANCE,
            amount=Decimal("60.00"),
        )

        booking.transition_status(
            to_status=Booking.Status.CANCELLED,
            changed_by=self.client_user,
            reason="Organizer cancelled late.",
        )
        apply_cancellation_policy(
            booking=booking,
            cancelled_by=self.client_user,
            reason="Organizer cancelled late.",
        )

        deposit.refresh_from_db()
        balance.refresh_from_db()
        self.assertEqual(deposit.fund_state, Payment.FundState.RELEASE_PENDING)
        self.assertEqual(balance.fund_state, Payment.FundState.REFUND_PENDING)
        self.assertFalse(booking.payment_policy_json.get("settlement_requires_manual_allocation"))

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_example", PAYSTACK_PAYMENT_CHANNELS=["card", "mobile_money"])
    @patch("apps.payments.services._paystack_request")
    def test_paystack_initialization_uses_exact_deposit_and_stores_checkout(self, paystack_request):
        booking = self.make_booking()
        paystack_request.return_value = {
            "authorization_url": "https://checkout.paystack.com/example",
            "access_code": "example-code",
            "reference": "paystack-reference",
        }

        payment, checkout = initialize_paystack_payment(
            booking=booking,
            payer=self.client_user,
            payment_type=Payment.PaymentType.DEPOSIT,
        )

        self.assertEqual(payment.amount, Decimal("40.00"))
        self.assertEqual(payment.status, Payment.Status.PROCESSING)
        self.assertEqual(payment.provider_reference, "paystack-reference")
        self.assertEqual(checkout["access_code"], "example-code")
        payload = paystack_request.call_args.args[2]
        self.assertEqual(payload["amount"], 4000)
        self.assertEqual(payload["currency"], "GHS")

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_example")
    @patch("apps.payments.services._paystack_request")
    def test_paystack_verification_holds_funds_and_confirms_booking(self, paystack_request):
        booking = self.make_booking()
        paystack_request.return_value = {
            "authorization_url": "https://checkout.paystack.com/example",
            "access_code": "example-code",
            "reference": "paystack-reference",
        }
        payment, _ = initialize_paystack_payment(
            booking=booking,
            payer=self.client_user,
            payment_type=Payment.PaymentType.DEPOSIT,
        )
        paystack_request.return_value = {
            "reference": payment.provider_reference,
            "amount": 4000,
            "currency": "GHS",
            "status": "success",
            "gateway_response": "Approved",
            "fees": 100,
        }

        verified = verify_paystack_payment(payment=payment)

        booking.refresh_from_db()
        verified.refresh_from_db()
        self.assertEqual(verified.status, Payment.Status.SUCCESSFUL)
        self.assertEqual(verified.fund_state, Payment.FundState.HELD)
        self.assertEqual(verified.provider_fee_amount, Decimal("1.00"))
        self.assertEqual(booking.status, Booking.Status.CONFIRMED)

    @override_settings(PAYSTACK_TRANSFERS_ENABLED=True)
    @patch("apps.payments.services._paystack_request")
    def test_payout_uses_stable_reference_and_releases_on_transfer_webhook(self, paystack_request):
        booking = self.make_booking()
        for payment_type, amount in [
            (Payment.PaymentType.DEPOSIT, Decimal("40.00")),
            (Payment.PaymentType.BALANCE, Decimal("60.00")),
        ]:
            create_successful_held_payment(
                booking=booking,
                payer=self.client_user,
                payment_type=payment_type,
                amount=amount,
                provider="paystack",
                provider_reference=f"payment-{payment_type}",
            )
        booking.transition_status(
            to_status=Booking.Status.COMPLETED,
            changed_by=self.client_user,
            reason="Organizer confirmed completion.",
        )
        payout = release_completion_payout(booking=booking)
        PayoutRecipient.objects.create(
            user=self.talent_user,
            recipient_type=PayoutRecipient.RecipientType.MOBILE_MONEY,
            display_name="Talent",
            masked_account="****0002",
            recipient_code="RCP_test",
        )
        paystack_request.return_value = {"status": "success", "transfer_code": "TRF_test"}

        execute_paystack_payout(payout_id=payout.id)

        payout.refresh_from_db()
        self.assertEqual(payout.status, Payout.Status.PROCESSING)
        self.assertEqual(payout.provider_reference, payout.idempotency_key)
        process_paystack_transfer_webhook(
            event="transfer.success",
            data={"reference": payout.provider_reference, "status": "success"},
        )

        payout.refresh_from_db()
        self.assertEqual(payout.status, Payout.Status.PAID)
        self.assertTrue(booking.payments.filter(fund_state=Payment.FundState.RELEASED).exists())

    @override_settings(PAYSTACK_REFUNDS_ENABLED=True)
    @patch("apps.payments.services._paystack_request")
    def test_refund_tracks_provider_processing_and_completion(self, paystack_request):
        booking = self.make_booking(event_days_from_now=10)
        payment = create_successful_held_payment(
            booking=booking,
            payer=self.client_user,
            payment_type=Payment.PaymentType.DEPOSIT,
            amount=Decimal("40.00"),
            provider="paystack",
            provider_reference="payment-refund",
        )
        refresh_booking_after_payment(booking=booking, changed_by=self.client_user)
        booking.transition_status(
            to_status=Booking.Status.CANCELLED,
            changed_by=self.client_user,
            reason="Organizer cancelled early.",
        )
        apply_cancellation_policy(booking=booking, cancelled_by=self.client_user, reason="Organizer cancelled early.")
        refund = booking.refunds.get()
        paystack_request.return_value = {"status": "pending", "id": "REF_test"}

        execute_paystack_refund(refund_id=refund.id)

        process_paystack_refund_webhook(
            event="refund.processed",
            data={"id": "REF_test", "transaction": {"id": "provider-transaction"}},
        )

        refund.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(refund.status, Refund.Status.PAID)
        self.assertEqual(payment.fund_state, Payment.FundState.REFUNDED)
