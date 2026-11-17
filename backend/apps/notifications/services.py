from apps.notifications.constants import NotificationType
from apps.notifications.tasks import create_notification_task


def dispatch_notification(*, user_id, notification_type, title, body, payload=None):
    create_notification_task.delay(
        user_id=str(user_id),
        type=notification_type,
        title=title,
        body=body,
        payload_json=payload or {},
    )


def notify_gig_interest_submitted(*, organizer, interest):
    dispatch_notification(
        user_id=organizer.id,
        notification_type=NotificationType.GIG_INTEREST_SUBMITTED,
        title="New gig interest",
        body=f"{interest.talent.profile.display_name} showed interest in your gig '{interest.gig.title}'.",
        payload={
            "gig_id": str(interest.gig_id),
            "interest_id": str(interest.id),
        },
    )


def notify_gig_interest_status_changed(*, interest):
    type_map = {
        interest.Status.SHORTLISTED: NotificationType.GIG_INTEREST_SHORTLISTED,
        interest.Status.INVITED: NotificationType.GIG_INTEREST_INVITED,
        interest.Status.DECLINED: NotificationType.GIG_INTEREST_DECLINED,
    }
    title_map = {
        interest.Status.SHORTLISTED: "You were shortlisted",
        interest.Status.INVITED: "You were invited",
        interest.Status.DECLINED: "Gig interest update",
    }
    body_map = {
        interest.Status.SHORTLISTED: f"You were shortlisted for gig '{interest.gig.title}'.",
        interest.Status.INVITED: f"You were invited to proceed for gig '{interest.gig.title}'.",
        interest.Status.DECLINED: f"Your interest in gig '{interest.gig.title}' was declined.",
    }
    if interest.status in type_map:
        dispatch_notification(
            user_id=interest.talent_id,
            notification_type=type_map[interest.status],
            title=title_map[interest.status],
            body=body_map[interest.status],
            payload={
                "gig_id": str(interest.gig_id),
                "interest_id": str(interest.id),
                "status": interest.status,
            },
        )


def notify_gig_invitation_sent(*, interest):
    dispatch_notification(
        user_id=interest.talent_id,
        notification_type=NotificationType.GIG_INTEREST_INVITED,
        title="New opportunity invitation",
        body=f"{interest.gig.organizer.profile.display_name} invited you to '{interest.gig.title}'.",
        payload={
            "gig_id": str(interest.gig_id),
            "interest_id": str(interest.id),
            "status": interest.status,
        },
    )


def notify_gig_invitation_response(*, interest):
    accepted = interest.status == interest.Status.INVITE_ACCEPTED
    dispatch_notification(
        user_id=interest.gig.organizer_id,
        notification_type=(
            NotificationType.GIG_INVITATION_ACCEPTED
            if accepted
            else NotificationType.GIG_INVITATION_DECLINED
        ),
        title="Invitation accepted" if accepted else "Invitation declined",
        body=(
            f"{interest.talent.profile.display_name} accepted your invitation to '{interest.gig.title}'."
            if accepted
            else f"{interest.talent.profile.display_name} declined your invitation to '{interest.gig.title}'."
        ),
        payload={
            "gig_id": str(interest.gig_id),
            "interest_id": str(interest.id),
            "status": interest.status,
        },
    )


def notify_gig_interest_converted_to_booking(*, interest, booking):
    dispatch_notification(
        user_id=interest.talent_id,
        notification_type=NotificationType.GIG_INTEREST_CONVERTED_TO_BOOKING,
        title="Gig converted to booking",
        body=f"Your gig interest for '{interest.gig.title}' has been converted into a booking request.",
        payload={
            "gig_id": str(interest.gig_id),
            "interest_id": str(interest.id),
            "booking_id": str(booking.id),
        },
    )


def notify_booking_created(*, booking):
    dispatch_notification(
        user_id=booking.talent_id,
        notification_type=NotificationType.BOOKING_CREATED,
        title="New booking request",
        body=f"You received a new booking request for '{booking.title}'.",
        payload={"booking_id": str(booking.id)},
    )


def notify_booking_action(*, booking, action):
    config = {
        "accept": (booking.client_id, NotificationType.BOOKING_ACCEPTED, "Booking accepted", f"Your booking '{booking.title}' was accepted."),
        "counter": (booking.client_id, NotificationType.BOOKING_COUNTERED, "Booking countered", f"Your booking '{booking.title}' received a counteroffer."),
        "reject": (booking.client_id, NotificationType.BOOKING_REJECTED, "Booking rejected", f"Your booking '{booking.title}' was rejected."),
        "cancel": (booking.talent_id, NotificationType.BOOKING_CANCELLED, "Booking cancelled", f"Booking '{booking.title}' was cancelled."),
        "confirm": (booking.talent_id, NotificationType.BOOKING_CONFIRMED, "Booking confirmed", f"Booking '{booking.title}' was confirmed."),
        "complete": (booking.talent_id, NotificationType.BOOKING_CONFIRMED, "Completion confirmed", f"Booking '{booking.title}' was marked completed. Payout is pending release."),
        "no_show": (booking.client_id if booking.no_show_party == "client" else booking.talent_id, NotificationType.BOOKING_CANCELLED, "No-show reported", f"A no-show report was opened for booking '{booking.title}'."),
    }
    user_id, notification_type, title, body = config[action]
    dispatch_notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        body=body,
        payload={"booking_id": str(booking.id), "status": booking.status},
    )


def notify_dispute_opened(*, dispute):
    booking = dispute.booking
    recipient_id = booking.talent_id if dispute.raised_by_id == booking.client_id else booking.client_id
    dispatch_notification(
        user_id=recipient_id,
        notification_type=NotificationType.DISPUTE_OPENED,
        title="Booking concern received",
        body=f"A concern was opened for '{booking.title}'. Support will review the booking before funds move.",
        payload={
            "booking_id": str(booking.id),
            "dispute_id": str(dispute.id),
            "dispute_type": dispute.dispute_type,
        },
    )


def notify_dispute_resolution(*, dispute):
    booking = dispute.booking
    resolved = dispute.status == dispute.Status.RESOLVED
    notification_type = NotificationType.DISPUTE_RESOLVED if resolved else NotificationType.DISPUTE_REJECTED
    title = "Booking concern resolved" if resolved else "Booking concern closed"
    body = (
        f"Support resolved the concern for '{booking.title}'. Check the booking payment summary for the outcome."
        if resolved
        else f"Support closed the concern for '{booking.title}' without releasing disputed funds."
    )
    for user_id in {booking.client_id, booking.talent_id}:
        dispatch_notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            body=body,
            payload={
                "booking_id": str(booking.id),
                "dispute_id": str(dispute.id),
                "status": dispute.status,
            },
        )


def notify_payout_event(*, payout, event):
    config = {
        "paid": (NotificationType.PAYOUT_PAID, "Payout sent", f"Your payout for '{payout.booking.title}' has been sent."),
        "failed": (NotificationType.PAYOUT_FAILED, "Payout needs attention", f"Your payout for '{payout.booking.title}' could not be sent yet."),
        "reversed": (NotificationType.PAYOUT_REVERSED, "Payout reversed", f"Your payout for '{payout.booking.title}' was reversed and is being held for review."),
    }
    notification_type, title, body = config[event]
    dispatch_notification(
        user_id=payout.payee_id,
        notification_type=notification_type,
        title=title,
        body=body,
        payload={
            "booking_id": str(payout.booking_id),
            "payout_id": str(payout.id),
            "status": payout.status,
        },
    )


def notify_refund_event(*, refund, event):
    if event == "paid":
        notification_type = NotificationType.REFUND_PAID
        title = "Refund processed"
        body = f"Your refund for '{refund.booking.title}' has been processed."
    else:
        notification_type = NotificationType.REFUND_FAILED
        title = "Refund needs attention"
        body = f"Your refund for '{refund.booking.title}' could not be processed yet. Support will review it."
    dispatch_notification(
        user_id=refund.recipient_id,
        notification_type=notification_type,
        title=title,
        body=body,
        payload={
            "booking_id": str(refund.booking_id),
            "refund_id": str(refund.id),
            "status": refund.status,
        },
    )


def notify_new_message(*, message):
    participant_ids = list(message.conversation.participants.exclude(user_id=message.sender_id).values_list("user_id", flat=True))
    for user_id in participant_ids:
        dispatch_notification(
            user_id=user_id,
            notification_type=NotificationType.NEW_MESSAGE,
            title="New message",
            body=f"You received a new message in a {message.conversation.conversation_type} conversation.",
            payload={
                "conversation_id": str(message.conversation_id),
                "message_id": str(message.id),
            },
        )
