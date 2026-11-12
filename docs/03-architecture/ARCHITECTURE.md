# Unspoken architecture

**Status:** draft for US-001/US-002; design plus a migrated schema. **No HTTP route, AI call, calendar call, app-store call or payment is implemented.** The contract is [openapi.json](openapi.json) `0.2.0-draft` ([API.md](API.md)); the schema is in [DATA_MODEL.md](DATA_MODEL.md). [ADR 0007](../decisions/0007-ux-spec-supersedes-payment-flow.md) records the product flow, and [ADR 0002](../decisions/0002-stack.md) records the stack.
**Owner:** Architect (Rohan for US-001/US-002).

This replaces the YourTurn circle/turn/Payouts architecture, which ADR 0006 and ADR 0007 superseded.

## System boundaries

```text
  phone app ──HTTPS/JSON + SSE──▶ services/api (/api/v1) ──▶ SQLite (node:sqlite)
  (apps/web,       session cookie          │   │   │   │
   phone-first)    + CSRF                  │   │   │   └──▶ planner (services/ai, in-process)
                                           │   │   └──────▶ Google Calendar (free/busy, event write)
                                           │   └──────────▶ app-store receipt check (sandbox)
                                           └──────────────▶ PayPal sandbox (gated closed)
                                                 ▲
                                    verified webhooks only
```

**Six boundaries that matter.**

1. **Phone ↔ API.** The only client surface. Membership, payer, yes-member and balance-party checks happen server-side on every request; the client is never trusted for any of them. Non-members of a pod get `404`.
2. **API ↔ planner.** The planner (`services/ai`) is an in-process library, not a reachable endpoint. It receives first names, interests, group activities and the catalog, plus a per-member private check that returns only works / doesn't work. It never receives emails, phone numbers or payment data, and it **never moves money**: its output is structured JSON validated against a schema, and only deterministic code after a member action changes state.
3. **API ↔ PayPal.** Outbound only, sandbox only, and **closed**: `createSettlementPayment` returns `payment_gate_blocked` until Q-010 / US-006 and human money-flow approval. Inbound webhooks are signature-verified before any ledger entry, status change or notification, and deduplicated by event id.
4. **API ↔ Google Calendar.** Free/busy reads only, from calendars the member opted into one at a time, plus one event write per yes-member after booking. Event content is never read, and no member ever sees another member's calendar.
5. **API ↔ app store.** Sandbox receipts only; the $15 plan gates the planner and is separate from hangout money.
6. **Private ↔ pod.** Private limits, stretch asks, the private planner chat and ratings belong to one member and their planner. They are stored where no pod-scoped query can reach them (no pod column) and are unreachable from any pod route in the contract.

## Components

| Path                                     | Role                                                                                         | State                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `apps/web`                               | Phone-first client for the 23 screens                                                        | Lane A (US-101–US-105); builds against `openapi.json`       |
| `services/api/src/db`                    | Schema migrations and database opening (`node:sqlite`)                                       | **US-002: migrated and tested on a scratch file**           |
| `services/api/src/hangout-lifecycle.mjs` | The hangout transition table, matching the contract; durable apply in `db/hangout-store.mjs` | **US-002: tested for every state and event pair**           |
| `services/api/src/*.mjs`                 | ADR 0006 in-memory domain core (money, ledger, vault, tally, constraints)                    | Exists; retired flow; not wired to the new schema           |
| `services/api/src/payments`              | Provider port, gate, settlement (Payments-owned)                                             | Gate closed; member-to-member settlement is US-006          |
| `services/api` routes                    | HTTP API per the contract                                                                    | Not implemented (US-004, US-007, US-008, US-013 and others) |
| `services/ai`                            | Planner: constraint extraction, coordinator, private budget checks                           | Lane A (US-009, US-106)                                     |
| `packages/shared`                        | Types generated from `openapi.json`                                                          | Not generated yet                                           |
| `infra`                                  | Dev server, seed, tooling                                                                    | Scaffold                                                    |

## Auth and tenant isolation

- **Identity.** Phone number plus a code. In the demo no text message is sent and only seeded synthetic numbers can sign in. A real verification provider is a precondition for any reachable deployment (US-014) and for opening the payment gate.
- **Session.** `HttpOnly`, `SameSite=Strict` cookie, `Secure` over TLS, server-side `session` row with expiry; mutating requests need a matching `X-CSRF-Token`. Codes and CSRF tokens are stored as digests.
- **Per-request authorization.** Pod membership, the payer of a hangout, the yes-members and the parties to a balance are re-derived from the database inside the write transaction. Client-supplied ids are never trusted as claims.
- **Self-scoped routes.** Everything under `/me` acts only on the caller's own rows; there is no admin override.
- **Secrets.** Sandbox credentials, calendar OAuth tokens and the vault master key live in ignored local configuration and are referenced (`credential_ref`), never stored in the database, a prompt, a log or an error body.

## Data flows

**A. Sign in and set up (P1–P4).** Phone code → session. Profile and interests are plain rows; private limits are sealed into the vault. Calendar and PayPal are links only.

**B. Build a pod (P5–P6).** Contacts are matched by phone and unmatched numbers are discarded. Invitations and single-use links hold places, so joined members plus pending places never exceed 8. Planning needs 3 joined members.

**C. Plan (P7–P11).** The planner builds a shortlist from interests and group activities, then runs the private check per member. A member whose budget an option exceeds gets a stretch ask in their private chat only. The activity poll, then the time poll, run with named votes. The ready check collects yes/no; any number of yeses is enough.

**D. Book (P12).** A yes-member with a linked PayPal account volunteers as payer, and the payer confirms (Q-011.6 default). The booking is **simulated** for seeded venues and labelled as such; a failure offers the next-best plan.

**E. Split and settle (P13–P15).** The payer confirms the split; one `balance_created` ledger entry per owing yes-member is appended in one transaction. Balances are always derived. Settlement through PayPal is gated closed; when opened, only a verified webhook can mark a payment captured, and a failure returns the balance to owed.

## Failure modes

| Failure                            | Required behavior                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| No plan fits                       | `NO_PLAN`; the planner offers to widen the window or area and never says whose limit blocked a plan |
| Nobody votes by the close          | Extend once, then close                                                                             |
| Nobody says yes                    | The plan closes and the planner offers the next-best option                                         |
| Booking fails                      | `BOOKING_FAILED`; the planner offers the next-best plan                                             |
| A member says yes, then leaves     | Their ledger entries stay until settled                                                             |
| Payment fails                      | A verified `payment_failed` entry; the balance is owed again and the member is told privately       |
| Webhook signature invalid          | `401`, no row written anywhere                                                                      |
| Webhook delivered twice            | `(provider_event_id, kind)` uniqueness ⇒ at most one entry; `202 duplicate`                         |
| Retried money request              | Idempotency record replays the first response; a different body or target is `422`                  |
| Concurrent confirmations           | `hangout.version` checked inside the transaction; the loser gets `409`                              |
| Database write fails mid-operation | The transaction rolls back; no partial money, membership or consent effect persists                 |
| Subscription ends                  | Pods and history stay readable; the planner stops planning                                          |

## Deployment boundary

- **Now:** local only. `make dev` serves the setup page on loopback. The schema is exercised by tests on scratch files, not by a running service.
- **Planned:** one public HTTPS origin for the phone, return URLs and the webhook listener (US-014); deployment and recovery (US-017). Both need separate human approval.
- **Never in this project:** live PayPal credentials, live app-store billing, real user data, or a real venue booking.
- **CI** runs Prettier, the Redocly OpenAPI lint, strict typecheck, tests (including the scratch-file migration test) and a secret scan. Hosted CI success is evidence about the repository, not about a deployed environment.
