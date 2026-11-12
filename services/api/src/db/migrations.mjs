/**
 * The Unspoken durable schema (US-002), as ordered SQLite migrations.
 *
 * The shape follows the US-001 contract (openapi.json 0.2.0-draft) and ADR 0007.
 * Four rules are enforced by the database itself, not only by application code,
 * so a bug in a route cannot quietly break them:
 *
 * 1. **No stored balance.** No table has a balance, total-owed or pot column.
 *    Every balance is derived from `ledger_entry`, which is append-only: UPDATE
 *    and DELETE raise. A correction is a new `adjustment` entry.
 * 2. **Integer cents.** Tables are STRICT, so a money column rejects 12.5 and
 *    '1250' alike.
 * 3. **The hangout state list is exactly ADR 0007's.** A retired state such as
 *    COMMITTING cannot be written.
 * 4. **Private stays private.** Private limits exist only as a sealed vault
 *    record. The private planner chat has no pod column, so nothing in it can be
 *    addressed to a pod. Calendar tables hold consent and links, never event
 *    content.
 *
 * Migrations are append-only too: never edit one that has shipped; add the next.
 */

/** The ADR 0007 hangout states, in the contract's order. */
export const HANGOUT_STATES = Object.freeze([
  'PLANNING',
  'STRETCH_ASKS',
  'ACTIVITY_VOTE',
  'TIME_VOTE',
  'READY_CHECK',
  'AWAITING_CONFIRMATION',
  'BOOKING',
  'BOOKED',
  'BALANCES_OPEN',
  'SETTLED',
  'NO_PLAN',
  'BOOKING_FAILED',
]);

/**
 * Ledger entry kinds. Named to match the US-005 IOU ledger (PR #51) so the
 * durable rows and the in-memory model describe the same events, plus
 * `adjustment` for the payer's actual total replacing the estimate.
 */
export const LEDGER_KINDS = Object.freeze([
  'balance_created',
  'adjustment',
  'payment_initiated',
  'payment_captured',
  'payment_failed',
]);

/** @param {readonly string[]} values */
const sqlList = (values) => values.map((value) => `'${value}'`).join(', ');

/** @param {string} table */
const appendOnly = (table) => `
CREATE TRIGGER ${table}_no_update BEFORE UPDATE ON ${table}
BEGIN SELECT RAISE(ABORT, '${table} is append-only'); END;
CREATE TRIGGER ${table}_no_delete BEFORE DELETE ON ${table}
BEGIN SELECT RAISE(ABORT, '${table} is append-only'); END;`;

/**
 * @typedef {object} Migration
 * @property {number} version
 * @property {string} name
 * @property {string} sql
 */

/** @type {readonly Migration[]} */
export const MIGRATIONS = Object.freeze([
  {
    version: 1,
    name: 'unspoken core schema (US-002)',
    sql: `
-- people -------------------------------------------------------------------
CREATE TABLE app_user (
  user_id     TEXT PRIMARY KEY,
  first_name  TEXT NOT NULL CHECK (length(first_name) BETWEEN 1 AND 40),
  bio         TEXT NOT NULL DEFAULT '' CHECK (length(bio) <= 280),
  photo_url   TEXT,
  phone       TEXT NOT NULL UNIQUE CHECK (phone GLOB '+[1-9]*' AND length(phone) BETWEEN 8 AND 16),
  synthetic   INTEGER NOT NULL CHECK (synthetic IN (0, 1)),
  created_at  TEXT NOT NULL,
  deleted_at  TEXT
) STRICT;

CREATE TABLE user_interest (
  user_id  TEXT NOT NULL REFERENCES app_user(user_id),
  tag      TEXT NOT NULL CHECK (length(tag) BETWEEN 2 AND 40),
  PRIMARY KEY (user_id, tag)
) STRICT;

-- Private limits: only the sealed vault record. No plaintext column exists.
CREATE TABLE private_limits_vault (
  user_id      TEXT PRIMARY KEY REFERENCES app_user(user_id),
  sealed       BLOB NOT NULL,
  key_version  INTEGER NOT NULL CHECK (key_version >= 1),
  updated_at   TEXT NOT NULL
) STRICT;

CREATE TABLE permission_status (
  user_id        TEXT PRIMARY KEY REFERENCES app_user(user_id),
  contacts       TEXT NOT NULL CHECK (contacts IN ('granted', 'denied', 'not_asked')),
  notifications  TEXT NOT NULL CHECK (notifications IN ('granted', 'denied', 'not_asked')),
  calendar       TEXT NOT NULL CHECK (calendar IN ('granted', 'denied', 'not_asked')),
  updated_at     TEXT NOT NULL
) STRICT;

CREATE TABLE phone_challenge (
  challenge_id  TEXT PRIMARY KEY,
  phone         TEXT NOT NULL,
  code_digest   TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  consumed_at   TEXT
) STRICT;

CREATE TABLE session (
  session_id         TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES app_user(user_id),
  csrf_token_digest  TEXT NOT NULL,
  created_at         TEXT NOT NULL,
  expires_at         TEXT NOT NULL,
  ended_at           TEXT
) STRICT;

-- pods ---------------------------------------------------------------------
CREATE TABLE pod (
  pod_id            TEXT PRIMARY KEY,
  name              TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  creator_user_id   TEXT NOT NULL REFERENCES app_user(user_id),
  rhythm_cadence    TEXT CHECK (rhythm_cadence IN ('weekly', 'every_two_weeks', 'monthly')),
  rhythm_agreed_at  TEXT,
  next_hangout_date TEXT,
  created_at        TEXT NOT NULL
) STRICT;

CREATE TABLE pod_membership (
  pod_id     TEXT NOT NULL REFERENCES pod(pod_id),
  user_id    TEXT NOT NULL REFERENCES app_user(user_id),
  role       TEXT NOT NULL CHECK (role IN ('creator', 'member')),
  muted      INTEGER NOT NULL DEFAULT 0 CHECK (muted IN (0, 1)),
  joined_at  TEXT NOT NULL,
  left_at    TEXT,
  PRIMARY KEY (pod_id, user_id)
) STRICT;

-- Defence in depth for the 8-person ceiling. Pending invitations and links
-- also hold places; that wider count is enforced in application code (US-004).
CREATE TRIGGER pod_membership_max_eight BEFORE INSERT ON pod_membership
WHEN (SELECT count(*) FROM pod_membership
      WHERE pod_id = NEW.pod_id AND left_at IS NULL) >= 8
BEGIN SELECT RAISE(ABORT, 'pod_full'); END;

CREATE TABLE pod_invitation (
  invitation_id    TEXT PRIMARY KEY,
  pod_id           TEXT NOT NULL REFERENCES pod(pod_id),
  invitee_user_id  TEXT NOT NULL REFERENCES app_user(user_id),
  invited_by       TEXT NOT NULL REFERENCES app_user(user_id),
  status           TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  created_at       TEXT NOT NULL,
  resolved_at      TEXT
) STRICT;
CREATE UNIQUE INDEX pod_invitation_one_pending
  ON pod_invitation (pod_id, invitee_user_id) WHERE status = 'pending';

CREATE TABLE invite_link (
  invite_link_id  TEXT PRIMARY KEY,
  pod_id          TEXT NOT NULL REFERENCES pod(pod_id),
  token_digest    TEXT NOT NULL UNIQUE,
  created_by      TEXT NOT NULL REFERENCES app_user(user_id),
  created_at      TEXT NOT NULL,
  expires_at      TEXT NOT NULL,
  used_by         TEXT REFERENCES app_user(user_id),
  used_at         TEXT,
  revoked_at      TEXT,
  CHECK ((used_by IS NULL) = (used_at IS NULL))
) STRICT;

-- Single use: once a link is used, revoked or both, it cannot be used again
-- or "un-used".
CREATE TRIGGER invite_link_single_use BEFORE UPDATE OF used_by, used_at ON invite_link
WHEN OLD.used_at IS NOT NULL OR OLD.revoked_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'invite_link_used'); END;

CREATE TABLE rhythm_proposal (
  proposal_id  TEXT PRIMARY KEY,
  pod_id       TEXT NOT NULL REFERENCES pod(pod_id),
  cadence      TEXT NOT NULL CHECK (cadence IN ('weekly', 'every_two_weeks', 'monthly')),
  proposed_by  TEXT NOT NULL REFERENCES app_user(user_id),
  status       TEXT NOT NULL CHECK (status IN ('open', 'agreed', 'superseded')),
  created_at   TEXT NOT NULL
) STRICT;

CREATE TABLE rhythm_acceptance (
  proposal_id  TEXT NOT NULL REFERENCES rhythm_proposal(proposal_id),
  user_id      TEXT NOT NULL REFERENCES app_user(user_id),
  accepted_at  TEXT NOT NULL,
  PRIMARY KEY (proposal_id, user_id)
) STRICT;

CREATE TABLE group_activity (
  activity_id  TEXT PRIMARY KEY,
  pod_id       TEXT NOT NULL REFERENCES pod(pod_id),
  label        TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 80),
  added_by     TEXT NOT NULL REFERENCES app_user(user_id),
  created_at   TEXT NOT NULL
) STRICT;

-- chat ---------------------------------------------------------------------
CREATE TABLE pod_message (
  message_id         TEXT PRIMARY KEY,
  pod_id             TEXT NOT NULL REFERENCES pod(pod_id),
  author_kind        TEXT NOT NULL CHECK (author_kind IN ('member', 'planner')),
  author_user_id     TEXT REFERENCES app_user(user_id),
  kind               TEXT NOT NULL CHECK (kind IN ('text', 'card')),
  body               TEXT CHECK (body IS NULL OR length(body) BETWEEN 1 AND 2000),
  card_type          TEXT CHECK (card_type IN ('activity_shortlist', 'time_poll', 'ready_check',
                       'booking_confirmation', 'payer_and_split', 'event_suggestion', 'planner_offer')),
  card_hangout_id    TEXT,
  card_poll_id       TEXT,
  card_event_id      TEXT,
  card_offer         TEXT CHECK (card_offer IN ('widen_window', 'widen_area', 'next_best')),
  client_message_id  TEXT,
  sent_at            TEXT NOT NULL,
  CHECK ((author_kind = 'member') = (author_user_id IS NOT NULL)),
  CHECK ((kind = 'text') = (body IS NOT NULL AND card_type IS NULL)),
  CHECK ((kind = 'card') = (card_type IS NOT NULL AND body IS NULL))
) STRICT;
CREATE INDEX pod_message_page ON pod_message (pod_id, sent_at DESC, message_id DESC);
CREATE UNIQUE INDEX pod_message_dedupe
  ON pod_message (pod_id, author_user_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

-- The private planner chat has no pod column on purpose.
CREATE TABLE planner_chat_message (
  message_id         TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES app_user(user_id),
  author             TEXT NOT NULL CHECK (author IN ('me', 'planner')),
  kind               TEXT NOT NULL CHECK (kind IN ('text', 'stretch_ask', 'reminder', 'limit_suggestion')),
  body               TEXT CHECK (body IS NULL OR length(body) BETWEEN 1 AND 2000),
  stretch_ask_id     TEXT,
  reminder_key       TEXT CHECK (reminder_key IN ('booking_confirmation_needed', 'balance_owed',
                       'poll_closing', 'ready_check_open')),
  sealed_suggestion  BLOB,
  client_message_id  TEXT,
  sent_at            TEXT NOT NULL
) STRICT;
CREATE UNIQUE INDEX planner_chat_dedupe
  ON planner_chat_message (user_id, client_message_id) WHERE client_message_id IS NOT NULL;

-- hangouts -----------------------------------------------------------------
CREATE TABLE hangout (
  hangout_id          TEXT PRIMARY KEY,
  pod_id              TEXT NOT NULL REFERENCES pod(pod_id),
  state               TEXT NOT NULL CHECK (state IN (${sqlList(HANGOUT_STATES)})),
  version             INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  chosen_option_id    TEXT,
  chosen_slot_id      TEXT,
  payer_user_id       TEXT REFERENCES app_user(user_id),
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
) STRICT;
CREATE INDEX hangout_by_pod ON hangout (pod_id, created_at);

-- Every state change, append-only, so the current state is auditable.
CREATE TABLE hangout_transition (
  hangout_id  TEXT NOT NULL REFERENCES hangout(hangout_id),
  seq         INTEGER NOT NULL CHECK (seq >= 1),
  from_state  TEXT CHECK (from_state IN (${sqlList(HANGOUT_STATES)})),
  to_state    TEXT NOT NULL CHECK (to_state IN (${sqlList(HANGOUT_STATES)})),
  event       TEXT NOT NULL CHECK (length(event) BETWEEN 1 AND 60),
  actor_user_id TEXT REFERENCES app_user(user_id),
  at          TEXT NOT NULL,
  PRIMARY KEY (hangout_id, seq)
) STRICT;
${appendOnly('hangout_transition')}

CREATE TABLE stretch_ask (
  stretch_ask_id        TEXT PRIMARY KEY,
  hangout_id            TEXT NOT NULL REFERENCES hangout(hangout_id),
  user_id               TEXT NOT NULL REFERENCES app_user(user_id),
  option_title          TEXT NOT NULL,
  per_person_cost_cents INTEGER NOT NULL CHECK (per_person_cost_cents >= 0),
  deadline              TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  answered_at           TEXT
) STRICT;

CREATE TABLE shortlist_option (
  option_id                  TEXT PRIMARY KEY,
  hangout_id                 TEXT NOT NULL REFERENCES hangout(hangout_id),
  title                      TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  venue_or_organizer         TEXT NOT NULL CHECK (length(venue_or_organizer) BETWEEN 1 AND 120),
  starts_at                  TEXT,
  per_person_estimate_cents  INTEGER NOT NULL CHECK (per_person_estimate_cents >= 0),
  event_id                   TEXT,
  synthetic                  INTEGER NOT NULL CHECK (synthetic = 1)
) STRICT;

CREATE TABLE time_slot (
  slot_id     TEXT PRIMARY KEY,
  hangout_id  TEXT NOT NULL REFERENCES hangout(hangout_id),
  starts_at   TEXT NOT NULL,
  ends_at     TEXT NOT NULL,
  CHECK (ends_at > starts_at)
) STRICT;

CREATE TABLE poll (
  poll_id        TEXT PRIMARY KEY,
  hangout_id     TEXT NOT NULL REFERENCES hangout(hangout_id),
  kind           TEXT NOT NULL CHECK (kind IN ('activity', 'time')),
  status         TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  closes_at      TEXT NOT NULL,
  extended_once  INTEGER NOT NULL DEFAULT 0 CHECK (extended_once IN (0, 1)),
  winner_option_id TEXT,
  UNIQUE (hangout_id, kind)
) STRICT;

CREATE TABLE poll_option (
  poll_option_id      TEXT PRIMARY KEY,
  poll_id             TEXT NOT NULL REFERENCES poll(poll_id),
  shortlist_option_id TEXT REFERENCES shortlist_option(option_id),
  slot_id             TEXT REFERENCES time_slot(slot_id),
  CHECK ((shortlist_option_id IS NULL) <> (slot_id IS NULL))
) STRICT;

-- Single choice per member per poll; changing a vote replaces the row.
CREATE TABLE poll_vote (
  poll_id         TEXT NOT NULL REFERENCES poll(poll_id),
  user_id         TEXT NOT NULL REFERENCES app_user(user_id),
  poll_option_id  TEXT NOT NULL REFERENCES poll_option(poll_option_id),
  voted_at        TEXT NOT NULL,
  PRIMARY KEY (poll_id, user_id)
) STRICT;

CREATE TABLE ready_answer (
  hangout_id   TEXT NOT NULL REFERENCES hangout(hangout_id),
  user_id      TEXT NOT NULL REFERENCES app_user(user_id),
  answer       TEXT NOT NULL CHECK (answer IN ('yes', 'no')),
  answered_at  TEXT NOT NULL,
  PRIMARY KEY (hangout_id, user_id)
) STRICT;

CREATE TABLE booking (
  hangout_id             TEXT PRIMARY KEY REFERENCES hangout(hangout_id),
  status                 TEXT NOT NULL CHECK (status IN ('awaiting_confirmation', 'booking', 'booked', 'failed')),
  party_size             INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 8),
  starts_at              TEXT NOT NULL,
  estimated_total_cents  INTEGER NOT NULL CHECK (estimated_total_cents >= 0),
  simulated              INTEGER NOT NULL CHECK (simulated = 1),
  confirmed_by           TEXT REFERENCES app_user(user_id),
  confirmed_at           TEXT
) STRICT;

CREATE TABLE hangout_rating (
  hangout_id  TEXT NOT NULL REFERENCES hangout(hangout_id),
  user_id     TEXT NOT NULL REFERENCES app_user(user_id),
  rating      TEXT NOT NULL CHECK (rating IN ('loved_it', 'fine', 'not_for_me')),
  rated_at    TEXT NOT NULL,
  PRIMARY KEY (hangout_id, user_id)
) STRICT;

-- money --------------------------------------------------------------------
-- The split records what the payer confirmed. It holds no balance: shares are
-- written as ledger entries the moment the payer confirms.
CREATE TABLE split (
  hangout_id      TEXT PRIMARY KEY REFERENCES hangout(hangout_id),
  payer_user_id   TEXT NOT NULL REFERENCES app_user(user_id),
  estimate_cents  INTEGER NOT NULL CHECK (estimate_cents >= 0),
  confirmed_at    TEXT NOT NULL
) STRICT;
${appendOnly('split')}

-- Each final amount the payer enters after the event. The newest row is the
-- current actual total; balances move by appended adjustment entries.
CREATE TABLE split_actual_total (
  hangout_id          TEXT NOT NULL REFERENCES split(hangout_id),
  seq                 INTEGER NOT NULL CHECK (seq >= 1),
  actual_total_cents  INTEGER NOT NULL CHECK (actual_total_cents >= 0),
  entered_at          TEXT NOT NULL,
  PRIMARY KEY (hangout_id, seq)
) STRICT;
${appendOnly('split_actual_total')}

CREATE TABLE settlement_payment (
  payment_id         TEXT PRIMARY KEY,
  hangout_id         TEXT NOT NULL REFERENCES hangout(hangout_id),
  debtor_user_id     TEXT NOT NULL REFERENCES app_user(user_id),
  creditor_user_id   TEXT NOT NULL REFERENCES app_user(user_id),
  amount_cents       INTEGER NOT NULL CHECK (amount_cents > 0),
  environment        TEXT NOT NULL CHECK (environment = 'sandbox'),
  provider_order_ref TEXT UNIQUE,
  idempotency_key    TEXT NOT NULL,
  created_at         TEXT NOT NULL,
  CHECK (debtor_user_id <> creditor_user_id),
  UNIQUE (debtor_user_id, idempotency_key)
) STRICT;
${appendOnly('settlement_payment')}

-- Verified provider events, deduplicated by id. A row exists only after the
-- signature check passed.
CREATE TABLE provider_event (
  provider_event_id   TEXT PRIMARY KEY,
  event_type          TEXT NOT NULL,
  signature_verified  INTEGER NOT NULL CHECK (signature_verified = 1),
  received_at         TEXT NOT NULL
) STRICT;
${appendOnly('provider_event')}

-- The only place money is recorded. Signed integer cents, owed by the debtor
-- to the creditor for one hangout. Balances are sums over these rows.
CREATE TABLE ledger_entry (
  entry_id           TEXT PRIMARY KEY,
  seq                INTEGER NOT NULL UNIQUE CHECK (seq >= 1),
  hangout_id         TEXT NOT NULL REFERENCES hangout(hangout_id),
  debtor_user_id     TEXT NOT NULL REFERENCES app_user(user_id),
  creditor_user_id   TEXT NOT NULL REFERENCES app_user(user_id),
  kind               TEXT NOT NULL CHECK (kind IN (${sqlList(LEDGER_KINDS)})),
  amount_cents       INTEGER NOT NULL,
  payment_id         TEXT REFERENCES settlement_payment(payment_id),
  provider_event_id  TEXT REFERENCES provider_event(provider_event_id),
  synthetic          INTEGER NOT NULL CHECK (synthetic IN (0, 1)),
  created_at         TEXT NOT NULL,
  CHECK (debtor_user_id <> creditor_user_id),
  CHECK (kind = 'adjustment' OR amount_cents > 0),
  CHECK (kind NOT IN ('payment_captured', 'payment_failed') OR provider_event_id IS NOT NULL OR synthetic = 1),
  CHECK (kind NOT IN ('payment_initiated', 'payment_captured', 'payment_failed') OR payment_id IS NOT NULL),
  UNIQUE (provider_event_id, kind)
) STRICT;
CREATE INDEX ledger_by_debtor ON ledger_entry (debtor_user_id, hangout_id);
CREATE INDEX ledger_by_creditor ON ledger_entry (creditor_user_id, hangout_id);
${appendOnly('ledger_entry')}

CREATE TABLE idempotency_record (
  actor_user_id  TEXT NOT NULL,
  operation      TEXT NOT NULL,
  key            TEXT NOT NULL CHECK (length(key) BETWEEN 8 AND 128),
  target         TEXT NOT NULL,
  body_digest    TEXT NOT NULL,
  status_code    INTEGER NOT NULL,
  response_json  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  PRIMARY KEY (actor_user_id, operation, key)
) STRICT;
${appendOnly('idempotency_record')}

-- Only the link: never bank or card numbers, never a balance.
CREATE TABLE paypal_link (
  user_id               TEXT PRIMARY KEY REFERENCES app_user(user_id),
  status                TEXT NOT NULL CHECK (status IN ('linking', 'linked', 'needs_attention')),
  environment           TEXT NOT NULL CHECK (environment = 'sandbox'),
  provider_account_ref  TEXT,
  linked_at             TEXT
) STRICT;

-- calendar: consent and links only, never event titles or details ----------
CREATE TABLE calendar_account (
  calendar_account_id  TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES app_user(user_id),
  provider             TEXT NOT NULL CHECK (provider = 'google'),
  status               TEXT NOT NULL CHECK (status IN ('connected', 'needs_reconnect')),
  credential_ref       TEXT NOT NULL,
  created_at           TEXT NOT NULL
) STRICT;

CREATE TABLE calendar_consent (
  calendar_account_id  TEXT NOT NULL REFERENCES calendar_account(calendar_account_id),
  calendar_id          TEXT NOT NULL,
  name                 TEXT NOT NULL,
  planner_may_read     INTEGER NOT NULL DEFAULT 0 CHECK (planner_may_read IN (0, 1)),
  PRIMARY KEY (calendar_account_id, calendar_id)
) STRICT;

CREATE TABLE calendar_write (
  hangout_id          TEXT NOT NULL REFERENCES hangout(hangout_id),
  user_id             TEXT NOT NULL REFERENCES app_user(user_id),
  provider_event_ref  TEXT NOT NULL,
  written_at          TEXT NOT NULL,
  PRIMARY KEY (hangout_id, user_id)
) STRICT;

-- subscription: receipts are append-only; plan status is derived ------------
CREATE TABLE subscription_receipt (
  receipt_id               TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES app_user(user_id),
  store                    TEXT NOT NULL CHECK (store IN ('apple_app_store', 'google_play')),
  environment              TEXT NOT NULL CHECK (environment = 'sandbox'),
  receipt_digest           TEXT NOT NULL UNIQUE,
  original_transaction_ref TEXT NOT NULL,
  price_cents              INTEGER NOT NULL CHECK (price_cents = 1500),
  verified_at              TEXT NOT NULL,
  expires_at               TEXT NOT NULL
) STRICT;
${appendOnly('subscription_receipt')}

-- events, notifications ----------------------------------------------------
CREATE TABLE saved_event (
  user_id   TEXT NOT NULL REFERENCES app_user(user_id),
  event_id  TEXT NOT NULL,
  saved_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, event_id)
) STRICT;

CREATE TABLE notification_settings (
  user_id       TEXT PRIMARY KEY REFERENCES app_user(user_id),
  polls         INTEGER NOT NULL CHECK (polls IN (0, 1)),
  reminders     INTEGER NOT NULL CHECK (reminders IN (0, 1)),
  private_asks  INTEGER NOT NULL CHECK (private_asks IN (0, 1)),
  money         INTEGER NOT NULL CHECK (money IN (0, 1)),
  updated_at    TEXT NOT NULL
) STRICT;

CREATE TABLE push_token (
  push_token_id  TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES app_user(user_id),
  platform       TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  token          TEXT NOT NULL UNIQUE,
  created_at     TEXT NOT NULL
) STRICT;
`,
  },
]);
