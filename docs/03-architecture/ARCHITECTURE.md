# YourTurn architecture

**Status:** `v0.1.0-draft` for YT-009; design only. **No product service, database, AI module or payment integration is implemented.** The only running code is the Phase 0 setup server. Freeze is YT-014; ADR [0004](../decisions/0004-phase-1-contracts.md) records the contract decision, ADR [0002](../decisions/0002-stack.md) the stack.
**Owner:** Architect.

## System boundaries

```text
            ┌───────────────────────────── loopback only ─────────────────────────────┐
            │                                                                         │
  browser ──┤  apps/web (Next.js)  ──HTTP/JSON──▶  services/api (Fastify, /api/v1)    │
            │      session cookie + CSRF              │        │           │          │
            │                                         │        │           │          │
            │                            ┌────────────┘        │           └────────┐ │
            │                            ▼                     ▼                    ▼ │
            │                   SQLite (demo data)   services/ai (in-process)  fixtures │
            │                                         graph/ + copilot/        (synthetic)│
            └─────────────────────────────────────────────────┬───────────────────────┘
                                                              │ outbound, gated closed
                                                              ▼
                                                   PayPal **sandbox** (not yet contacted)
```

**Four boundaries that matter.**

1. **Browser ↔ API.** The only client-facing surface. All authorization, consent filtering and money validation happen server-side; the browser is never trusted for membership, host identity, budget or demo-mode selection.
2. **API ↔ AI.** `services/ai` is an in-process library (graph scoring, copilot validation), not a reachable endpoint. Consequence: there is no URL at which a caller could request a tie score or a prompt completion while bypassing consent and authorization checks.
3. **API ↔ provider.** Outbound only, sandbox only, and **closed**: payment-executing paths return `payment_gate_blocked` until YT-006 evidence plus human money-flow approval. Inbound webhooks are verified before any effect.
4. **Real data ↔ synthetic demo data.** Numeric graph values are served only from a versioned fixture by `/demo/graph`. No request parameter switches the data source, so real member data cannot be rendered through the "synthetic" path.

**Components.**

| Path                        | Role                                                                   | Phase 1 state                                             |
| --------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| `apps/web`                  | Next.js + Tailwind UI, server-rendered; no direct DB access            | Not installed; builds against `openapi.json` after freeze |
| `services/api`              | Fastify HTTP API, authorization, persistence, ledger, webhook ingress  | Not implemented                                           |
| `services/api/src/payments` | Provider calls, state machine, signature verification (Payments-owned) | Not implemented; gate closed                              |
| `services/ai/graph`         | Tie-strength and drift heuristics over consented signals               | Not implemented                                           |
| `services/ai/copilot`       | Prompt construction, schema validation, bounded retry                  | Not implemented                                           |
| `packages/shared`           | Types generated from `openapi.json` after freeze                       | Intentionally empty                                       |
| `infra`                     | Setup server, seed, local tooling                                      | Phase 0 scaffold only                                     |

## Auth and tenant isolation

- **Identity.** Demo sessions select a seeded synthetic member. No password, email, OAuth or real identity is handled, so there is no credential store to protect in the demo.
- **Impersonation is acceptable only on loopback (XR-20).** Any caller can start a session as any seeded member, including the current host. On a reachable host that means anyone could approve a plan and, once the payment gate opened, create a venue payment. A real identity model is therefore a **precondition for YT-032 (hosted demo) and for opening the payment gate**, not a later improvement, and Security must map it in YT-023.
- **Operator actions are out of band (XR-19).** Advancing a turn and resetting fixtures are seed/script actions run by the operator against the local database; they are deliberately **not** HTTP operations, because an HTTP route would need an operator authorization model the demo does not have. Declining an invitation has no route yet and is filed for the next contract revision.
- **Session.** `HttpOnly`, `SameSite=Strict` cookie, `Secure` when served over TLS, with a server-side session record and expiry. Mutating requests require a matching `X-CSRF-Token`.
- **Per-request authorization.** Every circle-scoped request re-derives the caller's membership from the database. Client-supplied member or circle claims are ignored. Non-members get `404`, identical to a missing circle, so membership is not disclosed by status code.
- **Host-scoped actions.** Suggestions, approval and payment creation re-check "is the caller the host of _this_ turn" inside the same transaction that performs the action, so a turn change between read and write cannot be exploited.
- **Self-scoped actions.** Consent, pause, leave and attendance exist only as `/members/me` routes. There is no admin or host override, so no privileged path to another member's privacy state exists.
- **Secrets.** Future sandbox credentials live in ignored local configuration, are read server-side only, and are never sent to the browser, a prompt, a fixture, a log line or an error body. Threat modelling is Security's (YT-023).

## Data flows

**A. Join and agree.** Invitation → acceptance (size check inside transaction) → membership version bump. Tracking consent is a **separate** later choice, defaulting off. Contribution proposal → per-member explicit agreements bound to proposal and membership version → `agreed` only when every current accepted member has agreed. Aggregate progress is returned; individual dissent is not attributed.

**B. Turn and plan.** Turns are derived from accepted-member order plus member-id tie-break. The host requests suggestions; the API assembles a minimal prompt (first names, plan-relevant preferences, budget, fixed venue list) with no emails, payment data, hardship information or tie values, validates the model output against the plan schema, retries once on invalid output, and returns **exactly three** plans or an explicit unavailable outcome. A manual fixed-list path is always available.

**C. Approval.** The host approves one immutable plan version; deterministic code records a full snapshot (plan, version, venue, total cents, turn, host). The model cannot approve, spend or book. Approval responses state explicitly that approval is neither payment nor reservation.

**D. Money (gated).** Contribution subscription and venue payment both route through `services/api/src/payments`, both currently return `payment_gate_blocked`, and neither has a simulated-success path. When the gate is opened by a human, a verified provider webhook — signature checked **before** any effect, deduplicated by provider event id — is the only thing that may append a ledger entry. The pot is always re-derived by summing entries.

**E. Graph — gated closed (XR-01).** Real-member tie values are **not computed at all** while Q-002 is open. The earlier draft relied on non-persistence, but inference about real people is itself the thing Behavioral says it cannot approve; a graph gate now mirrors the payment gate, and while it is closed no tie- or drift-derived value is computed, stored, returned or used as prompt input, and no guidance names a pair. If a deployment requires graph input for suggestions it returns `503 graph_gate_blocked` rather than degrading silently. When the gate is eventually opened, values would be transient, filtered to pairs where both members have tracking on, and never persisted, returned numerically or exported. The demo visualization reads the synthetic fixture and is labelled as fictional, with a text equivalent and a non-color cue.

## Failure modes and reconciliation

| Failure                                       | Required behavior                                                                                                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model returns invalid JSON                    | One bounded regeneration, then explicit `unavailable`; never a partial list presented as success                                                                       |
| Model returns four plans or an off-list venue | Rejected by schema/venue validation before the host sees it                                                                                                            |
| Webhook signature invalid or missing          | `401`, no ledger entry, no status change. (No valid event causes a notification either: **no notification is emitted by any path**, because none is approved — XR-28.) |
| Duplicate verified webhook                    | Unique `provider_event_id` constraint ⇒ at most one entry; `duplicate: true, effectsApplied: false`                                                                    |
| Out-of-order provider events                  | Reconcile by reading provider state; arrival order is never authoritative                                                                                              |
| Provider timeout after a possible capture     | Attempt stays non-final; reconcile by provider readback before claiming success or retrying                                                                            |
| Two concurrent host approvals                 | Serialized transaction with in-transaction budget re-derivation; the loser gets `409`/`422`                                                                            |
| Retried mutating request                      | `Idempotency-Key` replay of the stored first response                                                                                                                  |
| Plan or amount changed after approval         | `approval_stale`; re-approval required                                                                                                                                 |
| Member leaves mid-cycle                       | Exit always succeeds; affected turns suspend and report `suspended_pending_rule`                                                                                       |
| Consent withdrawn mid-cycle                   | Edges incident to that member excluded on the next computation; cached artifacts invalidated first                                                                     |
| Database write fails mid-operation            | Whole transaction rolls back; no partial money or consent effect persists                                                                                              |
| Payment gate closed                           | Honest `payment_gate_blocked` with blocking task ids; never a fake success screen                                                                                      |

**Reconciliation stance.** Provider state is authoritative over local state for anything money-related, and local state is never upgraded to "succeeded" without a verified event or an explicit readback. Any unreconciled attempt is displayed as unverified rather than resolved optimistically.

## Deployment boundary

- **Now:** local only. `make dev` serves the Phase 0 setup page on loopback; there is no product service to deploy, no container image, no hosted database and no public URL.
- **Planned (YT-032, needs separate human approval):** a sandbox-only demo environment with secrets injected at runtime, loopback-equivalent access control, health check and reset procedure. No production environment, no live credentials, no billable autoscaling.
- **Never in this project:** live PayPal credentials, real user data, public sign-up, or exposing the unauthenticated setup server to the internet.
- **Webhook ingress** requires a publicly reachable URL, which is the main reason a hosted environment may be needed at all; until then webhook handling is exercised only by locally constructed signed-payload tests, which prove handler logic and not provider behavior.
- **CI** runs lint, strict typecheck, tests and a secret scan on GitHub Actions. Hosted CI success is evidence about the repository, not about any deployed environment.
