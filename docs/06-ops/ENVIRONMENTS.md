# Environments

## Local bootstrap

Node 24, npm 11, optional Make. `make install` installs the lockfile; `make dev` runs a loopback-only setup server. No secrets are required or loaded by bootstrap. `PORT` is the only runtime environment variable consumed; it must be an integer 1–65535 and defaults to 3000. Test infrastructure uses an OS-assigned port explicitly.

`make seed` copies synthetic bootstrap data to ignored `.local/demo-seed.json`; it is not a database migration or an AI evaluation. Synthetic names Sam, Priya, Alex and Jo are invented and labelled.

## Planned sandbox configuration

`.env.example` documents reserved future configuration. Only PORT is used today. NODE_ENV, DATABASE_URL, PAYPAL_ENV, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_PLAN_ID, PAYPAL_MERCHANT_ID, PAYPAL_VENUE_MERCHANT_ID, PAYPAL_RETURN_URL, PAYPAL_CANCEL_URL, SESSION_SECRET, LLM_API_KEY and LLM_MODEL remain unimplemented, blank placeholders. Future changes must specify validation and update this inventory.

Only local and PayPal sandbox environments are allowed. There is no production deploy target. Live API hosts and live credentials must be rejected by future payment code. No secrets exposed to browser bundles, prompts, fixtures, telemetry or PRs.

## Secret handling

Human supplies sandbox secrets locally after reviewing the money-flow plan. Never request credentials in chat or include secret values in command output. `.env` and `.env.*` are ignored except `.env.example`; runtime does not automatically load them yet. Secretlint scans the repository in local checks and CI. A scanner is a backstop, not proof that every secret format is detected.

## Hosting prerequisites

No GitHub remote, human CODEOWNERS, protected main branch or hosted CI run exists at bootstrap. SRE must configure those with the human and verify the actual CI run before marking setup DONE. Public webhook tunnelling and demo deployment require a separate approved task; do not expose the unauthenticated scaffold server publicly.
