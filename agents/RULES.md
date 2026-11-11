# Strict rules


### Scope and ownership
1. **Stay in your lane.** Only edit paths your role owns. To change another role's file, open a task for that role on the board.
2. **Contracts come first.** `docs/03-architecture/API.md` and `DATA_MODEL.md` are the source of truth. Frontend and backend build against the contract. Changing the contract requires an ADR and Architect approval.
3. **Decisions go in ADRs.** Any choice that is hard to reverse (stack, schema, provider, money flow) gets a numbered ADR in `docs/decisions/`.
4. **No scope creep.** If something is not in `PRD.md`, don't build it. Propose it on the board under "Later."

### Money (Payments and Backend)
5. **Sandbox only.** No live PayPal credentials anywhere, ever.
6. **Money is integer cents** in plain code. Never use floats for money.
7. **The LLM never moves money.** AI can suggest plans. Only deterministic code, after explicit host approval, creates an Order.
8. **Idempotency everywhere:** every PayPal call carries an idempotency key, and every webhook handler is safe to run twice.
9. **Verify every webhook signature** before acting on it.
10. **The pot balance is derived** from the ledger, never stored as a mutable number.

### AI
11. **LLM output must be structured JSON** validated against a schema; reject and retry on invalid output.
12. **No personal data in prompts** beyond what the task needs: first names and preferences, never emails or payment data.
13. **Every model or prompt change ships with an eval** run on `tests/fixtures/` and recorded in `docs/03-architecture/AI.md`.

### Code quality
14. TypeScript `strict` mode on, and Python with type hints plus mypy if Python is used.
15. **Tests are required:** unit tests for logic, an e2e test for the demo path, and money logic at 100% branch coverage.
16. **No secrets in git.** Use `.env.example` only, and CI runs a secret scanner.
17. **Conventional commits** (`feat:`, `fix:`, `docs:`...). Branch names follow `role/short-task` (for example `payments/orders-capture`).
18. **Small PRs**, under ~400 changed lines when possible, each with a linked task ID.
19. **No PR merges without a Reviewer agent approval** and green CI.

### Collaboration
20. **Claim before you work:** set the task to `IN PROGRESS (role, agent-id)` on `BOARD.md` before starting. Never take a task someone else has claimed.
21. **Leave a handoff note** when you stop: what's done, what's not, how to verify, and what's next.
22. **Don't guess on money, privacy, legal or behavioral questions.** Ask on the board and tag the owning role.
23. **Update the docs in the same PR** as the code that changes them.
24. **Human approval gates:** merges to `main`, any change to `RULES.md`, any change to money flow, and the final demo build.

### Global definition of done
- [ ] Acceptance criteria in the task are met
- [ ] Tests are added and pass, and CI is green
- [ ] Affected docs are updated
- [ ] Behavioral checklist passes (if the change touches users, money or notifications)
- [ ] Reviewer approved
- [ ] Handoff note written, and the task is moved to DONE
