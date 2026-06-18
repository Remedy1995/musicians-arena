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
    }
    user_id, notification_type, title, body = config[action]
    dispatch_notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        body=body,
        payload={"booking_id": str(booking.id), "status": booking.status},
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
