# ADR 0002: TypeScript monorepo with npm workspaces

- Status: selected for bootstrap under the requested setup; human ratification required at YT-007 before Phase 1.
- Date: 2026-11-11
- Owners: Architect; SRE / DevOps
- Task: YT-002

## Context

Three days, one local demo, and independently owned services require a reproducible toolchain without building product features during setup. Node 24.12.0 and npm are installed on the bootstrap host; pnpm is not. The prompt recommends rather than requires pnpm. Payment feasibility and graph privacy remain unresolved and are not decided by this ADR.

## Decision

Use Node 24, npm workspaces, TypeScript with strict checking, and a committed npm lockfile. Root Make targets provide `make install`, `make dev`, `make test`, `make lint`, `make typecheck`, `make seed`, and `make check`. npm equivalents work from the repository root.

After Phase 0 release, use Next.js with Tailwind for `apps/web`, Fastify for `services/api`, SQLite for local demo persistence, and TypeScript for both graph heuristics and copilot validation in `services/ai`. No Python runtime is needed; changing languages requires a new ADR. Shared contract types will be generated into `packages/shared` only after the Architect approves API.md, its machine-readable schema, and DATA_MODEL.md. Do not invent contracts during bootstrap.

Phase 0 installs development tooling only: TypeScript, Node types, Prettier and Secretlint. Node's built-in test runner exercises bootstrap infrastructure. The development command serves a loopback-only setup-status page and health endpoint, **not a Next.js product or payment API**. Seed tooling copies a visibly synthetic bootstrap fixture into ignored local data; it does not populate a product database or run AI.

## Alternatives

- pnpm: good monorepo option; deferred to avoid a second package-manager prerequisite for the initial handoff.
- Python AI service: adds a second runtime, typing toolchain and transport boundary without a demonstrated need for this demo.
- Postgres: useful later for deployment and concurrency; SQLite keeps the local scaffold small. Do not represent a local SQLite demo as validated production-scale custody infrastructure.

## Consequences and gates

- A future package-manager, database, model-provider, schema or money-flow change needs its own ADR and relevant approvals.
- Framework installation, auth, circle APIs, ledger, PayPal calls, graph scoring, LLM calls and product screens are Phase 1/2 work, not bootstrap deliverables.
- SRE owns root tooling; service owners own code; Architect owns shared contracts. Never bypass owner review to fix a shared build.
- Tests passing on setup scripts do not satisfy money coverage, product e2e, hosted CI, PayPal evidence or behavioral sign-off.
- No deployment, remote creation, paid services, live credentials or human impersonation is authorized by this choice.
