# Constraints and stop conditions

## Scope

Three-day hackathon: production-grade structure, demo-sized implementation. Phase 0 about two hours; Phase 1 contracts on Day 1 morning; Phase 2 build Day 1 afternoon–Day 2; Phase 3 hardening Day 2 evening; Phase 4 demo Day 3. The schedule is relative to human release of the build, not permission to skip gates.

The human authorized Phase 1 documentation on November 11, 2026 after approving bootstrap main promotion. Draft PRD, API/data-model schema, behavioral review and design flows may proceed while sandbox feasibility remains blocked. No product API implementation, AI scoring, payment integration or application screens are authorized by this limited document release. ADR 0002 selects npm workspaces, strict TypeScript, planned Next.js/Tailwind, Fastify, SQLite and TypeScript AI. `make dev` serves a setup page only.

## Non-negotiable safety limits

- PayPal sandbox only; no live credentials, charges, deployments or paid resources.
- Existing groups of **3–8**; minimum three so no single refusal can be traced to one person. Each member authorizes only **their own share** (ADR 0006).
- **No pooled funds.** The venue is the payee on each member's order, so the platform never holds money. If the Payouts fallback is ever used the platform holds funds again, which is a **new human decision**, not a code path.
- **All-or-nothing, both directions.** Capture only when every share is held; void every hold on a decline or deadline; refund successful captures if one fails irrecoverably.
- The commit deadline must sit **below PayPal's authorization honor period**, read from live documentation rather than assumed.
- Deterministic code after explicit member approval is the only path that creates, captures or voids anything.
- Integer cents, ledger-derived balances, verified and replay-safe webhooks. No floating-point money, no LLM payment tools.
- **No friendship inference of any kind** — no tie strength, no drift, no graph (ADR 0006). Each agent reasons only over constraints its own member stated about themselves.
- Only the **winning** plan is revealed. Rejected candidates, per-member answers and reasons are never shown or stored. Group progress is a **count**, never names.
- Hard constraints (budget, availability, dietary, travel) are **plain code**. An LLM may change ranking only and can never turn a reject into an accept.
- Privacy is **architectural and policy-based, not cryptographic**: the tally sees per-member answers in memory. Never describe it as cryptographically private, and state the inference-over-rounds limit wherever the claim appears.
- Fixed demo venue list; no fake successful booking or successful sandbox evidence.
- No real user research recruitment, external messages or public release without human approval.

## Release blockers

0. **Unspoken (ADR 0006) is the live product.** Blockers 1–3 below are YourTurn history, kept because they record what was actually tested. The live blockers are: **Q-008** — captured funds have not been observed landing in the venue account, only accepted at order creation; the **payer-approval** steps (authorize, capture, void, refund) each need a human in a browser; the **webhook leg** needs a public HTTPS listener; and the YourTurn contract (`openapi.json`, `DATA_MODEL.md`, `API.md`) is **stale** until UN-001 rewrites it. The payment gate stays closed.

1. Subscription → pot → venue funding mechanism is not verified. Sandbox credentials, merchant setup, buyer approvals and signature-verified webhook evidence are required in YT-006.
2. If the merchant Order actually fails, Payments/Architect propose ADR 0003 for a clearly labelled simulated venue payment. A missing credential is not an observed failure. No fallback has been approved.
3. The fallback conflicts with the instruction to never cut real sandbox payment. A human must explicitly resolve that conflict; simulated venue payment cannot silently satisfy the real-payment requirement.
4. Forfeit, money custody, cancellation, dispute and refund policy require Payments/Legal review; a technical demo is not compliance approval.
5. Private GitHub remote `shaahid-ahmed/yourturn`, owner `@shaahid-ahmed`, main at `10bc1d7`, and successful hosted CI run `43058134382` are verified. CODEOWNERS activation and branch protection remain unconfigured; neither is implied by CI success.
6. Initial RULES.md is the user-requested text; any later modification requires human approval. Bootstrap selects ADRs provisionally, not fabricated approvals.

## Cuts, in order

Live venue search → turn-order optimization → Payouts refunds → memory recap. Keep these in LATER, not implicitly in scope. Never cut the real sandbox payment requirement, drift graph demonstration or behavioral safeguards. Payouts/refunds are not approved money-flow scope merely because Payments owns that integration domain.

## Production boundary

Do not describe scaffold structure as production readiness. Authentication/authorization, database migrations, full e2e, accessibility audit, 100% money branch coverage and risk reviews remain future tasks.
