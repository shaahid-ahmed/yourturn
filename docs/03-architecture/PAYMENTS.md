# Payments — unverified design boundary

Status: Phase 0 structured stub and go/no-go checklist, **not an approved money flow**.
Owner: Payments; Architect approves contracts; human approves money flow. Tasks: YT-006 and YT-017.

## Required product intent

Monthly sandbox subscriptions contribute to a conceptual ledger-derived pot. The host approves a fixed-venue plan and deterministic code may create an Order to pay that venue. The host never receives cash. A local ledger balance is not proof of a usable PayPal funding source. Do not claim that subscription receipts can fund a third-party venue Order until demonstrated with the intended accounts and permissions.

## Go/no-go evidence required

- Human configures sandbox app, buyer, collecting merchant and venue merchant using ignored local secrets; no credentials in git or logs.
- Record redacted real subscription ID, status, buyer approval and contribution event. Created is not the same as active or paid.
- Record actual venue merchant Order/capture IDs, amount/currency, payer/payee identities by redacted account role, and evidence that the chosen funding mechanism matches the intended pot flow. Separate unrelated buyer checkout is not sufficient proof.
- Receive and verify the webhook signature for the configured app before ledger effects; show replay causes no duplicate effect.
- Read back the exact provider resources and reconcile events before claiming success. Do not substitute webhook simulator output for a real verified payment event.
- If the Order actually fails, record sanitized error and propose ADR 0003; label any simulated venue payment explicitly. Missing credentials mean BLOCKED, not FAILED. Human resolves the conflict with the never-cut real sandbox payment requirement.

## Every provider call (to be specified)

TODO Payments: documented endpoint, verb, sandbox host, permissions, request/response schema, operational idempotency key, provider header support/retention, retry/reconciliation policy, webhook relationship and redacted evidence for each OAuth, product/plan/subscription, Order/capture and signature verification call. No Payouts/refund implementation without explicit scope and money-flow approval.

Rule 8 remains unchanged. Q-005 requests an approved interpretation of provider idempotency support; do not assume sending a header guarantees deduplication on every endpoint. Retain internal operation keys and verified-event deduplication regardless.

## State machine, ledger and concurrency

TODO Payments + Architect: distinguish subscription status, contribution settlement, approval, order creation, payer action, capture, failure, cancellation and reconciliation. Specify integer-cents conversion at provider boundaries, availability/reservations, atomic ledger append and concurrent/retried requests. Never book on an unverified return URL or mutate a stored pot balance.

## Tests and approval

TODO: 100% branch coverage of money logic, invalid signature, duplicate/out-of-order webhook, stale host, insufficient funds, concurrent approvals, timeouts after capture, cancellation/leave/pause and reconciliation tests. Behavioral, Security, Legal, Reviewer and human gates are required as applicable.
