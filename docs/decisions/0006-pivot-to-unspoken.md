# 0006 — Pivot to Unspoken: per-member authorizations instead of a pooled fund

- **Status:** accepted (product direction). Supersedes the product definition in ADR 0004 and demotes ADR 0005 to a labelled fallback.
- **Date:** November 12, 2026
- **Deciders:** human (Shaahid) and Alan, who proposed Unspoken; Architect recorded it.
- **Supersedes:** `docs/00-context/PRODUCT.md` (YourTurn brief), the product scope in ADR 0004.
- **Affects:** ADR 0005 (Payouts becomes a fallback, not the primary path), the entire Phase 1 contract, the board.

## Context

YourTurn was a rotating friendship fund: members paid monthly into a pooled pot, a rotating host approved a plan, and the pot paid the venue. After one day of contract work, two blockers had hardened and neither was an implementation problem:

1. **The platform held pooled money.** Contributions accumulated in a collector account, which is custody of other people's funds. That raised money-transmission questions a hackathon cannot answer, and it is why Q-006 and YT-025 blocked the contract freeze.
2. **The product inferred things about real friendships.** A tie-strength graph with drift prediction is inference about relationships between people who did not state those facts about themselves. Q-002 was unanswerable in the time available, and the graph gate was closed as a result (XR-01).

A third fact made the first one worse: ADR 0005 established that PayPal Orders cannot spend funds a merchant already holds, so paying the venue from the pot required **Payouts** — a disbursement from our own balance, which is the most custody-heavy shape available.

Alan proposed Unspoken: every member authorizes their own share, the venue is the payee, and nothing is pooled.

## Decision

**Pivot to Unspoken.** Specifically:

1. **Money moves per member, not through a pot.** One PayPal order per member for their own share, `intent=AUTHORIZE`, with the venue named as `purchase_units[].payee`. The platform is never the payee on the preferred path and therefore never holds funds.
2. **All-or-nothing settlement.** Capture every authorization only once all are held. If anyone declines or the deadline passes, void every authorization. If a capture fails irrecoverably, refund the captures that succeeded and record `SETTLEMENT_FAILED`.
3. **No friendship inference of any kind.** No tie strength, no drift, no graph. Each personal agent reasons only over constraints its own member stated about themselves. The drift graph, the host copilot's reconnection framing, and the red-to-green demo beat are **removed from scope**, not gated.
4. **Hard constraints are plain code.** Budget, availability, dietary needs and travel time are evaluated deterministically. An LLM may influence ranking only, and can never turn a reject into an accept.
5. **Reveal only the winner.** Candidate rejections, per-member answers and reasons are never shown or stored. Group-visible progress is a count, never names.
6. **ADR 0005 is demoted, not deleted.** Payouts remains the documented fallback for paying the venue if third-party payee turns out to fail at authorize or capture time. If that fallback is ever used, the platform holds funds again and the custody question returns — so using it requires a new human decision, and the UI must label it.

## Evidence

The decisive question was whether a plain, non-partner sandbox REST app may name a different merchant as payee. If not, Unspoken's "platform never holds funds" claim collapses into the Payouts fallback and the pivot buys nothing.

Probed on November 12, 2026 against `api-m.sandbox.paypal.com` (script: `unspoken-payee-probe.py`):

| Probe                                                         | Result                                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Order, `intent=AUTHORIZE`, payee omitted (platform)           | accepted — `4NE47678949966820`, `PAYER_ACTION_REQUIRED`                                          |
| Order, `intent=AUTHORIZE`, **payee = venue business account** | **accepted** — `8SX33777K0904662Y`; readback confirms `payee.email_address` is the venue, not us |
| Second venue-payee order, for the void test                   | accepted — `5JK26843KL530842H`                                                                   |

**What this proves:** the call is not refused at creation, which is where a non-partner app is normally blocked, and PayPal records the third-party payee.

**What it does not prove:** that captured funds land in the venue's account. `PAYEE_ACCOUNT_RESTRICTED` and similar can surface at authorize or capture instead of at create. Per the money rules, only a readback of the venue's own transaction counts as settlement evidence, so this is recorded as **not blocked**, not as proven. Tracked as Q-008.

Authorize, capture, void and refund all require a payer approval in a browser — a human step this agent will not perform. The webhook leg still needs a public HTTPS listener.

## Consequences

**Dissolved.** Q-002 (real-user graph visibility) is **moot**: there is no graph. The custody half of Q-006 is moot on the preferred path: nothing is pooled.

**Still open, reshaped.** Cancellation, refund and dispute rights survive as a question, because voiding a hold and refunding a capture have different rights and timings — Q-006 is rewritten rather than closed. Q-005 (per-endpoint idempotency reality) is unchanged and now covers authorize, capture, void and refund.

**New risks this pivot creates:**

1. **N browser approvals per demo run.** Four members means four sandbox PayPal approvals, each a manual login. This is the largest demo risk, and it is a people problem rather than a code problem. PayPal Vault would remove it and is a stretch goal, not a plan.
2. **The authorization honor period caps the commit deadline.** The deadline must be set below PayPal's honor window, and the current limit must be read from the live documentation rather than assumed.
3. **Partial capture failure is a distributed-transaction problem.** All-or-nothing in both directions means a failed capture triggers refunds of successful ones, and that path needs tests before the gate opens.
4. **Privacy is architectural, not cryptographic.** The tally step sees per-member answers in memory. The guarantee is a service boundary plus a retention rule, and repeated rounds leak by inference. This must be stated plainly wherever the privacy claim appears; the fix (secure aggregation) is post-hackathon.
5. **Scope is larger than it looks.** The source description names eight services, vault encryption, a job queue, an outbox, two agent types and five eval suites. The demo subset is one service, SQLite, seeded members, hard rules in code, and an LLM only for constraint extraction and candidate text.

**What carries over unchanged:** the money rules in `agents/RULES.md`; the ledger discipline from ADR 0005 and the RV-001 fixes (integer cents, append-only ledger, derived and signed balances, provenance constraint, verified-only sums gating payment, fees as their own entries, `(provider_event_id, kind)` uniqueness, idempotency bound to target and body); the closed payment gate; the roles, board, handoff and review process; CI and the test harness.

**What is retired:** the drift graph and tie scoring, the host rotation and turn state machine, the pot and its derived-balance presentation, the subscription contribution path, the host copilot's reconnection framing, and the red-to-green demo. The YourTurn contract (`openapi.json`, `DATA_MODEL.md`, `API.md`) is **stale as of this ADR** and is rewritten under the UN task series; it stays in the tree until then so nothing is silently lost.

## Alternatives considered

- **Keep YourTurn and answer Q-002 and Q-006.** Rejected: both are policy questions needing privacy and legal judgement, neither can be resolved honestly in the remaining time, and the payment gate cannot open while they are open.
- **Keep the pot but pay the venue per member.** Rejected: contributions still accumulate in our account, so custody remains.
- **Take Unspoken's shares but keep the drift graph as a synthetic-only demo.** Rejected: it reintroduces the relationship-inference question for a visual beat the new product does not need, and the all-or-nothing payment is a stronger demo moment.
