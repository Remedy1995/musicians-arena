# Manual Testing Checklist

## Accounts

- Register a `client` account
- Register a `talent` account
- Sign in with both accounts
- Confirm profile data loads correctly

## Discovery And Search

- Search talents by city
- Filter talents by category
- Filter talents by rating
- Confirm matching talents appear

## Talent Portfolio

- Open talent profile management
- Upload a profile photo as a talent
- Confirm the new avatar persists after refresh
- Upload an image portfolio item
- Add a hosted media URL
- Confirm portfolio items appear in the correct portfolio tab or filter
- Open a hosted link item and confirm it shows link-specific detail, not a fake image preview
- Delete a portfolio item

## Client Profile

- Upload a profile photo as a client
- Confirm the new avatar persists after refresh

## Gigs

- Create a gig as a client
- Confirm the gig appears in the organizer list
- Sign in as a matching talent
- Confirm the gig appears in the gig board
- Submit interest with a note and proposed amount

## Gig Review

- Return to the client account
- Open the gig details
- Shortlist a talent
- Confirm a conversation is created
- Convert the interest into a booking

## Bookings

- Sign in as the talent
- Accept the booking with quoted, deposit, and balance amounts
- Sign in as the client
- Confirm the booking detail shows payment summary
- Record deposit payment
- Confirm booking payment summary updates

## Messaging

- Open the linked conversation
- Send a message from the client
- Confirm the talent sees the message
- Reply from the talent
- Confirm the client sees the reply
- Confirm live updates work while Daphne is serving the ASGI app

## Notifications

- Confirm new booking or gig activity creates notifications
- Open the notification inbox
- Mark a notification as read
- Confirm unread count decreases

## Disputes

- Open a booking
- Raise a dispute with type and description
- Confirm the booking moves into `disputed`
- Confirm the dispute appears in the booking dispute list

## Current Notes

- Payment recording is still simulated for now
- Real payment-provider webhook confirmation is not yet connected
- Media storage is local by default, but storage backend switching is ready
- For realtime testing, use Daphne rather than Django `runserver`
