// US-011: Google Calendar connect, free/busy only, per-calendar consent,
// event writes after booking, and no calendar content across members.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import {
  SCOPES,
  NO_PROVIDER,
  startCalendarConnect,
  completeCalendarConnect,
  listOwnCalendarAccounts,
  setPlannerCalendarAccess,
  disconnectCalendarAccount,
  slotsThatFitPod,
  blockBookedHangout,
  getOwnCalendar,
  addEventToOwnCalendar,
} from '../services/api/src/calendar.mjs';

const AT = '2026-11-12T12:00:00.000Z';
const KEY = 'synthetic-oauth-state-key';

/**
 * A fake Google: each credential has calendars with busy blocks that carry a
 * private title, so tests can prove the title never comes out.
 */
function fakeProvider() {
  /** @type {any[]} */
  const calls = [];
  /** @type {Record<string, Record<string, { start: string, end: string, title: string }[]>>} */
  const busy = {
    'cred-u-1': {
      'u1-work': [
        {
          start: '2026-11-20T23:00:00.000Z',
          end: '2026-11-21T01:00:00.000Z',
          title: 'Therapy',
        },
      ],
      'u1-personal': [
        {
          start: '2026-11-21T23:00:00.000Z',
          end: '2026-11-22T01:00:00.000Z',
          title: 'Date night',
        },
      ],
    },
    'cred-u-2': {
      'u2-main': [
        {
          start: '2026-11-22T23:00:00.000Z',
          end: '2026-11-23T01:00:00.000Z',
          title: 'Hospital',
        },
      ],
    },
  };
  return {
    calls,
    provider: {
      authorizationUrl: (/** @type {any} */ i) => {
        calls.push(['authorizationUrl', i]);
        return `https://accounts.example.test/o/oauth2?state=${i.state}`;
      },
      exchangeCode: (/** @type {any} */ { code }) => {
        calls.push(['exchangeCode', code]);
        const user = code.replace('code-', '');
        return {
          credentialRef: `cred-${user}`,
          calendars: Object.keys(busy[`cred-${user}`] ?? {}).map((id) => ({
            calendarId: id,
            name: id,
          })),
        };
      },
      freeBusy: (/** @type {any} */ i) => {
        calls.push(['freeBusy', i]);
        if (i.credentialRef === 'cred-broken') throw new Error('invalid_grant');
        return i.calendarIds.flatMap(
          (/** @type {string} */ id) => busy[i.credentialRef]?.[id] ?? [],
        );
      },
      insertEvent: (/** @type {any} */ i) => {
        calls.push(['insertEvent', i]);
        return `evt-${i.credentialRef}`;
      },
      revoke: (/** @type {any} */ i) => calls.push(['revoke', i]),
    },
  };
}

function setup() {
  const db = openDatabase(':memory:');
  migrate(db);
  const user = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  for (const i of [1, 2, 3, 4])
    user.run(`u-${i}`, `Synth${i}`, `+155508000${i}`, AT);
  db.prepare(
    "INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES ('p-a', 'Synthetic pod', 'u-1', ?)",
  ).run(AT);
  const member = db.prepare(
    "INSERT INTO pod_membership (pod_id, user_id, role, muted, joined_at) VALUES ('p-a', ?, ?, 0, ?)",
  );
  for (const i of [1, 2, 3])
    member.run(`u-${i}`, i === 1 ? 'creator' : 'member', AT);
  const { provider, calls } = fakeProvider();
  /** @param {string} userId */
  const connect = (userId) => {
    let n = 0;
    const { authorizationUrl } = startCalendarConnect({
      userId,
      at: AT,
      provider,
      stateKey: KEY,
    });
    const state = decodeURIComponent(authorizationUrl.split('state=')[1]);
    return completeCalendarConnect(db, {
      userId,
      code: `code-${userId}`,
      state,
      at: AT,
      provider,
      stateKey: KEY,
      newId: () => `acct-${userId}-${++n}`,
    });
  };
  return { db, provider, calls, connect };
}

/** @param {() => unknown} fn @param {string} code */
function rejectsWith(fn, code) {
  assert.throws(
    fn,
    (/** @type {any} */ e) => e.code === code,
    `expected ${code}`,
  );
}

test('connect asks for free/busy and event writes only, and every calendar starts with planner access off', () => {
  const { db, calls, connect } = setup();
  const account = connect('u-1');
  assert.deepEqual(SCOPES, ['freebusy.read', 'events.write']);
  assert.deepEqual(calls[0][1].scopes, ['freebusy.read', 'events.write']);
  assert.equal(account.status, 'connected');
  assert.deepEqual(
    account.calendars.map((c) => [c.calendarId, c.plannerMayRead]),
    [
      ['u1-personal', false],
      ['u1-work', false],
    ],
  );
  assert.deepEqual(listOwnCalendarAccounts(db, { userId: 'u-1' }).accounts, [
    account,
  ]);
  assert.deepEqual(listOwnCalendarAccounts(db, { userId: 'u-2' }).accounts, []);
});

test('the OAuth state binds the callback to one member and expires', () => {
  const { db, provider } = setup();
  const { authorizationUrl } = startCalendarConnect({
    userId: 'u-1',
    at: AT,
    provider,
    stateKey: KEY,
  });
  const state = decodeURIComponent(authorizationUrl.split('state=')[1]);
  const base = { code: 'code-u-1', provider, stateKey: KEY };
  // Another member cannot complete u-1's connect.
  rejectsWith(
    () =>
      completeCalendarConnect(db, { ...base, userId: 'u-2', state, at: AT }),
    'validation_failed',
  );
  // Expired after ten minutes.
  rejectsWith(
    () =>
      completeCalendarConnect(db, {
        ...base,
        userId: 'u-1',
        state,
        at: '2026-11-12T12:11:00.000Z',
      }),
    'validation_failed',
  );
  // Tampered.
  rejectsWith(
    () =>
      completeCalendarConnect(db, {
        ...base,
        userId: 'u-1',
        state: `${state}x`,
        at: AT,
      }),
    'validation_failed',
  );
  rejectsWith(
    () =>
      completeCalendarConnect(db, {
        ...base,
        userId: 'u-1',
        state: 'garbage',
        at: AT,
      }),
    'validation_failed',
  );
  assert.equal(
    listOwnCalendarAccounts(db, { userId: 'u-1' }).accounts.length,
    0,
  );
});

test('consent is per calendar, and only the owner can change it or disconnect', () => {
  const { db, provider, calls, connect } = setup();
  const account = connect('u-1');
  const on = setPlannerCalendarAccess(db, {
    userId: 'u-1',
    calendarAccountId: account.calendarAccountId,
    calendarId: 'u1-work',
    plannerMayRead: true,
  });
  assert.deepEqual(
    on.calendars.map((c) => [c.calendarId, c.plannerMayRead]),
    [
      ['u1-personal', false],
      ['u1-work', true],
    ],
  );
  // Another member's account is indistinguishable from a missing one.
  rejectsWith(
    () =>
      setPlannerCalendarAccess(db, {
        userId: 'u-2',
        calendarAccountId: account.calendarAccountId,
        calendarId: 'u1-work',
        plannerMayRead: false,
      }),
    'not_found',
  );
  rejectsWith(
    () =>
      disconnectCalendarAccount(db, {
        userId: 'u-2',
        calendarAccountId: account.calendarAccountId,
        provider,
      }),
    'not_found',
  );
  rejectsWith(
    () =>
      setPlannerCalendarAccess(db, {
        userId: 'u-1',
        calendarAccountId: account.calendarAccountId,
        calendarId: 'nope',
        plannerMayRead: true,
      }),
    'not_found',
  );
  rejectsWith(
    () =>
      setPlannerCalendarAccess(db, {
        userId: 'u-1',
        calendarAccountId: account.calendarAccountId,
        calendarId: 'u1-work',
        plannerMayRead: /** @type {any} */ ('yes'),
      }),
    'validation_failed',
  );
  disconnectCalendarAccount(db, {
    userId: 'u-1',
    calendarAccountId: account.calendarAccountId,
    provider,
  });
  assert.deepEqual(listOwnCalendarAccounts(db, { userId: 'u-1' }).accounts, []);
  assert.deepEqual(calls.at(-1), ['revoke', { credentialRef: 'cred-u-1' }]);
});

test('the planner reads only consented calendars and learns only which slots fit', () => {
  const { db, provider, calls, connect } = setup();
  const a1 = connect('u-1');
  const a2 = connect('u-2');
  setPlannerCalendarAccess(db, {
    userId: 'u-1',
    calendarAccountId: a1.calendarAccountId,
    calendarId: 'u1-work',
    plannerMayRead: true,
  });
  setPlannerCalendarAccess(db, {
    userId: 'u-2',
    calendarAccountId: a2.calendarAccountId,
    calendarId: 'u2-main',
    plannerMayRead: true,
  });
  const fri = {
    startsAt: '2026-11-21T00:00:00.000Z',
    endsAt: '2026-11-21T02:00:00.000Z',
  }; // u-1 work busy
  const sat = {
    startsAt: '2026-11-22T00:00:00.000Z',
    endsAt: '2026-11-22T02:00:00.000Z',
  }; // only u1-personal busy (not consented)
  const sun = {
    startsAt: '2026-11-23T00:00:00.000Z',
    endsAt: '2026-11-23T02:00:00.000Z',
  }; // u-2 busy
  const result = slotsThatFitPod(db, {
    podId: 'p-a',
    candidates: [fri, sat, sun],
    provider,
  });
  assert.deepEqual(result, { fitting: [sat], askPrivately: ['u-3'] });
  // The unconsented calendar was never requested.
  const requested = calls
    .filter((c) => c[0] === 'freeBusy')
    .flatMap((c) => c[1].calendarIds);
  assert.ok(!requested.includes('u1-personal'));
  // Nothing about any member's busy time or titles is in the answer.
  assert.doesNotMatch(
    JSON.stringify(result),
    /Therapy|Hospital|Date night|u-1|u-2|busy/,
  );
});

test('a member sees their own busy blocks with no titles, plus their booked hangouts', () => {
  const { db, provider, connect } = setup();
  connect('u-1');
  connect('u-2');
  seedBookedHangout(db);
  const own = getOwnCalendar(db, {
    userId: 'u-1',
    from: '2026-11-16T00:00:00.000Z',
    to: '2026-11-23T00:00:00.000Z',
    provider,
  });
  assert.deepEqual(own.items, [
    {
      kind: 'busy',
      startsAt: '2026-11-20T23:00:00.000Z',
      endsAt: '2026-11-21T01:00:00.000Z',
    },
    {
      kind: 'hangout',
      startsAt: '2026-11-21T00:00:00.000Z',
      endsAt: '2026-11-21T03:00:00.000Z',
      hangoutId: 'h-1',
      podName: 'Synthetic pod',
    },
    {
      kind: 'busy',
      startsAt: '2026-11-21T23:00:00.000Z',
      endsAt: '2026-11-22T01:00:00.000Z',
    },
  ]);
  assert.doesNotMatch(
    JSON.stringify(own),
    /Therapy|Date night|Hospital|u2-main/,
  );
  // u-3 said no: the hangout is not on their calendar view.
  const u3 = getOwnCalendar(db, {
    userId: 'u-3',
    from: '2026-11-16T00:00:00.000Z',
    to: '2026-11-23T00:00:00.000Z',
    provider,
  });
  assert.deepEqual(u3.items, []);
  rejectsWith(
    () =>
      getOwnCalendar(db, {
        userId: 'u-1',
        from: '2026-11-23T00:00:00.000Z',
        to: '2026-11-16T00:00:00.000Z',
        provider,
      }),
    'validation_failed',
  );
  rejectsWith(
    () =>
      getOwnCalendar(db, {
        userId: 'u-1',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-12-31T00:00:00.000Z',
        provider,
      }),
    'validation_failed',
  );
});

/** @param {import('node:sqlite').DatabaseSync} db */
function seedBookedHangout(db) {
  db.prepare(
    "INSERT INTO hangout (hangout_id, pod_id, state, version, created_at, updated_at) VALUES ('h-1', 'p-a', 'BOOKED', 1, ?, ?)",
  ).run(AT, AT);
  db.prepare(
    "INSERT INTO shortlist_option (option_id, hangout_id, title, venue_or_organizer, per_person_estimate_cents, synthetic) VALUES ('o-1', 'h-1', 'Open Bowl Night', 'Brooklyn Bowl', 3500, 1)",
  ).run();
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
}

test('a booked hangout is blocked once, only on yes-members’ calendars', () => {
  const { db, provider, calls, connect } = setup();
  connect('u-1');
  connect('u-3'); // said no
  seedBookedHangout(db);
  const first = blockBookedHangout(db, { hangoutId: 'h-1', at: AT, provider });
  assert.deepEqual(first, { written: ['u-1'], skipped: ['u-2'] }); // u-2 has no calendar
  const inserts = calls.filter((c) => c[0] === 'insertEvent');
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0][1].credentialRef, 'cred-u-1');
  assert.equal(inserts[0][1].summary, 'Unspoken: Open Bowl Night');
  // Running again writes nothing new.
  assert.deepEqual(
    blockBookedHangout(db, { hangoutId: 'h-1', at: AT, provider }),
    {
      written: [],
      skipped: ['u-2'],
    },
  );
  assert.equal(calls.filter((c) => c[0] === 'insertEvent').length, 1);
  // Not booked yet: nothing is written.
  db.prepare(
    "UPDATE hangout SET state = 'BOOKING' WHERE hangout_id = 'h-1'",
  ).run();
  rejectsWith(
    () => blockBookedHangout(db, { hangoutId: 'h-1', at: AT, provider }),
    'wrong_hangout_state',
  );
});

test('a rejected credential marks the account for reconnection instead of failing the planner', () => {
  const { db, provider } = setup();
  db.prepare(
    "INSERT INTO calendar_account (calendar_account_id, user_id, provider, status, credential_ref, created_at) VALUES ('acct-x', 'u-2', 'google', 'connected', 'cred-broken', ?)",
  ).run(AT);
  db.prepare(
    "INSERT INTO calendar_consent (calendar_account_id, calendar_id, name, planner_may_read) VALUES ('acct-x', 'cal', 'cal', 1)",
  ).run();
  const slot = {
    startsAt: '2026-11-21T00:00:00.000Z',
    endsAt: '2026-11-21T02:00:00.000Z',
  };
  const result = slotsThatFitPod(db, {
    podId: 'p-a',
    candidates: [slot],
    provider,
  });
  assert.deepEqual(result.askPrivately, ['u-1', 'u-2', 'u-3']);
  assert.equal(
    listOwnCalendarAccounts(db, { userId: 'u-2' }).accounts[0].status,
    'needs_reconnect',
  );
});

test('add a catalog event to your own calendar needs a connected calendar', () => {
  const { db, provider, calls, connect } = setup();
  rejectsWith(
    () =>
      addEventToOwnCalendar(db, {
        userId: 'u-1',
        eventId: 'evt-001',
        provider,
      }),
    'calendar_not_connected',
  );
  connect('u-1');
  addEventToOwnCalendar(db, { userId: 'u-1', eventId: 'evt-001', provider });
  const insert = calls.filter((c) => c[0] === 'insertEvent').at(-1);
  assert.equal(insert[1].summary, 'Open Bowl Night');
  assert.equal(insert[1].startsAt, '2026-11-21T00:00:00.000Z');
  rejectsWith(
    () =>
      addEventToOwnCalendar(db, {
        userId: 'u-1',
        eventId: 'evt-nope',
        provider,
      }),
    'not_found',
  );
});

test('with no provider configured, nothing can connect', () => {
  rejectsWith(
    () =>
      startCalendarConnect({
        userId: 'u-1',
        at: AT,
        provider: NO_PROVIDER,
        stateKey: KEY,
      }),
    'calendar_not_connected',
  );
});
