from celery import shared_task

from apps.payments.services import execute_paystack_payout, execute_paystack_refund


@shared_task(bind=True, max_retries=5)
def execute_payout_task(self, payout_id):
    try:
        payout = execute_paystack_payout(payout_id=payout_id)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=min(300, 30 * (self.request.retries + 1)))
    return str(payout.id)


@shared_task(bind=True, max_retries=5)
def execute_refund_task(self, refund_id):
    try:
        refund = execute_paystack_refund(refund_id=refund_id)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=min(300, 30 * (self.request.retries + 1)))
    return str(refund.id)
