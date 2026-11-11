# ADR 0001: Record architecture decisions

- Status: selected for bootstrap; human ratification at YT-007.
- Date: 2026-11-11
- Owner: Architect
- Task: YT-002

## Context

Independent agents must not silently make incompatible, hard-to-reverse choices during a three-day build.

## Decision

Record every stack, schema, provider, privacy-sensitive visibility or money-flow choice as a numbered ADR in this directory using TEMPLATE.md. Reserve the next number in a claimed board task before writing; never reuse or renumber a published ADR. The Architect approves contract changes, relevant owners review their domain, and a human must approve money-flow changes. Keep API.md and DATA_MODEL.md aligned in the same reviewed change.

## Consequences

Use proposed, accepted, rejected or superseded status with approver and evidence. Bootstrap selections remain provisional until the initial human gate. Do not claim agent or human approval that has not occurred. Link a superseding ADR rather than rewriting decision history. Escalate unresolved choices on BOARD.md; the absence of an ADR is not permission to improvise.

## Verification

Reviewer checks every irreversible change for its ADR, linked task, owners, alternatives, risks and explicit approval record.
