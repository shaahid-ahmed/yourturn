# Status

**Date:** November 12, 2026 · **Phase:** 0 — planning, four collaborators

## What is decided

- **Unspoken** is the product. ADR 0006 pivoted away from the pooled-friendship-fund idea; ADR 0007 then adopted the designer's UX spec as the source of truth for every screen.
- The spec is authoritative and removes three things the earlier backend plan assumed: per-share holds with all-or-nothing capture, counts-only progress, and the venue as PayPal payee.
- Money is now an **IOU ledger**: one member pays the venue and the others owe them. Balances are derived from the append-only ledger.
- The app costs **$15 a month**, billed through the phone's app store, separate from hangout money.

## What is not decided (blocks backend code)

The spec's own open decisions, recorded as Q-011: who pays the $15, whether there is a free trial, **how the payer pays the venue**, **how the payer is chosen**, **who confirms a booking**, **who sees which balances**, and the fixed interest list. Also open: Q-010 (which PayPal product pays a personal account), Q-012 (member-to-member transfer review) and Q-013 (votes are now visible with names, which must be written down as a deliberate choice).

## Four-person split

`tasks/BOARD.md` → **CURRENT PLAN**. Shaahid owns backend/money/infra; Alan owns the mobile app, pods and AI; Vid owns visual design, motion and accessibility; Rohan owns QA, fixtures and the demo. Cross-lane touchpoints are named there.

## Verification state

Nothing is built for the new flow yet. The retired per-member authorize/capture/void work remains on its branch as a labelled experiment and must not enter the demo path. `make check` on `main` is green.

## Next

1. Human answers Q-011 (the six spec decisions) — this unblocks the backend.
2. Shaahid starts US-001 (contract) and US-002 (schema) in parallel.
3. Vid starts US-201 (design tokens) and US-202 (all 23 screens) in parallel — no dependency on the backend.
4. Alan starts US-101 (onboarding) against the contract draft.
5. Rohan starts US-301 (test plan and fixtures).
