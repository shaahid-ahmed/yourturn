# ADR 0007 — The UX spec supersedes the per-member-payment flow

- **Status:** accepted as the UX source of truth; backend changes blocked on human decisions.
- **Date:** November 12, 2026
- **Supersedes:** the money and progress rules in ADR 0006.
- **Authoritative input:** `docs/02-design/source/Unspoken Experience and Pages Spec.pdf` (18 pages, sha256 `08446650f86134c8cde207e4eb07a37bff74e010ca73cd5093e74048d697e978`), signed off by the designer and supplied by the human.

## What changed

The designer's spec is authoritative for every screen and flow. It explicitly **removes** three things ADR 0006 built:

| ADR 0006                                                      | UX spec                                                     | Consequence                                                       |
| ------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Hold every share, capture all together, void all on a decline | One member pays the venue; the others owe that member       | **No holds, captures or voids.** Build IOU balances instead.      |
| Group progress is a count only                                | Poll votes and ready-check yeses are **visible with names** | Drop the count-only response; votes are attributed.               |
| The venue is the payee on each order                          | The payer pays the venue, however the venue takes payment   | Drop the venue payee and the Payouts fallback from the demo path. |

Also locked by the spec: **$15 monthly app subscription** via phone app-store billing (separate from hangout money), pods built from the phone contact list, a built-in pod chat with the planner inside it, a private planner chat, NYC-only, 23 screens in five groups, and $15/3–8 pods.

## What the backend must build now

A new hangout state list: `PLANNING, STRETCH_ASKS, ACTIVITY_VOTE, TIME_VOTE, READY_CHECK, AWAITING_CONFIRMATION, BOOKING, BOOKED, BALANCES_OPEN, SETTLED, NO_PLAN, BOOKING_FAILED`.

Money is an **IOU ledger, not a capture pipeline**: after the payer confirms the split, each yes-member's share is a balance owed to the payer. Balances are derived from the append-only ledger and never stored. Settlement between two members still needs a PayPal product that can pay a **personal** sandbox account — that product is not chosen, and it is the go/no-go (Q-010).

## Human decisions required before backend work starts

These are the spec's own open decisions, and they block code:

| #   | Decision                                                                                     | Why it blocks                                              |
| --- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 4   | How the payer pays the venue: PayPal in-app, or at the venue with the app only tracking IOUs | Decides whether any venue payment exists at all            |
| 5   | How the payer is chosen                                                                      | Decides whether a volunteer or a rotation is modelled      |
| 6   | Who confirms a booking                                                                       | Decides the authorization on the confirmation route        |
| 14  | Who sees which balances                                                                      | Decides the authorization on every money response          |
| 1   | Who pays the $15, and #2 free trial                                                          | Decides the subscription model and its billing integration |
| 16  | The fixed interest list                                                                      | Needed before profile and coordinator work                 |

## What stays true

Integer cents, idempotent calls, verified webhooks, an append-only ledger, derived balances, and **no AI in the payment path** all carry over from ADR 0006 unchanged. Private budget checks still return only feasible/not-feasible. The payment gate stays closed.

## Consequence for the code already written

The per-member authorize/capture/void work (PR #7 and the WIP backend) is **retired**, not deleted: it is retained on its branch as a labelled experiment. It must not be merged into the demo path, because it implements a flow the product no longer has.
