# Constraints and stop conditions

## Scope

Three-day hackathon: production-grade structure, demo-sized implementation. Phase 0 about two hours; Phase 1 contracts on Day 1 morning; Phase 2 build Day 1 afternoon–Day 2; Phase 3 hardening Day 2 evening; Phase 4 demo Day 3. The schedule is relative to human release of the build, not permission to skip gates.

Only setup is authorized now. Docs outside the required complete context/roles/behavioral set may be structured stubs. No product API, AI scoring, payment integration or application screens until Phase 0 is complete and committed and a human authorizes Phase 1. ADR 0002 selects npm workspaces, strict TypeScript, planned Next.js/Tailwind, Fastify, SQLite and TypeScript AI. `make dev` serves a setup page only.

## Non-negotiable safety limits

- PayPal sandbox only; no live credentials, charges, deployments or paid resources.
- Existing circles of 3–6; default 500 USD cents monthly, maximum 1500; whole-group agreement.
- Host receives no cash. Deterministic code after explicit host approval is the only future order-creation path.
- Integer cents, ledger-derived balances, verified and replay-safe webhooks. No floating-point money, no LLM payment tools.
- Only consented and minimized graph inputs. Never real public scores, rankings or warnings; host suggestions must be positive.
- The red-to-green graph demonstration uses synthetic people and must say so. Real-user visibility is blocked on Q-002.
- Fixed demo venue list; no fake successful booking or successful sandbox evidence.
- No real user research recruitment, external messages or public release without human approval.

## Release blockers

1. Subscription → pot → venue funding mechanism is not verified. Sandbox credentials, merchant setup, buyer approvals and signature-verified webhook evidence are required in YT-006.
2. If the merchant Order actually fails, Payments/Architect propose ADR 0003 for a clearly labelled simulated venue payment. A missing credential is not an observed failure. No fallback has been approved.
3. The fallback conflicts with the instruction to never cut real sandbox payment. A human must explicitly resolve that conflict; simulated venue payment cannot silently satisfy the real-payment requirement.
4. Forfeit, money custody, cancellation, dispute and refund policy require Payments/Legal review; a technical demo is not compliance approval.
5. Human GitHub owners, remote, green hosted CI and main protection are not configured. Local checks are not hosted CI.
6. Initial RULES.md is the user-requested text; any later modification requires human approval. Bootstrap selects ADRs provisionally, not fabricated approvals.

## Cuts, in order

Live venue search → turn-order optimization → Payouts refunds → memory recap. Keep these in LATER, not implicitly in scope. Never cut the real sandbox payment requirement, drift graph demonstration or behavioral safeguards. Payouts/refunds are not approved money-flow scope merely because Payments owns that integration domain.

## Production boundary

Do not describe scaffold structure as production readiness. Authentication/authorization, database migrations, full e2e, accessibility audit, 100% money branch coverage and risk reviews remain future tasks.
