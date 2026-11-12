# Booking confirmation and reminders

**Task:** US-012 · **Owner:** Vid (backend, reassigned from Lane S) · **Code:** [`services/api/src/booking.mjs`](../../services/api/src/booking.mjs) · **Tests:** [`tests/booking.test.mjs`](../../tests/booking.test.mjs) · **Contract:** `volunteerAsPayer`, `confirmBooking`, the `Booking` schema and the `booking_confirmation` card in [openapi.json](openapi.json). Lifecycle: [DATA_MODEL.md](DATA_MODEL.md#hangout-lifecycle).

## Flow

```text
READY_CHECK ──(yeses)──▶ AWAITING_CONFIRMATION
   runBookingJobs: booking row (head count = yeses, estimate = per-person × head count) + booking card in pod chat
   volunteerAsPayer: a yes-member with linked PayPal; first wins (Q-011.5 default)
   reminders: private, one interval after the card, then once per interval, capped
        │ confirmBooking (payer only, Q-011.6; bound to the estimate on the card)
        ▼
     BOOKING ──runBookingJobs: simulated booking──┬──▶ BOOKED ─▶ calendars of yes-members blocked (US-011)
                                                   └──▶ BOOKING_FAILED ─▶ planner offer card: next_best
```

## Guarantees

| Spec rule (P12, p.13–15)                              | How it holds                                                                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The planner books nothing until it gets confirmation  | Only `confirmBooking` moves AWAITING_CONFIRMATION → BOOKING, and the booking job acts only on BOOKING                                                                  |
| Who confirms (open, Q-011.6)                          | The payer only, enforced by the lifecycle guard (`not_payer`); without a payer, `wrong_hangout_state`                                                                  |
| Confirmation means what was shown                     | `estimatedTotalCents` must equal the card's estimate, otherwise `409 wrong_hangout_state` and nothing changes                                                          |
| Simulated booking, labelled                           | The `VenueBooker` port's default books only seeded catalog events and contacts nobody. Every `Booking` has `simulated: true` and the contract's exact label (asserted) |
| Reminders until confirmed; private, never in pod chat | Planner-chat reminders plus a push pointer to one member. Pod chat is untouched (asserted). The `reminder_sent` log (migration 3) makes each round send at most once   |
| A failed booking offers the next-best plan            | BOOKING_FAILED posts a `planner_offer` card with `next_best` and no explanation. A booker that throws counts as a failure                                              |
| After booking, calendars are blocked                  | `blockBookedHangout` (US-011) runs for yes-members when a calendar provider is configured                                                                              |

## Proposals that need review

- **Reminder cadence:** the first reminder comes 24 hours after the card, then every 24 hours, at most 3 times (`REMINDER_INTERVAL_MS`, `MAX_REMINDERS`). The spec says "repeats until confirmed"; a cap avoids nagging. **Behavioral Scientist and Content Designer** must approve the cadence and copy. Until they do, the notification send gate (US-013) holds every push anyway.
- **Who is reminded before a payer exists:** each yes-member with linked PayPal, since any of them could volunteer.

## Not done

- **Real reservations and ticket outreach.** Not built, and not claimed. The parties-and-events path ("the planner may contact the organizer") is not modelled.
- **A payer dropping out after booking** (spec decision 19, Q-014) is open and not modelled.
- **HTTP routes** are US-019. Assembling the full `Hangout` response is the route's job; `getBooking` returns the `Booking` part.
