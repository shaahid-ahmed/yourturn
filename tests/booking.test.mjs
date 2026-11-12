// US-012: booking confirmation (payer only, bound to the estimate), the
// simulated booking and its label, BOOKING_FAILED → next-best offer, calendar
// blocking after BOOKED, and private reminders until someone confirms.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import {
  SIMULATED_LABEL,
  REMINDER_INTERVAL_MS,
  MAX_REMINDERS,
  SEEDED_VENUE_BOOKER,
  getBooking,
  volunteerAsPayer,
  confirmBooking,
  runBookingJobs,
} from '../services/api/src/booking.mjs';

const AT = '2026-11-14T12:00:00.000Z';
/** @param {number} hours */
const later = (hours) =>
  new Date(Date.parse(AT) + hours * 3600_000).toISOString();

/**
 * Pod p-a: u-1..u-4 joined; u-5 is outside the pod. Hangout h-1 has reached
 * AWAITING_CONFIRMATION: u-1 and u-2 said yes, u-3 said no, u-4 did not answer.
 * Only u-1 has linked PayPal. The chosen option is seeded catalog event evt-001.
 *
 * @param {{ eventId?: string | null }} [options]
 */
function setup({ eventId = 'evt-001' } = {}) {
  const db = openDatabase(':memory:');
  migrate(db);
  const user = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  for (const i of [1, 2, 3, 4, 5])
    user.run(`u-${i}`, `Synth${i}`, `+155509000${i}`, AT);
  db.prepare(
    "INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES ('p-a', 'Synthetic pod', 'u-1', ?)",
  ).run(AT);
  const member = db.prepare(
    "INSERT INTO pod_membership (pod_id, user_id, role, muted, joined_at) VALUES ('p-a', ?, ?, 0, ?)",
  );
  for (const i of [1, 2, 3, 4])
    member.run(`u-${i}`, i === 1 ? 'creator' : 'member', AT);
  db.prepare(
    "INSERT INTO paypal_link (user_id, status, environment, provider_account_ref, linked_at) VALUES ('u-1', 'linked', 'sandbox', 'sbx-ref-1', ?)",
  ).run(AT);
  db.prepare(
    "INSERT INTO hangout (hangout_id, pod_id, state, version, created_at, updated_at) VALUES ('h-1', 'p-a', 'AWAITING_CONFIRMATION', 1, ?, ?)",
  ).run(AT, AT);
  db.prepare(
    "INSERT INTO hangout_transition (hangout_id, seq, from_state, to_state, event, actor_user_id, at) VALUES ('h-1', 1, 'READY_CHECK', 'AWAITING_CONFIRMATION', 'readyCheckClosedWithYes', NULL, ?)",
  ).run(AT);
  db.prepare(
    "INSERT INTO shortlist_option (option_id, hangout_id, title, venue_or_organizer, per_person_estimate_cents, event_id, synthetic) VALUES ('o-1', 'h-1', 'Open Bowl Night', 'Brooklyn Bowl', 3500, ?, 1)",
  ).run(eventId);
  db.prepare(
    "INSERT INTO time_slot (slot_id, hangout_id, starts_at, ends_at) VALUES ('s-1', 'h-1', '2026-11-21T00:00:00.000Z', '2026-11-21T03:00:00.000Z')",
  ).run();
  db.prepare(
    "UPDATE hangout SET chosen_option_id = 'o-1', chosen_slot_id = 's-1' WHERE hangout_id = 'h-1'",
  ).run();
  const answer = db.prepare(
    "INSERT INTO ready_answer (hangout_id, user_id, answer, answered_at) VALUES ('h-1', ?, ?, ?)",
  );
  answer.run('u-1', 'yes', AT);
  answer.run('u-2', 'yes', AT);
  answer.run('u-3', 'no', AT);
  /** @type {any[]} */
  const pushes = [];
  const push = { enqueue: (/** @type {any} */ p) => pushes.push(p) };
  return { db, push, pushes };
}

/** @param {() => unknown} fn @param {string} code */
function rejectsWith(fn, code) {
  assert.throws(
    fn,
    (/** @type {any} */ e) => e.code === code,
    `expected ${code}`,
  );
}

/** @param {import('node:sqlite').DatabaseSync} db */
const state = (db) =>
  String(
    /** @type {any} */ (
      db.prepare("SELECT state FROM hangout WHERE hangout_id = 'h-1'").get()
    ).state,
  );

/** @param {import('node:sqlite').DatabaseSync} db @param {string} cardType */
const cards = (db, cardType) =>
  db
    .prepare("SELECT * FROM pod_message WHERE pod_id = 'p-a' AND card_type = ?")
    .all(cardType);

test('the label is the contract’s, word for word', () => {
  const spec = JSON.parse(
    readFileSync('docs/03-architecture/openapi.json', 'utf8'),
  );
  assert.equal(
    SIMULATED_LABEL,
    spec.components.schemas.Booking.properties.simulatedLabel.const,
  );
});

test('after the ready check, one booking card opens: head count of yeses, estimate × head count', () => {
  const { db, push } = setup();
  const first = runBookingJobs(db, { at: AT, push });
  assert.deepEqual(first.cardsOpened, ['h-1']);
  assert.deepEqual(
    getBooking(db, { podId: 'p-a', hangoutId: 'h-1', userId: 'u-3' }),
    {
      status: 'awaiting_confirmation',
      partySize: 2,
      startsAt: '2026-11-21T00:00:00.000Z',
      estimatedTotalCents: 7000,
      simulated: true,
      simulatedLabel: SIMULATED_LABEL,
      confirmedBy: null,
      confirmedAt: null,
    },
  );
  assert.equal(cards(db, 'booking_confirmation').length, 1);
  // Running again opens nothing new.
  assert.deepEqual(runBookingJobs(db, { at: AT, push }).cardsOpened, []);
  assert.equal(cards(db, 'booking_confirmation').length, 1);
  assert.equal(state(db), 'AWAITING_CONFIRMATION');
  rejectsWith(
    () => getBooking(db, { podId: 'p-a', hangoutId: 'h-1', userId: 'u-5' }),
    'not_found',
  );
});

test('the payer volunteers: a yes-member with linked PayPal, first one wins', () => {
  const { db, push } = setup();
  runBookingJobs(db, { at: AT, push });
  const input = { podId: 'p-a', hangoutId: 'h-1', at: AT };
  rejectsWith(
    () => volunteerAsPayer(db, { ...input, userId: 'u-5' }),
    'not_found',
  );
  rejectsWith(
    () => volunteerAsPayer(db, { ...input, userId: 'u-3' }),
    'not_yes_member',
  );
  rejectsWith(
    () => volunteerAsPayer(db, { ...input, userId: 'u-2' }),
    'paypal_link_required',
  );
  assert.deepEqual(volunteerAsPayer(db, { ...input, userId: 'u-1' }), {
    payer: { userId: 'u-1', firstName: 'Synth1' },
  });
  assert.deepEqual(
    volunteerAsPayer(db, { ...input, userId: 'u-1' }).payer.userId,
    'u-1',
  );
  rejectsWith(
    () => volunteerAsPayer(db, { ...input, userId: 'u-2' }),
    'payer_already_chosen',
  );
});

test('nothing is booked until the payer confirms the estimate they saw', () => {
  const { db, push } = setup();
  runBookingJobs(db, { at: AT, push });
  const input = {
    podId: 'p-a',
    hangoutId: 'h-1',
    at: later(1),
    estimatedTotalCents: 7000,
  };
  // No payer yet.
  rejectsWith(
    () => confirmBooking(db, { ...input, userId: 'u-1' }),
    'wrong_hangout_state',
  );
  volunteerAsPayer(db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    userId: 'u-1',
    at: AT,
  });
  // Only the payer (Q-011.6 default).
  rejectsWith(
    () => confirmBooking(db, { ...input, userId: 'u-2' }),
    'not_payer',
  );
  rejectsWith(
    () => confirmBooking(db, { ...input, userId: 'u-5' }),
    'not_found',
  );
  // Bound to the estimate on the card.
  rejectsWith(
    () =>
      confirmBooking(db, {
        ...input,
        userId: 'u-1',
        estimatedTotalCents: 6000,
      }),
    'wrong_hangout_state',
  );
  rejectsWith(
    () =>
      confirmBooking(db, {
        ...input,
        userId: 'u-1',
        estimatedTotalCents: 70.5,
      }),
    'validation_failed',
  );
  assert.equal(state(db), 'AWAITING_CONFIRMATION');
  assert.equal(
    getBooking(db, { podId: 'p-a', hangoutId: 'h-1', userId: 'u-1' })?.status,
    'awaiting_confirmation',
  );

  const confirmed = confirmBooking(db, { ...input, userId: 'u-1' });
  assert.equal(confirmed.state, 'BOOKING');
  assert.equal(confirmed.booking?.status, 'booking');
  assert.deepEqual(confirmed.booking?.confirmedBy, {
    userId: 'u-1',
    firstName: 'Synth1',
  });
  // Confirming twice is refused, not repeated.
  rejectsWith(
    () => confirmBooking(db, { ...input, userId: 'u-1' }),
    'wrong_hangout_state',
  );
});

test('a confirmed booking is simulated, labelled, and blocked on yes-members’ calendars', () => {
  const { db, push } = setup();
  runBookingJobs(db, { at: AT, push });
  volunteerAsPayer(db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    userId: 'u-1',
    at: AT,
  });
  confirmBooking(db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    userId: 'u-1',
    estimatedTotalCents: 7000,
    at: AT,
  });
  for (const u of ['u-1', 'u-3']) {
    db.prepare(
      "INSERT INTO calendar_account (calendar_account_id, user_id, provider, status, credential_ref, created_at) VALUES (?, ?, 'google', 'connected', ?, ?)",
    ).run(`acct-${u}`, u, `cred-${u}`, AT);
    db.prepare(
      "INSERT INTO calendar_consent (calendar_account_id, calendar_id, name, planner_may_read) VALUES (?, 'primary', 'primary', 0)",
    ).run(`acct-${u}`);
  }
  /** @type {any[]} */
  const writes = [];
  const calendar = {
    authorizationUrl: () => '',
    exchangeCode: () => ({ credentialRef: '', calendars: [] }),
    freeBusy: () => [],
    insertEvent: (/** @type {any} */ e) => {
      writes.push(e);
      return 'evt-ref';
    },
    revoke: () => {},
  };
  const result = runBookingJobs(db, { at: later(1), push, calendar });
  assert.deepEqual(result.booked, ['h-1']);
  assert.equal(state(db), 'BOOKED');
  const booking = getBooking(db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    userId: 'u-2',
  });
  assert.equal(booking?.status, 'booked');
  assert.equal(booking?.simulated, true);
  assert.equal(booking?.simulatedLabel, SIMULATED_LABEL);
  // u-1 said yes and has a calendar; u-3 said no; u-2 has no calendar.
  assert.deepEqual(
    writes.map((w) => w.credentialRef),
    ['cred-u-1'],
  );
  // Running again books nothing twice.
  assert.deepEqual(
    runBookingJobs(db, { at: later(2), push, calendar }).booked,
    [],
  );
  assert.equal(writes.length, 1);
});

test('the default booker books only seeded catalog venues and contacts nobody', () => {
  assert.deepEqual(
    SEEDED_VENUE_BOOKER.book({
      eventId: 'evt-001',
      venue: 'x',
      partySize: 2,
      startsAt: AT,
    }),
    { ok: true },
  );
  assert.deepEqual(
    SEEDED_VENUE_BOOKER.book({
      eventId: 'evt-none',
      venue: 'x',
      partySize: 2,
      startsAt: AT,
    }),
    { ok: false },
  );
  assert.deepEqual(
    SEEDED_VENUE_BOOKER.book({
      eventId: null,
      venue: 'x',
      partySize: 2,
      startsAt: AT,
    }),
    { ok: false },
  );
});

test('a failed booking says so and offers the next-best plan, with no reason', () => {
  for (const variant of ['unseeded venue', 'booker throws']) {
    const { db, push } = setup({
      eventId: variant === 'unseeded venue' ? 'evt-not-in-catalog' : 'evt-001',
    });
    runBookingJobs(db, { at: AT, push });
    volunteerAsPayer(db, {
      podId: 'p-a',
      hangoutId: 'h-1',
      userId: 'u-1',
      at: AT,
    });
    confirmBooking(db, {
      podId: 'p-a',
      hangoutId: 'h-1',
      userId: 'u-1',
      estimatedTotalCents: 7000,
      at: AT,
    });
    const booker =
      variant === 'booker throws'
        ? {
            book: () => {
              throw new Error('venue timeout');
            },
          }
        : undefined;
    const result = runBookingJobs(db, {
      at: later(1),
      push,
      ...(booker ? { booker } : {}),
    });
    assert.deepEqual(result.failed, ['h-1'], variant);
    assert.equal(state(db), 'BOOKING_FAILED');
    assert.equal(
      getBooking(db, { podId: 'p-a', hangoutId: 'h-1', userId: 'u-1' })?.status,
      'failed',
    );
    const offers = /** @type {any[]} */ (cards(db, 'planner_offer'));
    assert.equal(offers.length, 1);
    assert.equal(offers[0].card_offer, 'next_best');
    assert.equal(offers[0].body, null, 'the offer carries no explanation');
  }
});

test('reminders until confirmed: private, at most once per interval, capped', () => {
  const { db, push, pushes } = setup();
  runBookingJobs(db, { at: AT, push });
  const podMessagesBefore = db
    .prepare("SELECT count(*) AS n FROM pod_message WHERE pod_id = 'p-a'")
    .get();
  const interval = REMINDER_INTERVAL_MS / 3600_000;
  // The card is the first ask: no reminder before one interval has passed.
  assert.deepEqual(runBookingJobs(db, { at: later(1), push }).reminders, []);
  // No payer yet: each yes-member who could pay (u-1 has PayPal; u-2 does not).
  let sent = runBookingJobs(db, { at: later(interval + 1), push }).reminders;
  assert.deepEqual(sent, [{ userId: 'u-1', refId: 'h-1#1' }]);
  assert.deepEqual(
    runBookingJobs(db, { at: later(interval + 2), push }).reminders,
    [],
    'once per interval',
  );
  // Once someone volunteers, only the payer is reminded.
  volunteerAsPayer(db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    userId: 'u-1',
    at: later(interval + 3),
  });
  sent = runBookingJobs(db, { at: later(2 * interval + 1), push }).reminders;
  assert.deepEqual(sent, [{ userId: 'u-1', refId: 'h-1#2' }]);
  runBookingJobs(db, { at: later(3 * interval + 1), push });
  assert.deepEqual(
    runBookingJobs(db, { at: later((MAX_REMINDERS + 1) * interval + 1), push })
      .reminders,
    [],
    'capped',
  );
  // Private: planner chat only, never pod chat.
  const privateReminders = db
    .prepare(
      "SELECT user_id FROM planner_chat_message WHERE reminder_key = 'booking_confirmation_needed'",
    )
    .all()
    .map((r) => r.user_id);
  assert.deepEqual(privateReminders, ['u-1', 'u-1', 'u-1']);
  assert.deepEqual(
    db
      .prepare("SELECT count(*) AS n FROM pod_message WHERE pod_id = 'p-a'")
      .get(),
    podMessagesBefore,
  );
  const reminderPushes = pushes.filter((p) => p.kind === 'private_reminder');
  assert.equal(reminderPushes.length, 3);
  assert.ok(reminderPushes.every((p) => p.userId === 'u-1' && !('podId' in p)));
  // Confirmed: no more reminders.
  confirmBooking(db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    userId: 'u-1',
    estimatedTotalCents: 7000,
    at: later(70),
  });
  assert.deepEqual(runBookingJobs(db, { at: later(71), push }).reminders, []);
});

test('migration 3 keeps the reminder log append-only', () => {
  const { db, push } = setup();
  runBookingJobs(db, { at: AT, push });
  assert.equal(runBookingJobs(db, { at: later(25), push }).reminders.length, 1);
  assert.throws(
    () => db.prepare('UPDATE reminder_sent SET sent_at = sent_at').run(),
    /append-only/,
  );
  assert.throws(
    () => db.prepare('DELETE FROM reminder_sent').run(),
    /append-only/,
  );
});

test('US-016: the payer can only volunteer once the plan awaits confirmation', () => {
  const { db } = setup();
  db.prepare(
    "UPDATE hangout SET state = 'PLANNING', updated_at = ? WHERE hangout_id = 'h-1'",
  ).run(AT);
  rejectsWith(
    () =>
      volunteerAsPayer(db, {
        podId: 'p-a',
        hangoutId: 'h-1',
        userId: 'u-1',
        at: AT,
      }),
    'wrong_hangout_state',
  );
});
