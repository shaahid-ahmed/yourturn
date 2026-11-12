# Unspoken API contract

**Status:** `v0.2.0-draft` — US-001. **Not frozen, not implemented, not approved for money movement.** Written to the designer's spec ([`Unspoken Experience and Pages Spec.pdf`](../02-design/source/Unspoken%20Experience%20and%20Pages%20Spec.pdf)) under [ADR 0007](../decisions/0007-ux-spec-supersedes-payment-flow.md). Machine-readable source of truth: [openapi.json](openapi.json).
**Owner:** Architect (US-001 is Rohan's). Payments owns [PAYMENTS.md](PAYMENTS.md); LLM Engineer owns the prompts section of [AI.md](AI.md).
**Architect approval:** Rohan (Architect), November 12, 2026 — write US-001 under ADR 0007, mark Q-011 decisions 5, 6 and 14 as open with the strictest defaults, no ADR 0008 yet.

This contract replaces the YourTurn `v0.1.0-draft` circle/turn/Payouts contract (ADR 0004/0005), which ADR 0006 and ADR 0007 superseded. None of its 24 operations survive.

## Contract status and version

| Property             | Value                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Contract version     | `0.2.0-draft` (`info.version`)                                                                           |
| Status marker        | `info.x-contract-status: draft`, `info.x-frozen: false`, `info.x-adr: "0007"`                            |
| Operations           | 74 across 59 paths, in 10 tags                                                                           |
| Base path            | `/api/v1` on loopback only; the public HTTPS origin is US-014                                            |
| Media type           | `application/json; charset=utf-8`, except the pod event stream (`text/event-stream`)                     |
| Breaking-change rule | Any route, schema, money-semantics or visibility change needs an ADR and Architect approval              |
| Open decisions       | `info.x-open-decisions` lists Q-011 decisions 1, 2, 4, 5, 6, 14 and 16, each with the default it assumes |

While the status is `draft`, builders may work against these routes, but a route marked `x-open-decision` can change when that decision lands. The one money-moving route stays gated closed regardless.

## What the contract covers, by spec page

| Tag             | Pages        | Operations                                                                                                                                                                               |
| --------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session`       | P2           | `requestPhoneCode`, `createSession`, `endSession`                                                                                                                                        |
| `profile`       | P4, P19, P20 | `getCurrentUser`, `updateOwnProfile`, `deleteOwnAccount`, `getOwnPrivateLimits`, `setOwnPrivateLimits`, `setOwnPermissionStatus`, `listInterests`                                        |
| `pods`          | P5, P6, P8   | `matchContacts`, `listOwnPods`, `createPod`, `getPod`, invitations, single-use invite links, members, mute, rhythm proposals, group activities                                           |
| `chat`          | P7, P22      | `listPodMessages`, `sendPodMessage`, `streamPodEvents`, `listOwnPlannerChat`, `sendOwnPlannerChatMessage`, `getOwnStretchAsk`, `answerOwnStretchAsk`                                     |
| `planning`      | P9–P12, P23  | `listHangouts`, `startHangout`, `getHangout`, `getPoll`, `castOwnVote`, `setOwnReadyAnswer`, `acceptPlannerOffer`, `confirmBooking`, `rateOwnHangout`                                    |
| `money`         | P13–P15, P21 | `volunteerAsPayer`, `getSplit`, `confirmSplit`, `setActualTotal`, `listOwnBalances`, `getOwnBalance`, `createSettlementPayment`, PayPal link read/start/unlink, `receiveProviderWebhook` |
| `calendar`      | P17, P18     | calendar accounts list/connect/disconnect, per-calendar planner access, `getOwnCalendar`, `addEventToOwnCalendar`                                                                        |
| `subscription`  | P3, P20      | `getOwnSubscription`, `submitSubscriptionReceipt`, `restoreSubscription`                                                                                                                 |
| `events`        | P16, P17     | `searchEvents`, `getEvent`, saved events, `suggestEventToPod`                                                                                                                            |
| `notifications` | P20          | `getOwnNotificationSettings`, `setOwnNotificationSettings`, `registerPushToken`                                                                                                          |

P1 (splash) needs only `getCurrentUser` and `listOwnPods`. Calendar writes after booking and reminder jobs are server-side and have no client route.

## The hangout lifecycle

`HangoutState` is exactly the ADR 0007 list: `PLANNING, STRETCH_ASKS, ACTIVITY_VOTE, TIME_VOTE, READY_CHECK, AWAITING_CONFIRMATION, BOOKING, BOOKED, BALANCES_OPEN, SETTLED, NO_PLAN, BOOKING_FAILED`. There is no hold, capture or void state. The transition table belongs to US-002; the contract fixes the client-visible order:

1. `startHangout` (or the rhythm date) → `PLANNING`. Stretch asks go privately to single members (`STRETCH_ASKS`).
2. Activity poll, then time poll (`castOwnVote`). Spec decision 8 recommends two polls; adopted for the draft.
3. Ready check (`setOwnReadyAnswer`). Any number of yeses is enough; yes requires a linked PayPal account.
4. A yes-member volunteers as payer (`volunteerAsPayer`), then the payer confirms the booking (`confirmBooking`) → `BOOKING` → `BOOKED` or `BOOKING_FAILED`.
5. The payer confirms the split (`confirmSplit`) → `BALANCES_OPEN`; later `setActualTotal` appends adjustments.
6. Members settle (`createSettlementPayment`, gate closed) → `SETTLED` when every balance is paid.

`NO_PLAN` and `BOOKING_FAILED` lead to a planner offer card; `acceptPlannerOffer` widens the window or area, or tries the next-best plan.

## Authentication and authorization

**Session.** `requestPhoneCode` then `createSession` sign in by phone. In the demo no text message is sent (`delivery: "simulated_demo"`) and only seeded synthetic numbers can sign in. The server sets an `HttpOnly`, `SameSite=Strict` cookie (`Secure` over TLS) and returns a CSRF token.

**CSRF.** Every mutating request sends `X-CSRF-Token`. Missing or wrong → `403 csrf_rejected`, nothing changes.

**Tenant isolation.** Every `/pods/{podId}` route is authorized from the session's own membership rows, never from a client claim. A non-member gets `404 not_found`, identical to a missing pod, so existence, size and names are not disclosed. Every `/me/...` route acts only on the caller's own records; there is no admin override.

**Authorization matrix.**

| Operation                                                                                                                  | Permitted caller                                                      | Denied caller                   |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------- |
| `requestPhoneCode`, `createSession`                                                                                        | Anyone (no session)                                                   | —                               |
| `receiveProviderWebhook`                                                                                                   | Unauthenticated by design; gated by signature verification            | `401 webhook_signature_invalid` |
| All `/me/...` routes, `listOwnPods`, `matchContacts`, `listInterests`, events                                              | Any session, on the caller's own records only                         | `401`                           |
| `getPod`, chat, stream, hangouts, polls, `castOwnVote`, `setOwnReadyAnswer`, rhythm, group activities, `suggestEventToPod` | Joined member of that pod                                             | `404`                           |
| `inviteMembers`, `removeMember`                                                                                            | The pod's creator                                                     | `403 not_creator`               |
| `volunteerAsPayer`                                                                                                         | A yes-member with a linked PayPal account                             | `403 not_yes_member` / `409`    |
| `confirmBooking`                                                                                                           | **The payer only** — strict default for Q-011.6                       | `403 not_payer`                 |
| `confirmSplit`, `setActualTotal`                                                                                           | The payer only                                                        | `403 not_payer`                 |
| `getSplit`                                                                                                                 | The payer (all shares) or a yes-member (total, payer, own share only) | `404` for anyone else           |
| `listOwnBalances`, `getOwnBalance`                                                                                         | **A party to the balance only** — strict default for Q-011.14         | `404`                           |
| `createSettlementPayment`                                                                                                  | The member who owes                                                   | `403 not_debtor`; `409` gate    |

## Open decisions in the contract

Each open Q-011 decision is an `x-open-decision` object (`question`, `decision`, `topic`, `contractDefault`, `specRecommendation`, `status: "open"`) on the operations and schemas it affects, and all of them are listed in `info.x-open-decisions`.

| Q-011 | Decision                     | Default this draft assumes                                                                           | Where                                             |
| ----- | ---------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 5     | How the payer is chosen      | A yes-member with linked PayPal volunteers; the first volunteer wins; no rotation is modelled        | `volunteerAsPayer`                                |
| 6     | Who confirms a booking       | **Only the payer** (strictest)                                                                       | `confirmBooking`                                  |
| 14    | Who sees which balances      | **Only balances you are a party to**; the payer sees every balance owed to them; no pod-ledger route | `getSplit`, `Split`, `listOwnBalances`, `Balance` |
| 4     | How the payer pays the venue | The app only tracks IOUs; no venue payment route exists                                              | `confirmSplit`                                    |
| 1, 2  | Who pays the $15; free trial | Each user holds their own plan; no trial state                                                       | `SubscriptionState`, subscription routes          |
| 16    | Fixed interest list          | Server-supplied and versioned; contents not fixed                                                    | `listInterests`, `InterestList`                   |

**Known tension with the spec (Q-011.14).** Spec page P13 shows "each yes-member's share" on the split card. The strict default shows a non-payer only their own share. With an equal split the shares are near-identical, so little is hidden, but if decision 14 lands on the spec recommendation unchanged, `Split.shares` widens for all yes-members — a visibility change that needs Architect approval.

Spec decisions outside Q-011 that the draft adopts from the spec's own recommendation are marked `x-spec-recommendation` (decisions 3, 7, 8, 10, 11, 12, 13, 18, 20). They are not final decisions.

## Invariants the schema enforces

1. **Money.** Every `*Cents` field is an integer (`AmountCents` ≥ 0; `SignedAmountCents` only for adjustments); `Currency` is `const: "USD"`. Private budgets are `BudgetCents`, a multiple of 100, because screens show whole dollars. The only `number` fields are the NYC map coordinates.
2. **No stored balance.** `Balance` and `BalanceSummary` are derived from the append-only ledger on every read. `setActualTotal` appends adjustments; nothing is overwritten.
3. **One gated money route.** `createSettlementPayment` is the only operation with `x-payment-gate`. It returns `409 payment_gate_blocked` with `gate.open: false`, `humanApprovalRecorded: false`, blocking task `US-006` and questions `Q-010`, `Q-012`. `completed` comes only from a verified webhook, never a return URL; a failed payment returns the balance to `owed`.
4. **Private stays private.** `PrivateLimits`, `StretchAsk`, `PlannerChatMessage`, ratings and calendar data are reachable only from `/me/...` responses. No pod-scoped response schema references them. Every such schema carries `x-visibility`.
5. **No explanations on cards.** `ShortlistOption`, `Poll`, `Hangout` and `CardRef` have no reason, fit, feasibility or label field. No card says "budget-friendly" or "why this one", and the pod never learns why an option is missing or whose limit blocked a plan.
6. **Votes with names (Q-013).** `PollVote` and `ReadyAnswer` require `userId` and `firstName` (`x-visibility: pod-with-names`). Tie-break: lower per-person estimate, then earlier start.
7. **People by first name only.** `UserRef`, `PodMember`, votes, splits and balances never carry a phone number. `PhoneE164` appears only in the caller's own profile and in their own contact-match request and result.
8. **Pod size.** `Pod.minMembers` is 3 and `maxMembers` 8; members, pending invitations and active invite links together never exceed 8. Planning needs 3 joined members (`409 pod_too_small`).
9. **Simulated booking.** `Booking.simulated` is `const: true` with a fixed `simulatedLabel`. Catalog events and shortlist options are `synthetic: const true`.
10. **Notifications.** `NotificationSettings` has exactly `polls`, `reminders`, `privateAsks`, `money`. `info.x-notification-send-gate.open` is `false`: no notification is sent until Content Designer and Behavioral Scientist approve the copy. Private reminders never go into pod chat.

## Errors and idempotency

Every non-2xx response is `Error`: a stable `code` from a closed enum, a `message`, optional field `details`, optional `pendingDecision` (for example `Q-010` or `Q-011.6`) and an optional structured `constraint`. Error bodies never include another member's private limits, calendar or balance.

| Status | Codes                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `validation_failed`                                                                                                                                                                                                                                                                                                                                                    |
| 401    | `unauthenticated`, `webhook_signature_invalid`                                                                                                                                                                                                                                                                                                                         |
| 403    | `csrf_rejected`, `not_creator`, `not_payer`, `not_debtor`, `not_yes_member`                                                                                                                                                                                                                                                                                            |
| 404    | `not_found` — missing **or** not a member                                                                                                                                                                                                                                                                                                                              |
| 409    | `pod_full`, `pod_too_small`, `already_member`, `invitation_resolved`, `invite_link_used`, `invite_link_expired`, `wrong_hangout_state`, `poll_closed`, `option_unknown`, `payer_already_chosen`, `paypal_link_required`, `subscription_required`, `calendar_not_connected`, `stretch_ask_resolved`, `split_already_confirmed`, `open_balances`, `payment_gate_blocked` |
| 422    | `phone_code_invalid`, `phone_code_expired`, `receipt_invalid`, `idempotency_key_conflict`                                                                                                                                                                                                                                                                              |
| 429    | `rate_limited` — declared on every operation                                                                                                                                                                                                                                                                                                                           |
| 500    | `internal_error` — declared on every operation; no partial effect persists                                                                                                                                                                                                                                                                                             |

**Idempotency.** `Idempotency-Key` is **required** on `confirmSplit`, `setActualTotal` and `createSettlementPayment`, and optional on `createPod`, `startHangout`, `confirmBooking` and the subscription receipt routes. The server binds `(actor, operation, key)` to the path parameters and a request-body fingerprint and replays the first response only when all match; otherwise `422 idempotency_key_conflict`. Chat sends deduplicate on `clientMessageId`.

**Webhook safety.** `receiveProviderWebhook` verifies the signature before any ledger entry, status change or notification, deduplicates by provider event id and is safe to run twice; a duplicate returns `202` with `duplicate: true, effectsApplied: false`.

## Contract tests

`tests/contract.test.mjs` (run by `npm test`) replaces the retired suite. It checks, against the committed document with no network:

- OpenAPI 3.1, `0.2.0-draft`, unfrozen, `x-task: US-001`, `x-adr: 0007`, loopback server; every `$ref` resolves; every operation has a unique id, one tag, a summary and `429`/`500`; the operation count is 74;
- every mutating operation inherits the session and sends a CSRF token, except the three explicitly unauthenticated ones;
- no retired state, route, operation or schema (hold/capture/void, pot, circle, turn, Payouts, contribution, graph) remains;
- `HangoutState` is exactly the ADR 0007 list;
- money is integer cents in USD, budgets are whole dollars, the plan is 1500 cents, and `number` appears only in map coordinates;
- Q-011 decisions 5, 6 and 14 carry `x-open-decision` with the strict defaults, `confirmBooking`/`confirmSplit`/`setActualTotal` refuse with `not_payer`, and no pod-wide ledger route exists;
- private schemas are unreachable from any non-`/me` response, and no schema about another person carries a phone number;
- no card or hangout schema has a reason/fit/feasibility/label field;
- votes and ready-check answers carry names; pods are 3–8 with single-use links; every pod route can answer `404`;
- bookings are simulated and labelled; balances use `owed/pending/paid/failed`; settlement is the only gated money route and needs an idempotency key; the webhook is verified before effects;
- notifications have exactly four switches and a closed send gate; the subscription is a sandbox app-store plan separate from hangout money.

**Known gaps.** Validation against the OpenAPI 3.1 metaschema has **not** been run (no validator is installed and none was added). No route is implemented, so these tests are not evidence of behavior. Shared types are not yet generated into `packages/shared`.
