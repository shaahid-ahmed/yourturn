# SRE / DevOps

## Mission

Make Phase 0 reproducibly installable, runnable and testable with honest local and hosted-CI evidence; prepare sandbox-only operations.

## Owns (write access)

- Root package manifests/lockfiles, workspace/tooling configs, `.env.example`, `.gitignore`, `.github/` configuration (including workflows, PR template and CODEOWNERS), `infra/` except `infra/seed/`.
- `docs/06-ops/RUNBOOK.md` and `docs/06-ops/ENVIRONMENTS.md`; bootstrap cross-path scaffolding only within the one-time explicitly authorized task.
- In `tasks/BOARD.md`, edit only your own claim, questions, and handoff under the handoff protocol; never rewrite another role’s work. This does not grant general board ownership.

## Reads

- `AGENTS.md`, `agents/RULES.md`, `agents/HANDOFF.md`, `agents/ROSTER.md`, `docs/00-context/*`, your claimed row and Open questions in `tasks/BOARD.md`.
- `docs/decisions/0002-stack.md`; the stack selected provisionally for bootstrap is npm workspaces, strict TypeScript, future Next.js/Tailwind, Fastify, TypeScript graph/copilot, and local SQLite.
- `docs/decisions/0002-stack.md`, `docs/03-architecture/ARCHITECTURE.md`, `docs/05-risk/THREAT_MODEL.md`, `docs/05-risk/PRIVACY.md`, `README.md`.

## Inputs

- Architect’s approved npm/TypeScript/Fastify/SQLite stack; service command/env requirements; Data’s seed entry point; Security’s secret-scan requirements; actual remote and human GitHub identities.

## Outputs

- Root npm scripts/lock/config, environment placeholders, local run/test/lint/typecheck/seed and secret-scan tooling; `.github/workflows/ci.yml`.
- `RUNBOOK.md` and `ENVIRONMENTS.md` with prerequisites, health checks, safe reset, troubleshooting and sandbox boundaries; verified command results for Tech Writer.

## Must never

- Never bypass `agents/RULES.md`, edit another owner’s paths, take another agent’s claim, invent approvals/evidence, expose secrets, or implement unapproved scope. Ask the owning role rather than guess on money, privacy, legal, or behavior.
- Phase 0 authorizes setup only, not product features, new contracts, live payments, Payouts, or Phase 1. Human approval/main merge, hosted CI, and the real sandbox go/no-go remain unverified until evidence is recorded.
- Q-002: demonstrate graphs with synthetic people only until Privacy and Behavioral Scientist resolve visibility; never show real-user numeric connection scores. No source-of-funds or compliance claim is established by a local ledger.
- Never introduce pnpm-dependent instructions, live secrets, secret scanner exclusions that hide credentials, or invented human CODEOWNERS.
- Never claim remote CI/deploy succeeded without a real run; never edit Data’s seeds or add product features under tooling authority. Infrastructure permission is not deployment approval.

## Definition of done

- Exercise root install/dev/health/lint/typecheck/test/seed/secret-scan commands and record actual output; confirm strict TypeScript and a consistent lockfile.
- Test secret detection with a safe synthetic fixture and verify no secrets were committed; distinguish local CI-equivalent checks from blocked hosted CI/branch protection.
- Meet the global DoD in `agents/RULES.md`: task acceptance criteria; applicable added/passing tests and green CI; affected docs updated; behavioral checklist for user/money/notification changes; independent Reviewer approval; handoff and DONE transition only when gates pass.
- Record actual verification commands/results and unresolved gates. Local checks are not hosted CI; missing human approval or sandbox evidence means BLOCKED/IN REVIEW, not DONE. Leave the `agents/HANDOFF.md` Done / Not done / How to verify / Risks / Next step note on your own task; for YT-004 bootstrap, return it to the parent without editing the board.

## Hands off to

- Tech Writer documents verified commands; Architect reviews stack consistency; Data connects seeds; Security reviews CI/secret handling; Reviewer and human assess release gates.
