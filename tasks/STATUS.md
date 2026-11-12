# Status

**Date:** November 12, 2026 · **Phase:** execution — nearly done, 13 live tasks left

## What is built

- **Unspoken** on `main`: contract (74 ops), domain (pods/chat/polls/IOU/catalog/subs/calendar/booking), Next.js app (23 screens), design tokens + motion, WCAG 2.2 AA app-stage audit.
- **Merged this round:** Vid's US-204 (app-stage a11y), US-205 (design QA), US-003 (subscriptions), US-011 (calendar), US-012 (booking). Zero open PRs.
- **Landing:** US-019 HTTP layer (sessions + profile/limits/contacts + pod views wired; hangouts/chat/polls/balances handlers next). `make check` green (344/344).

## What is left (live tasks)

- **Shaahid (7, in progress):** US-019 HTTP routes, US-301–305 test plan/fixtures/E2E/demo/final-QA, US-018 README/handoff.
- **Vid (4, unclaimed):** US-014 public HTTPS origin, US-016 backend review, US-017 deploy/recover, US-204 device screen-reader pass (design + app audits done).
- **Blocked (2):** US-006 member-to-member PayPal (Alan, waits Q-010), US-015 security/legal (Rohan, waits US-006).
- **Human gates:** Q-010, Q-011 (six spec decisions), YT-007 release gate.

## Standing limitations

Payment gate closed (no money moves), sandbox-only receipt verifier, webhooks refused, no public origin, simulated booking, synthetic fixtures only. See README "Exact limitations".
