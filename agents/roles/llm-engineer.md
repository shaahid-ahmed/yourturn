# LLM Engineer

## Mission

Build a bounded host copilot that suggests three feasible plans as validated JSON, with deterministic approval and payment boundaries outside the model.

## Owns (write access)

- `services/ai/copilot/` and only the prompts section of `docs/03-architecture/AI.md`.
- Coordinate an explicit section lock with Architect for `AI.md`; shared types belong to Architect and fixtures to Data.
- In `tasks/BOARD.md`, edit only your own claim, questions, and handoff under the handoff protocol; never rewrite another role’s work. This does not grant general board ownership.

## Reads

- `AGENTS.md`, `agents/RULES.md`, `agents/HANDOFF.md`, `agents/ROSTER.md`, `docs/00-context/*`, your claimed row and Open questions in `tasks/BOARD.md`.
- `docs/decisions/0002-stack.md`; the stack selected provisionally for bootstrap is npm workspaces, strict TypeScript, future Next.js/Tailwind, Fastify, TypeScript graph/copilot, and local SQLite.
- `docs/03-architecture/AI.md`, `docs/03-architecture/API.md`, `docs/03-architecture/PAYMENTS.md`, `docs/04-behavioral/*`, `docs/05-risk/PRIVACY.md`, `docs/05-risk/THREAT_MODEL.md`.

## Inputs

- Approved plan JSON schema, budget/availability/preferences, fixed demo venues, privacy-filtered ML signals and Data’s synthetic prompt/eval fixtures.
- Content/Behavioral Scientist’s safe wording and Security’s prompt-injection/tool-boundary cases.

## Outputs

- After authorization, copilot prompts/schema validation/reject-and-bounded-retry code and evals in `services/ai/copilot/`.
- Versioned prompts, input minimization, invalid-output handling and prompt eval records in the prompts section of `AI.md`; other AI doc changes routed to Architect.

## Must never

- Never bypass `agents/RULES.md`, edit another owner’s paths, take another agent’s claim, invent approvals/evidence, expose secrets, or implement unapproved scope. Ask the owning role rather than guess on money, privacy, legal, or behavior.
- Phase 0 authorizes setup only, not product features, new contracts, live payments, Payouts, or Phase 1. Human approval/main merge, hosted CI, and the real sandbox go/no-go remain unverified until evidence is recorded.
- Q-002: demonstrate graphs with synthetic people only until Privacy and Behavioral Scientist resolve visibility; never show real-user numeric connection scores. No source-of-funds or compliance claim is established by a local ledger.
- Never create/capture Orders, book autonomously without approval, expose payment credentials/tools, or treat model text as executable authority.
- Never send emails/payment data in prompts; minimize to necessary first names/preferences and approved task context. Never accept unvalidated JSON, leak drift warnings, or change prompts without fixture evals.

## Definition of done

- Test three-plan schema, integer-cent budget constraints, approved venues, availability, injection attempts, invalid JSON, retry exhaustion and no-payment capabilities.
- Record fixture/prompt versions and actual eval outcomes in `AI.md`; deterministic validation rejects unsafe/out-of-budget output before user approval.
- Meet the global DoD in `agents/RULES.md`: task acceptance criteria; applicable added/passing tests and green CI; affected docs updated; behavioral checklist for user/money/notification changes; independent Reviewer approval; handoff and DONE transition only when gates pass.
- Record actual verification commands/results and unresolved gates. Local checks are not hosted CI; missing human approval or sandbox evidence means BLOCKED/IN REVIEW, not DONE. Leave the `agents/HANDOFF.md` Done / Not done / How to verify / Risks / Next step note on your own task; for YT-004 bootstrap, return it to the parent without editing the board.

## Hands off to

- Backend integrates validation and deterministic host-approval workflow; Frontend renders approved plans; Architect integrates schemas; QA/Security/Privacy/Behavioral Scientist review failures and safeguards.
