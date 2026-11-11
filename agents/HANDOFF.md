# Claim, collaborate and hand off

## Before work

Read AGENTS.md and the mandatory read order. Select a role and unclaimed task whose dependencies are DONE and whose phase is released. `∥` denotes possible parallel work **only after dependencies and the phase gate clear**, not permission to start now.

Give your agent a stable identifier for this session. On a fresh clone, fetch the shared base before claiming. The human/Orchestrator is the claim coordinator: land or acknowledge a claim on the shared board before separate machines edit the same task. A local branch claim alone is not a distributed lock. If the remote/coordinator is unavailable, ask and wait rather than race.

Move your row from TODO to IN PROGRESS; set `Claimed by` to `role, agent-id` and `Branch/PR` to `role/short-task`. This expresses `IN PROGRESS (role, agent-id)`. Never duplicate a row, take another claim, clear another agent's claim or assign DONE to yourself. Record a timestamp and checkpoint in the handoff. Stale claims need explicit Orchestrator reassignment after checking the prior owner.

## Ownership and shared files

Read ROSTER.md: narrow-path owners override broad-path owners. All roles have a limited collaboration exception to edit their own board claim, handoff and tagged questions; Orchestrator controls global ordering and closure. Shared files require section-level delegation recorded in the task before editing. Request an owning-role task for cross-lane code changes. Reviewer only comments and never authors reviewed code.

The user's bootstrap request authorizes initial scaffold creation across the tree, with Orchestrator coordinating Architect/SRE/Tech Writer/Behavioral tasks. This is not standing cross-lane write authority. Initial commit is on orchestrator/bootstrap, not a merge to main.

## Review and closure

1. Implement only acceptance criteria and update affected docs in the same PR. Stay under roughly 400 changed lines where possible; initial scaffold is a documented exception.
2. Run `make check` plus domain-specific tests. Money code additionally needs 100% branch coverage; model/prompt changes need recorded fixture evals. A scaffold check is not a product e2e or sandbox proof.
3. Append the handoff below; move the task to IN REVIEW and link the diff/PR and actual command results. Never fabricate passing checks, approvals or source evidence.
4. Independent Reviewer (not an author) checks the global and role DoD. Behavioral Scientist gates money/drift/notifications/social comparison; Content Designer also approves notification copy. Security, Privacy and Legal answer their respective blockers.
5. Human must approve main merges, changes to RULES.md, money-flow changes and final demo. Human also explicitly releases Phase 1 after Phase 0.
6. Only Orchestrator moves a task to DONE after every DoD box, hosted CI and required approval has evidence. For local-only bootstrap, leave tasks IN REVIEW and release tasks BLOCKED rather than equating local green checks to CI.

## Stopping and blockers

Write a handoff whenever stopping, even if incomplete. Move a task to BLOCKED if a missing decision or credential prevents progress, preserving its claim and dependency. Append tagged questions under Open questions; never guess on money, privacy, legal or behavioral questions. Share credential **names**, not values, and do not paste credentials into board, logs or PRs.

## Required handoff format

```text
### Handoff YT-0xx: <role> → <next role>
Done: ...
Not done: ...
How to verify: <command(s)>
Risks / gotchas: ...
Next step: ...
```

Append under BOARD.md or link a file under tasks/handoffs/. Include exact acceptance-criterion evidence and relevant commit/PR identifier when available. Agent review is not human approval; a commit is not a merge.
