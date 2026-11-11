# Runbook

## Install and verify

From repository root run `make install`, then `make check`. If Make is unavailable, use `npm ci` and `npm run check`. Use Node 24 and npm 11. Never use `--passWithNoTests` or bypass a failed scanner/typecheck.

## Start and stop

Run `make dev`; open loopback port 3000. GET `/` shows an explicit setup-only notice; GET `/health` returns Phase 0 status with `productReady: false`. Ctrl-C stops it. If the port is occupied use `PORT=3001 make dev`; do not kill another service. The server has no authentication, product routes, payment actions or AI calls and must not be exposed to the internet.

## Seed

`make seed` writes a synthetic fixture to `.local/demo-seed.json`, replacing that generated local seed on each run. Do not place personal or payment data there. The source fixture is versioned; the generated copy is ignored. This is not realistic historical graph data yet; YT-018 owns that after contract approval.

## Failed checks

- Lint: `npm run format`, inspect changes, then rerun `make check`. Coordinate format changes in other roles' paths.
- Types/tests: reproduce the exact failure and ask the owning role; do not weaken assertions to get green.
- Secrets: do not print the value. If a real secret entered git, stop, notify the human for revocation/rotation, and follow Security's incident task; deleting a file alone does not remove history.
- Payment blocker: record only sanitized resource/error evidence under YT-006; do not retry with live credentials or substitute simulation.

## Demo recovery (future)

TODO SRE/QA: database reset, verified sandbox recovery, webhook reconciliation and backup video procedures once implemented. No invented success pages. Final build and recording require human approval.
