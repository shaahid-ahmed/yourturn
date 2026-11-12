# Unspoken (sandbox demo)

AI agents plan your friend group's hangouts without anyone having to say "I can't afford that." Built for a PayPal + AI hackathon. **Sandbox only: no real money moves, no live store billing, no production readiness.**

## What is built (on `main`)

- **Contract** (`docs/03-architecture/openapi.json`, v0.2.0-draft): 74 operations under `/api/v1`, pods, chat, polls, hangouts, balances, payments, calendar, subscription.
- **Domain** (`services/api/src`): pods/invites, chat, polls/ready-check, IOU ledger + balances, NYC seeded catalog, subscriptions, calendar, booking, notifications, per-member vault. All TDD, integer cents, append-only ledger.
- **HTTP layer** (`services/api/src/http`, landing in waves): spec-driven routes, session-cookie + CSRF auth, contract Error shapes, payment gate **closed** (`409 payment_gate_blocked`).
- **App** (`apps/web`): Next.js phone-first UI, all 23 spec screens, design tokens, motion with reduced-motion equivalents, WCAG 2.2 AA app-stage audit (device screen-reader pass still outstanding).

## Run locally

Prerequisites: Node 24, npm 11. Fresh-clone verified (clone → `npm ci` → `make check` green).

```sh
npm ci
make check     # prettier + openapi lint + strict typecheck + all tests + secret scan
make seed      # synthetic demo fixtures into ignored .local/
make dev       # bootstrap status server on 127.0.0.1:3000 (infra only, no product routes)
```

`npm test` runs the contract, domain, HTTP and accessibility suites (344 tests). The product HTTP app has no long-running server yet — routes are exercised via injection until US-019 lands fully.

## Exact limitations (read before demoing)

- **No real money.** The payment gate is closed: settlement answers `409`, no PayPal order/authorize/capture/void runs anywhere. The IOU ledger tracks balances between friends only.
- **No real billing.** The $15 plan verifies against a local HMAC sandbox stand-in, never Apple/Google. No store purchase has been made.
- **No inbound webhooks.** PayPal webhooks answer `401`; no signature verification runs, so no provider event can ever take effect.
- **No public origin.** Return/cancel URLs and the webhook listener need public HTTPS (US-014 open); phones cannot reach `127.0.0.1`.
- **Simulated booking.** "Booked" in the demo carries the notice label; no venue was contacted.
- **Fixtures are synthetic.** Every person, price and schedule is fictional.
- **Blocked on humans:** Q-010 (which PayPal product pays a personal account), Q-011 (six spec decisions incl. who pays the venue and who sees balances), device screen-reader pass, release gate YT-007.

## Collaborate

Private repo `shaahid-ahmed/yourturn`. Four lanes: Shaahid (backend/money/infra), Alan (app/pods/AI), Vid (design/motion/a11y), Rohan (QA/fixtures/demo). Board: `tasks/BOARD.md` (CURRENT PLAN section). Rules: `agents/RULES.md`. Never edit another lane's paths — open a board row instead. Never merge to `main` without explicit human approval.
