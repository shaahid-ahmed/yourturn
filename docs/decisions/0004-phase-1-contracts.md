# ADR 0004: Phase 1 contract shape for YourTurn v0.1.0-draft

- Status: **proposed draft** for YT-009. Not frozen, not Architect-final, not human-approved.
- Date: 2026-11-11
- Owner: Architect
- Task: YT-009 (freeze is YT-014)
- Required approvers: Architect (freeze), Payments and Legal (money boundary), Privacy and Behavioral (graph/consent boundary), human (money flow, main merge)
- Approval evidence: none yet; this ADR records a proposal only
- Superseded in part by [ADR 0005](0005-venue-payment-via-payouts.md): the venue is paid with Payouts, not Orders/Checkout. Everything else here stands.
- Supersedes: none. ADR 0003 remains **reserved** for a decision about an actually observed sandbox venue-payment failure; no such failure has occurred, so no fallback is proposed here.

## Context

The human authorized Phase 1 documentation. Frontend, Backend, Payments, ML and LLM work later depends on one shared contract, but four facts are still unresolved: whether subscription proceeds can fund a separate venue Order (Q-001), what may ever be shown about real connection data (Q-002), how provider idempotency behaves per endpoint (Q-005), and what forfeit/cancellation/refund/pause mean (Q-006). A contract must therefore be specific enough to build against and explicit about what it refuses to do.

## Decision

Draft one versioned HTTP contract, `v0.1.0-draft`, expressed as prose in `API.md` and machine-readable OpenAPI 3.1 in `openapi.json`, with the relational schema in `DATA_MODEL.md` and the runtime shape in `ARCHITECTURE.md`. Specific choices:

1. **Single API surface.** One Fastify service exposes all routes under `/api/v1`. The AI modules are in-process libraries called by that service, not separately reachable endpoints, so authorization and consent checks cannot be bypassed by calling the model directly.
2. **Explicit money representation.** Every monetary field is an integer-cents field named `*Cents`, with `currency` fixed to `USD`. Contribution amounts accept 100–1500 cents inclusive as the drafted range, default 500. The 1500 ceiling comes from the product brief; the 100 floor is a **draft proposal** (PRD D-P01) pending owner decision.
3. **Derived pot.** No API response or table column stores a mutable pot balance. The pot is computed by summing `ledger_entry.amount_cents` for the circle at read time, and responses label it `potCentsDerived`.
4. **Payment execution gate.** All payment-executing routes exist in the contract but return `409 payment_gate_blocked` while the gate is closed. (Venue payment now uses Payouts per ADR 0005; the gate and route are unchanged.) The gate is a server-side configuration that only a human can open after YT-006 evidence and money-flow approval. There is no request parameter, header or client flag that opens it, and no simulated success response exists in the contract.
5. **Suggestion integrity.** A successful suggestion response contains exactly three distinct plans; the schema enforces `minItems: 3, maxItems: 3`. Failure is a distinct explicit response (`suggestionsUnavailable`), never a shorter array.
6. **Synthetic-only graph.** Numeric edge values are returned only by `/api/v1/demo/graph`, which reads a labelled fixture and whose responses carry `"synthetic": true` and a `fixtureRevision`. Real-member endpoints expose no numeric tie value, rank or drift flag to anyone. The synthetic boundary is enforced by the route's data source, not by a request flag.
7. **Idempotency.** Mutating requests accept an `Idempotency-Key` header; the server stores key → first response per actor and operation and replays it. This internal guarantee is independent of any provider's own header semantics, which remain unverified (Q-005).
8. **Contract-first generation.** `openapi.json` is the source of truth for shared types. `packages/shared` will contain types generated from it after freeze; hand-written duplicate types are not permitted.
9. **Draft status is machine-readable.** `openapi.json` carries `info.version: 0.1.0-draft` and `info.x-contract-status: draft`, so tests and reviewers can assert that nothing treats it as frozen.

## Alternatives

- **Separate AI microservice:** clearer ownership, but adds a second trust boundary and a second place to enforce consent; rejected for a three-day demo.
- **Decimal or float money:** rejected outright by RULES rule 6.
- **Omitting payment routes until unblocked:** would leave Frontend unable to build honest pending/blocked states; instead the routes exist and return an explicit blocked error.
- **Returning fewer than three plans on partial success:** rejected because it would let a degraded result look like success.
- **Client-selectable demo mode:** rejected because a client flag that switches data sources is exactly how real data leaks into a "synthetic" view.

## Consequences

- Frontend and QA can build and test against a stable draft, with blocked paths visible rather than hidden.
- Any change to routes, schema, money semantics or the graph boundary needs a new ADR and Architect approval; YT-014 freeze additionally needs the Q-001/Q-002/Q-006 decisions.
- Because the payment gate is closed, no end-to-end money path can be demonstrated yet; the demo must say so.
- `potCentsDerived` costs a sum per read; acceptable at demo scale and preferable to a corruptible balance column.

## Verification and rollback

- `openapi.json` must parse and validate as OpenAPI 3.1, and contract tests assert: draft status present, every monetary schema integer with the stated bounds, suggestion array fixed at three, demo graph marked synthetic, and payment routes documenting the blocked response.
- Rollback is a documentation revert: no runtime code depends on this draft yet.
