# packages/shared

Shared TypeScript types for the YourTurn contract. **Intentionally empty in Phase 1.**

The contract (`docs/03-architecture/openapi.json`) is `v0.1.0-draft` and not frozen, so generating types now would spread a moving target across the codebase. No hand-written contract types belong here at any point.

## Plan (after the YT-014 freeze)

1. `openapi.json` is the single source of truth.
2. A committed script generates `src/contract.d.ts` — types only, no runtime logic.
3. CI regenerates and fails on any diff, so code cannot drift from the contract.
4. Backend, Frontend and QA import from here instead of redeclaring request/response shapes.

Owner: Architect (ADR 0002, ADR 0004). Read `AGENTS.md` and `agents/ROSTER.md` before adding anything.
