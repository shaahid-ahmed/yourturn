# YourTurn — start here

## 1. What this is

YourTurn helps existing friend groups share the work of staying connected through a rotating host and a proposed friendship fund. An AI copilot suggests plans while private, consented interaction signals inform reconnection opportunities. This repository is a sandbox-only, three-day demo scaffold, not a live money product; read [PRODUCT.md](docs/00-context/PRODUCT.md).

## 2. Read order (mandatory)

1. [agents/RULES.md](agents/RULES.md)
2. Every file in `docs/00-context/`
3. `agents/roles/<your-role>.md`
4. [tasks/BOARD.md](tasks/BOARD.md)
5. The documents listed under **Inputs** in your role file

## 3. Pick a role

Use the role your human assigned. Otherwise choose an unclaimed, unblocked task on BOARD.md and take its named role. Check ROSTER.md for write boundaries. **Phase 1 and product implementation are not released.** Proposals and synthetic fixtures are not approval of money flow or real-user graph visibility.

## 4. Claim and hand off

Follow [agents/HANDOFF.md](agents/HANDOFF.md). Coordinate the claim before starting; move your row to IN PROGRESS with `role, agent-id`, and use a `role/short-task` branch. Respect dependencies, narrow-path ownership and the single shared board. When stopping, write Done / Not done / How to verify / Risks / Next step, then request independent review; Orchestrator closes only after all gates pass.

## 5. Commands — all from repository root

Prerequisites: Node 24 and npm 11; Make is optional. ADR 0002 chooses npm workspaces rather than the recommended pnpm because npm is already available.

| Action                       | Command          | npm equivalent      |
| ---------------------------- | ---------------- | ------------------- |
| Install locked dependencies  | `make install`   | `npm ci`            |
| Run local setup server       | `make dev`       | `npm run dev`       |
| Test bootstrap               | `make test`      | `npm test`          |
| Lint/format check            | `make lint`      | `npm run lint`      |
| Strict typecheck             | `make typecheck` | `npm run typecheck` |
| Seed synthetic scaffold data | `make seed`      | `npm run seed`      |
| Secret scan                  | `make secrets`   | `npm run secrets`   |
| All local checks             | `make check`     | `npm run check`     |

`make dev` listens on loopback port 3000 by default; `PORT=3001 make dev` selects another port. It serves **setup status only**, with `/health` stating Phase 0 and no product readiness. `make seed` writes only synthetic fixture data to ignored `.local/demo-seed.json`; there is no product database yet. No command needs PayPal or LLM credentials during bootstrap. Future feature/e2e/eval commands must be added and exercised by their owners.

## 6. Global definition of done

- [ ] Acceptance criteria in the task are met
- [ ] Tests are added and pass, and CI is green
- [ ] Affected docs are updated
- [ ] Behavioral checklist passes (if the change touches users, money or notifications)
- [ ] Reviewer approved
- [ ] Handoff note written, and the task is moved to DONE

Local checks do not prove hosted CI, independent approval, sandbox payment, behavioral sign-off or production readiness. Keep the initial scaffold IN REVIEW until those required gates actually pass. Money logic additionally requires 100% branch coverage and explicit human money-flow approval; no money logic exists at bootstrap.

## 7. Where to ask

Append a question to **Open questions** in tasks/BOARD.md and tag the role owning the answer. Never guess on money, privacy or legal questions; behavioral uncertainty also blocks affected work. Credentials go only into ignored local configuration via the human's secure setup, never chat, git or task notes.
