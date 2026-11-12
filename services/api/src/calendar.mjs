/**
 * Calendar integration (US-011), over the US-002 schema and the US-001
 * contract (`listOwnCalendarAccounts`, `startCalendarConnect`,
 * `disconnectCalendarAccount`, `setPlannerCalendarAccess`, `getOwnCalendar`,
 * `addEventToOwnCalendar`), plus the two server-side uses the spec names: the
 * planner reading free/busy to find slots (P10), and blocking a booked
 * hangout on calendars (P12).
 *
 * Rules:
 * - **Free/busy only.** The provider port can return busy intervals and
 *   nothing else: no titles, attendees, locations or descriptions are read,
 *   stored or returned. The OAuth scopes are exactly `freebusy.read` and
 *   `events.write`.
 * - **Consent per calendar, off by default.** A newly connected calendar has
 *   `planner_may_read = 0`. The planner reads only calendars the member
 *   switched on.
 * - **No calendar content crosses members.** Everything under `/me` acts on the
 *   caller's own accounts (another member's account is `404`, the same as a
 *   missing one). The planner's pod check returns only which candidate slots
 *   fit everyone: never a member's busy times, never who was busy.
 * - **Writes only after booking, only for yes-members** (spec decision 9).
 *   Each (hangout, member) is written at most once.
 *
 * The Google Calendar API is a port. `NO_PROVIDER` refuses to connect, so
 * nothing reaches Google until a real adapter and OAuth client are configured.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { inTransaction } from './db/transaction.mjs';
import { PodError, newUlid } from './pods.mjs';
import { getEventDetail } from './catalog.mjs';

/** @typedef {import('node:sqlite').DatabaseSync} DatabaseSync */

export const SCOPES = Object.freeze(['freebusy.read', 'events.write']);
export const CONNECT_STATE_TTL_MS = 10 * 60 * 1000;
export const MAX_RANGE_MS = 62 * 24 * 60 * 60 * 1000;

/**
 * @typedef {object} Interval
 * @property {string} start ISO timestamp
 * @property {string} end ISO timestamp
 */

/**
 * What a calendar provider may do. `freeBusy` returns intervals only.
 *
 * @typedef {object} CalendarProvider
 * @property {(input: { state: string, scopes: readonly string[] }) => string} authorizationUrl
 * @property {(input: { code: string }) => { credentialRef: string, calendars: { calendarId: string, name: string }[] }} exchangeCode
 * @property {(input: { credentialRef: string, calendarIds: string[], from: string, to: string }) => Interval[]} freeBusy
 * @property {(input: { credentialRef: string, calendarId: string, summary: string, startsAt: string, endsAt: string }) => string} insertEvent
 *   returns the provider's event reference
 * @property {(input: { credentialRef: string }) => void} revoke
 */

/** Refuses everything: no calendar provider is configured. */
export const NO_PROVIDER = Object.freeze({
  authorizationUrl: () => {
    throw new PodError(
      'calendar_not_connected',
      'calendar connection is not configured in this environment',
    );
  },
  exchangeCode: () => {
    throw new PodError(
      'calendar_not_connected',
      'calendar connection is not configured in this environment',
    );
  },
  freeBusy: () => [],
  insertEvent: () => {
    throw new PodError('calendar_not_connected', 'no calendar provider');
  },
  revoke: () => {},
});

/** @param {string} at @param {number} ms */
const plus = (at, ms) => new Date(Date.parse(at) + ms).toISOString();

/** @param {string} start @param {string} end @param {Interval} busy */
const overlaps = (start, end, busy) =>
  Date.parse(busy.start) < Date.parse(end) &&
  Date.parse(start) < Date.parse(busy.end);

/**
 * @param {string} from @param {string} to
 */
function checkRange(from, to) {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    b <= a ||
    b - a > MAX_RANGE_MS
  )
    throw new PodError(
      'validation_failed',
      'from and to must be timestamps, from before to, at most 62 days apart',
      [{ field: 'from', problem: 'range' }],
    );
}

// ---------------------------------------------------------------- connect

/**
 * @param {string | Buffer} key @param {string} payload
 */
const sign = (key, payload) =>
  createHmac('sha256', key).update(payload).digest('base64url');

/**
 * Start connecting Google Calendar. The `state` binds the OAuth round trip to
 * this member and expires, so a callback cannot attach a calendar to someone
 * else.
 *
 * @param {{ userId: string, at: string, provider: CalendarProvider, stateKey: string | Buffer }} input
 * @returns {{ authorizationUrl: string, scopes: string[] }}
 */
export function startCalendarConnect({ userId, at, provider, stateKey }) {
  const payload = Buffer.from(
    JSON.stringify({
      u: userId,
      n: randomBytes(12).toString('base64url'),
      exp: plus(at, CONNECT_STATE_TTL_MS),
    }),
  ).toString('base64url');
  const state = `${payload}.${sign(stateKey, payload)}`;
  return {
    authorizationUrl: provider.authorizationUrl({ state, scopes: SCOPES }),
    scopes: [...SCOPES],
  };
}

/**
 * The OAuth callback (server-side; no contract route). Every calendar on the
 * account is recorded with planner access **off**.
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, code: string, state: string, at: string, provider: CalendarProvider,
 *   stateKey: string | Buffer, newId?: () => string }} input
 */
export function completeCalendarConnect(
  db,
  { userId, code, state, at, provider, stateKey, newId = () => newUlid() },
) {
  const [payload, signature] = String(state).split('.');
  const expected = Buffer.from(sign(stateKey, payload ?? ''), 'base64url');
  const given = Buffer.from(signature ?? '', 'base64url');
  /** @type {any} */
  let fields = null;
  if (given.length === expected.length && timingSafeEqual(given, expected))
    try {
      fields = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      fields = null;
    }
  if (
    !fields ||
    fields.u !== userId ||
    !(Date.parse(fields.exp) > Date.parse(at))
  )
    throw new PodError(
      'validation_failed',
      'the connect request is invalid or expired',
      [{ field: 'state', problem: 'invalid' }],
    );
  const { credentialRef, calendars } = provider.exchangeCode({ code });
  const calendarAccountId = newId();
  inTransaction(db, () => {
    db.prepare(
      "INSERT INTO calendar_account (calendar_account_id, user_id, provider, status, credential_ref, created_at) VALUES (?, ?, 'google', 'connected', ?, ?)",
    ).run(calendarAccountId, userId, credentialRef, at);
    const consent = db.prepare(
      'INSERT INTO calendar_consent (calendar_account_id, calendar_id, name, planner_may_read) VALUES (?, ?, ?, 0)',
    );
    for (const c of calendars)
      consent.run(calendarAccountId, c.calendarId, c.name);
  });
  return ownAccount(db, userId, calendarAccountId);
}

// ---------------------------------------------------------------- own accounts

/**
 * @param {DatabaseSync} db @param {string} userId @param {string} calendarAccountId
 */
function ownAccountRow(db, userId, calendarAccountId) {
  const row =
    /** @type {{ calendar_account_id: string, status: string, credential_ref: string } | undefined} */ (
      db
        .prepare(
          'SELECT calendar_account_id, status, credential_ref FROM calendar_account WHERE calendar_account_id = ? AND user_id = ?',
        )
        .get(calendarAccountId, userId)
    );
  // Another member's account is indistinguishable from a missing one.
  if (!row) throw new PodError('not_found', 'calendar account not found');
  return row;
}

/**
 * @param {DatabaseSync} db @param {string} userId @param {string} calendarAccountId
 */
function ownAccount(db, userId, calendarAccountId) {
  const row = ownAccountRow(db, userId, calendarAccountId);
  const calendars = db
    .prepare(
      'SELECT calendar_id, name, planner_may_read FROM calendar_consent WHERE calendar_account_id = ? ORDER BY name, calendar_id',
    )
    .all(calendarAccountId)
    .map((c) => ({
      calendarId: String(c.calendar_id),
      name: String(c.name),
      plannerMayRead: c.planner_may_read === 1,
    }));
  return {
    calendarAccountId: row.calendar_account_id,
    provider: /** @type {'google'} */ ('google'),
    status: /** @type {'connected' | 'needs_reconnect'} */ (row.status),
    calendars,
  };
}

/**
 * @param {DatabaseSync} db
 * @param {{ userId: string }} input
 */
export function listOwnCalendarAccounts(db, { userId }) {
  const ids = db
    .prepare(
      'SELECT calendar_account_id FROM calendar_account WHERE user_id = ? ORDER BY created_at, calendar_account_id',
    )
    .all(userId)
    .map((r) => String(r.calendar_account_id));
  return { accounts: ids.map((id) => ownAccount(db, userId, id)) };
}

/**
 * Per-calendar consent: may the planner read free/busy from this calendar?
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, calendarAccountId: string, calendarId: string, plannerMayRead: boolean }} input
 */
export function setPlannerCalendarAccess(
  db,
  { userId, calendarAccountId, calendarId, plannerMayRead },
) {
  if (typeof plannerMayRead !== 'boolean')
    throw new PodError(
      'validation_failed',
      'plannerMayRead must be a boolean',
      [{ field: 'plannerMayRead', problem: 'type' }],
    );
  ownAccountRow(db, userId, calendarAccountId);
  const changed = db
    .prepare(
      'UPDATE calendar_consent SET planner_may_read = ? WHERE calendar_account_id = ? AND calendar_id = ?',
    )
    .run(plannerMayRead ? 1 : 0, calendarAccountId, calendarId);
  if (changed.changes === 0)
    throw new PodError('not_found', 'calendar not found');
  return ownAccount(db, userId, calendarAccountId);
}

/**
 * Disconnect: revoke the credential and forget the account and its consents.
 * Receipts of events already written stay, so a hangout is never written twice.
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, calendarAccountId: string, provider: CalendarProvider }} input
 */
export function disconnectCalendarAccount(
  db,
  { userId, calendarAccountId, provider },
) {
  const row = ownAccountRow(db, userId, calendarAccountId);
  inTransaction(db, () => {
    db.prepare(
      'DELETE FROM calendar_consent WHERE calendar_account_id = ?',
    ).run(calendarAccountId);
    db.prepare(
      'DELETE FROM calendar_account WHERE calendar_account_id = ?',
    ).run(calendarAccountId);
  });
  provider.revoke({ credentialRef: row.credential_ref });
}

/**
 * Mark an account for reconnection when the provider rejects its credential.
 *
 * @param {DatabaseSync} db @param {string} calendarAccountId
 */
function needsReconnect(db, calendarAccountId) {
  db.prepare(
    "UPDATE calendar_account SET status = 'needs_reconnect' WHERE calendar_account_id = ?",
  ).run(calendarAccountId);
}

/**
 * Busy intervals from one member's own connected calendars.
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, from: string, to: string, provider: CalendarProvider, plannerOnly: boolean }} input
 * @returns {{ busy: Interval[], readable: boolean }} readable is false when no calendar could be read
 */
function busyFor(db, { userId, from, to, provider, plannerOnly }) {
  const accounts = db
    .prepare(
      "SELECT calendar_account_id, credential_ref FROM calendar_account WHERE user_id = ? AND status = 'connected'",
    )
    .all(userId);
  /** @type {Interval[]} */
  const busy = [];
  let readable = false;
  for (const account of accounts) {
    const calendarIds = db
      .prepare(
        `SELECT calendar_id FROM calendar_consent WHERE calendar_account_id = ?${plannerOnly ? ' AND planner_may_read = 1' : ''} ORDER BY calendar_id`,
      )
      .all(account.calendar_account_id)
      .map((c) => String(c.calendar_id));
    if (calendarIds.length === 0) continue;
    try {
      const intervals = provider.freeBusy({
        credentialRef: String(account.credential_ref),
        calendarIds,
        from,
        to,
      });
      // Keep only the two timestamps, whatever the adapter returned.
      for (const i of intervals) busy.push({ start: i.start, end: i.end });
      readable = true;
    } catch {
      needsReconnect(db, String(account.calendar_account_id));
    }
  }
  return { busy, readable };
}

// ---------------------------------------------------------------- planner use

/**
 * The planner's slot check (P10). For each candidate slot, does it fit every
 * joined member whose calendar the planner may read? Members with no readable
 * calendar are returned separately, so the planner can ask them privately for
 * times (spec: permissions table, "Calendar declined"). No member's busy times
 * and no "who was busy" leave this function.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, candidates: { startsAt: string, endsAt: string }[], provider: CalendarProvider }} input
 * @returns {{ fitting: { startsAt: string, endsAt: string }[], askPrivately: string[] }}
 */
export function slotsThatFitPod(db, { podId, candidates, provider }) {
  if (candidates.length === 0) return { fitting: [], askPrivately: [] };
  const from = candidates.map((c) => c.startsAt).sort()[0];
  const to =
    candidates
      .map((c) => c.endsAt)
      .sort()
      .at(-1) ?? from;
  checkRange(from, to);
  const members = db
    .prepare(
      'SELECT user_id FROM pod_membership WHERE pod_id = ? AND left_at IS NULL ORDER BY user_id',
    )
    .all(podId)
    .map((m) => String(m.user_id));
  /** @type {Interval[]} */
  const allBusy = [];
  /** @type {string[]} */
  const askPrivately = [];
  for (const userId of members) {
    const { busy, readable } = busyFor(db, {
      userId,
      from,
      to,
      provider,
      plannerOnly: true,
    });
    if (!readable) askPrivately.push(userId);
    allBusy.push(...busy);
  }
  const fitting = candidates.filter(
    (c) => !allBusy.some((b) => overlaps(c.startsAt, c.endsAt, b)),
  );
  return { fitting, askPrivately };
}

/**
 * Block a booked hangout on the calendars of the members who said yes
 * (spec decision 9). One write per (hangout, member), ever; members without a
 * connected calendar are skipped. Called after the booking succeeds.
 *
 * @param {DatabaseSync} db
 * @param {{ hangoutId: string, at: string, provider: CalendarProvider }} input
 * @returns {{ written: string[], skipped: string[] }} member ids
 */
export function blockBookedHangout(db, { hangoutId, at, provider }) {
  const hangout = /** @type {any} */ (
    db
      .prepare(
        `SELECT h.state, o.title, t.starts_at, t.ends_at
           FROM hangout h
           JOIN shortlist_option o ON o.option_id = h.chosen_option_id
           JOIN time_slot t ON t.slot_id = h.chosen_slot_id
          WHERE h.hangout_id = ?`,
      )
      .get(hangoutId)
  );
  if (!hangout || hangout.state !== 'BOOKED')
    throw new PodError(
      'wrong_hangout_state',
      'only a booked hangout is written to calendars',
    );
  const yes = db
    .prepare(
      "SELECT user_id FROM ready_answer WHERE hangout_id = ? AND answer = 'yes' ORDER BY user_id",
    )
    .all(hangoutId)
    .map((r) => String(r.user_id));
  /** @type {string[]} */
  const written = [];
  /** @type {string[]} */
  const skipped = [];
  for (const userId of yes) {
    const already = db
      .prepare(
        'SELECT 1 AS done FROM calendar_write WHERE hangout_id = ? AND user_id = ?',
      )
      .get(hangoutId, userId);
    if (already) continue;
    const target =
      /** @type {{ calendar_account_id: string, credential_ref: string, calendar_id: string } | undefined} */ (
        db
          .prepare(
            `SELECT a.calendar_account_id, a.credential_ref, c.calendar_id
             FROM calendar_account a JOIN calendar_consent c ON c.calendar_account_id = a.calendar_account_id
            WHERE a.user_id = ? AND a.status = 'connected'
            ORDER BY c.planner_may_read DESC, a.created_at, c.calendar_id LIMIT 1`,
          )
          .get(userId)
      );
    if (!target) {
      skipped.push(userId);
      continue;
    }
    try {
      const ref = provider.insertEvent({
        credentialRef: target.credential_ref,
        calendarId: target.calendar_id,
        summary: `Unspoken: ${hangout.title}`,
        startsAt: hangout.starts_at,
        endsAt: hangout.ends_at,
      });
      db.prepare(
        'INSERT INTO calendar_write (hangout_id, user_id, provider_event_ref, written_at) VALUES (?, ?, ?, ?)',
      ).run(hangoutId, userId, ref, at);
      written.push(userId);
    } catch {
      needsReconnect(db, target.calendar_account_id);
      skipped.push(userId);
    }
  }
  return { written, skipped };
}

// ---------------------------------------------------------------- own view

/**
 * P18: the caller's own week or month. Busy blocks from their own connected
 * calendars (no titles) and their booked Unspoken hangouts.
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, from: string, to: string, provider: CalendarProvider }} input
 */
export function getOwnCalendar(db, { userId, from, to, provider }) {
  checkRange(from, to);
  const { busy } = busyFor(db, {
    userId,
    from,
    to,
    provider,
    plannerOnly: false,
  });
  /** @type {{ kind: 'busy' | 'hangout', startsAt: string, endsAt: string, hangoutId?: string, podName?: string }[]} */
  const items = busy
    .filter((b) => overlaps(from, to, b))
    .map((b) => ({ kind: 'busy', startsAt: b.start, endsAt: b.end }));
  for (const h of db
    .prepare(
      `SELECT h.hangout_id, p.name, t.starts_at, t.ends_at
         FROM hangout h
         JOIN pod p ON p.pod_id = h.pod_id
         JOIN pod_membership m ON m.pod_id = h.pod_id AND m.user_id = ? AND m.left_at IS NULL
         JOIN ready_answer r ON r.hangout_id = h.hangout_id AND r.user_id = m.user_id AND r.answer = 'yes'
         JOIN time_slot t ON t.slot_id = h.chosen_slot_id
        WHERE h.state IN ('BOOKED', 'BALANCES_OPEN', 'SETTLED')
          AND t.starts_at < ? AND t.ends_at > ?`,
    )
    .all(userId, to, from))
    items.push({
      kind: 'hangout',
      startsAt: String(h.starts_at),
      endsAt: String(h.ends_at),
      hangoutId: String(h.hangout_id),
      podName: String(h.name),
    });
  items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return { from, to, items };
}

/**
 * P17 "Add to calendar": a catalog event onto the caller's own calendar.
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, eventId: string, provider: CalendarProvider }} input
 */
export function addEventToOwnCalendar(db, { userId, eventId, provider }) {
  const event = getEventDetail(eventId);
  if (!event) throw new PodError('not_found', 'event not found');
  const target =
    /** @type {{ calendar_account_id: string, credential_ref: string, calendar_id: string } | undefined} */ (
      db
        .prepare(
          `SELECT a.calendar_account_id, a.credential_ref, c.calendar_id
           FROM calendar_account a JOIN calendar_consent c ON c.calendar_account_id = a.calendar_account_id
          WHERE a.user_id = ? AND a.status = 'connected'
          ORDER BY c.planner_may_read DESC, a.created_at, c.calendar_id LIMIT 1`,
        )
        .get(userId)
    );
  if (!target)
    throw new PodError('calendar_not_connected', 'connect a calendar first');
  provider.insertEvent({
    credentialRef: target.credential_ref,
    calendarId: target.calendar_id,
    summary: String(event.title),
    startsAt: new Date(Date.parse(event.startsAt)).toISOString(),
    endsAt: new Date(Date.parse(event.endsAt)).toISOString(),
  });
}
