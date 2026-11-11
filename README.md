# YourTurn

Keep existing friend groups connected by sharing the work of hosting. The proposed product combines a rotating friendship fund, private reconnection suggestions and a host-approved venue plan.

**Current state: Phase 1 documentation authorized; runtime remains scaffold-only.** No circles API, authentication, database ledger, PayPal integration, AI graph, LLM copilot or booking exists yet. Product implementation and final contract freeze remain blocked on sandbox and policy decisions. Agents start at [AGENTS.md](AGENTS.md); humans see [tasks/STATUS.md](tasks/STATUS.md).

## Run locally

Prerequisites: Node 24 and npm 11; Make optional.

```sh
make install
make check
make seed
make dev
```

Equivalent commands are `npm ci`, `npm run check`, `npm run seed`, `npm run dev`. The server binds loopback port 3000 (`PORT=3001 make dev` changes it) and shows **setup status, not the product**. GET `/health` is an infrastructure check. Ctrl-C stops it. Seed writes only synthetic scaffold data to ignored `.local/demo-seed.json`.

## Intended stack

TypeScript/npm workspaces, planned Next.js + Tailwind web, Fastify API, SQLite local demo and TypeScript AI modules. [ADR 0002](docs/decisions/0002-stack.md) records the provisional choice. Bootstrap installs only development tooling; framework installation follows approved contracts.

## Safety and compliance disclaimer

Sandbox demonstration only; not a live financial service, legal assessment or production-ready system. No real funds or live PayPal credentials. The proposed pooled-fund, venue-payment and forfeiture arrangements are **not verified or approved**. Payments/Legal and the human must resolve them before any money-flow implementation. The red/green graph demo must use visibly synthetic people until privacy and behavioral approvals resolve real-user visibility. A score is not a validated measure of friendship. No actual venue booking or completed sandbox transaction is claimed.

## Collaborate

Private GitHub repository: `shaahid-ahmed/yourturn`. The human approved bootstrap `10bc1d7` on `main`; hosted CI passed. Phase 1 drafting uses `orchestrator/phase-1-contracts`, not direct edits to main. CODEOWNERS activation and protected-branch settings remain separate work; no future main merge is authorized by the Phase 1 drafting request. See BOARD.md for blockers, dependencies and role claims.

> Clone the repo, read `AGENTS.md`, take role `<role>`, and claim the next unclaimed task for that role on `tasks/BOARD.md`.

## Demo link

Not deployed. A demo URL and recorded backup will be added only after final human approval.
