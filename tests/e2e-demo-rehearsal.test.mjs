// US-304 / #44: timed scripted run of the demo path in docs/07-gtm/DEMO_SCRIPT.md.
//
// It drives the real HTTP API in-process on a fresh database loaded from the
// synthetic fixture, and reports each beat's wall-clock time as a test
// diagnostic. This times the software, not a spoken demo: the under-three-
// minute target is checked by a human rehearsal, and the screen recording is
// pending (both recorded in DEMO_SCRIPT.md).
//
// Lane A is the demo as written. Beats that cannot run yet are todo with the
// blocking issue (#99 catalog event ids). Lane B is a REHEARSAL WORKAROUND, not
// the demo: it uses a non-catalog option and a stub booker so the remaining
// beats can be timed. Steps the running server does not expose (#100) are
// called directly and labelled PLANNER or CLOCK.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';
import {
  openActivityPoll,
  openTimePoll,
  runPollJobs,
} from '../services/api/src/polls.mjs';
import { runBookingJobs } from '../services/api/src/booking.mjs';
import {
  loadDemoFixture,
  privateLimitsFor,
} from './fixtures/load-unspoken-demo.mjs';

const HOUR = 60 * 60 * 1000;
const JOBS = { extendByMs: HOUR, readyCheckWindowMs: 2 * HOUR };
const later = (/** @type {number} */ ms) =>
  new Date(Date.now() + ms).toISOString();
const catalog = JSON.parse(
  readFileSync(new URL('./fixtures/nyc-catalog.json', import.meta.url), 'utf8'),
);
const BLOCKED_99 = {
  todo: 'blocked by #99 (catalog event ids break poll and hangout reads)',
};
const STUB_BOOKER = { book: () => ({ ok: true }) };

/** @typedef {{ cookie: string, 'x-csrf-token': string }} Session */

/** @param {any} app @param {string} phone @returns {Promise<Session>} */
async function signIn(app, phone) {
  const c = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/phone-codes',
    payload: { phone },
  });
  assert.equal(c.statusCode, 201);
  const s = await app.inject({
    method: 'POST',
    url: '/api/v1/sessions',
    payload: { challengeId: c.json().challengeId, code: '000000' },
  });
  assert.equal(s.statusCode, 201);
  return {
    cookie: String(s.headers['set-cookie']).split(';')[0],
    'x-csrf-token': s.json().csrfToken,
  };
}

/** @param {any} app @param {Session} who @param {string} method @param {string} path @param {unknown} [payload] @param {Record<string, string>} [extra] */
async function call(app, who, method, path, payload, extra = {}) {
  /** @type {any} */
  const request = {
    method,
    url: `/api/v1${path}`,
    headers: { ...who, ...extra },
  };
  if (payload !== undefined) request.payload = payload;
  return app.inject(request);
}

/**
 * Run one beat and report its time.
 * @param {import('node:test').TestContext} t
 * @param {string} name
 * @param {object} options
 * @param {() => Promise<void>} body
 */
async function beat(t, name, options, body) {
  await t.test(name, options, async (bt) => {
    const start = performance.now();
    await body();
    bt.diagnostic(`${name}: ${(performance.now() - start).toFixed(1)} ms`);
  });
}

/** Fresh world: fixture loaded, every Thursday Crew member signed in. */
async function world() {
  const db = openDatabase(':memory:');
  migrate(db);
  const fx = loadDemoFixture(db);
  const app = buildApp({ db });
  /** @type {Record<string, Session>} */
  const s = {};
  for (const k of ['ava', 'ben', 'cleo', 'dev'])
    s[k] = await signIn(app, fx.person(k).phone);
  return { db, app, s, ...fx, podId: fx.pod('thursday').podId };
}

/**
 * The beats shared by both lanes, from start to the confirmed split.
 * @param {import('node:test').TestContext} t
 * @param {Awaited<ReturnType<typeof world>>} w
 * @param {{ options: any[], booker?: any, after: object }} lane
 */
async function demoBeats(t, w, lane) {
  const { app, db, s, podId } = w;
  /** @type {{ hangoutId: string, base: string }} */
  const h = { hangoutId: '', base: '' };

  await beat(
    t,
    'B1 sign in as Ava (demo), private limits behind the lock',
    {},
    async () => {
      const limits = privateLimitsFor(w.person('ava'));
      assert.ok(limits);
      assert.equal(
        (await call(app, s.ava, 'PUT', '/me/private-limits', limits))
          .statusCode,
        200,
      );
      const pods = await call(app, s.ava, 'GET', '/pods');
      assert.ok(
        pods
          .json()
          .pods.some(
            (/** @type {any} */ p) => p.name === 'Thursday Crew (demo)',
          ),
      );
    },
  );

  await beat(t, 'B2 start a hangout in Thursday Crew (demo)', {}, async () => {
    const started = await call(app, s.ava, 'POST', `/pods/${podId}/hangouts`);
    assert.equal(started.statusCode, 201);
    h.hangoutId = started.json().hangoutId;
    h.base = `/pods/${podId}/hangouts/${h.hangoutId}`;
  });

  /** @type {string} */
  let poll = '';
  await beat(
    t,
    'B3 planner shortlist; votes visible with names',
    lane.after,
    async () => {
      poll = openActivityPoll(db, {
        hangoutId: h.hangoutId,
        options: lane.options,
        closesAt: later(HOUR),
        at: new Date().toISOString(),
      }); // PLANNER
      const read = await call(app, s.ben, 'GET', `${h.base}/polls/${poll}`);
      assert.equal(read.statusCode, 200);
      const optionId = read.json().options[0].optionId;
      for (const k of ['ava', 'ben', 'cleo'])
        assert.equal(
          (
            await call(app, s[k], 'PUT', `${h.base}/polls/${poll}/votes/me`, {
              optionId,
            })
          ).statusCode,
          200,
        );
      const names = (
        await call(app, s.cleo, 'GET', `${h.base}/polls/${poll}`)
      ).json().options[0].votes.length;
      assert.equal(names, 3);
    },
  );

  await beat(t, 'B4 time poll closes on a winner', lane.after, async () => {
    runPollJobs(db, { at: later(HOUR), ...JOBS }); // CLOCK
    const time = openTimePoll(db, {
      hangoutId: h.hangoutId,
      closesAt: later(3 * HOUR),
      at: later(HOUR),
      slots: [
        {
          startsAt: '2026-11-21T00:00:00.000Z',
          endsAt: '2026-11-21T02:00:00.000Z',
        },
      ],
    }); // PLANNER
    const slot = (
      await call(app, s.ava, 'GET', `${h.base}/polls/${time}`)
    ).json().options[0].optionId;
    for (const k of ['ava', 'ben', 'cleo'])
      await call(app, s[k], 'PUT', `${h.base}/polls/${time}/votes/me`, {
        optionId: slot,
      });
    runPollJobs(db, { at: later(3 * HOUR), ...JOBS }); // CLOCK
    assert.equal(
      (await call(app, s.ava, 'GET', h.base)).json().state,
      'READY_CHECK',
    );
  });

  await beat(
    t,
    'B5 ready check: Dev (demo) cannot say yes without PayPal',
    lane.after,
    async () => {
      const dev = await call(app, s.dev, 'PUT', `${h.base}/ready-check/me`, {
        answer: 'yes',
      });
      assert.equal(dev.json().code, 'paypal_link_required');
      await call(app, s.dev, 'PUT', `${h.base}/ready-check/me`, {
        answer: 'no',
      });
      for (const k of ['ava', 'ben', 'cleo'])
        assert.equal(
          (
            await call(app, s[k], 'PUT', `${h.base}/ready-check/me`, {
              answer: 'yes',
            })
          ).statusCode,
          200,
        );
      runPollJobs(db, { at: later(6 * HOUR), ...JOBS }); // CLOCK
      assert.equal(
        (await call(app, s.ava, 'GET', h.base)).json().state,
        'AWAITING_CONFIRMATION',
      );
    },
  );

  await beat(
    t,
    'B6 Ava pays the venue: volunteers, confirms, simulated booking',
    lane.after,
    async () => {
      runBookingJobs(db, { at: later(6 * HOUR), booker: lane.booker }); // CLOCK
      assert.equal(
        (await call(app, s.ava, 'PUT', `${h.base}/payer`)).statusCode,
        200,
      );
      const booking = (await call(app, s.ava, 'GET', h.base)).json().booking;
      assert.equal(booking.simulated, true);
      assert.match(booking.simulatedLabel, /No real reservation/);
      assert.equal(
        (
          await call(app, s.ava, 'POST', `${h.base}/booking-confirmation`, {
            estimatedTotalCents: booking.estimatedTotalCents,
          })
        ).statusCode,
        202,
      );
      runBookingJobs(db, { at: later(7 * HOUR), booker: lane.booker }); // CLOCK
      assert.equal(
        (await call(app, s.ava, 'GET', h.base)).json().state,
        'BOOKED',
      );
    },
  );

  await beat(
    t,
    'B7 split confirmed; IOU balances; no money moves in the app',
    lane.after,
    async () => {
      const total = (await call(app, s.ava, 'GET', `${h.base}/split`)).json()
        .totalCents;
      assert.equal(
        (
          await call(
            app,
            s.ava,
            'POST',
            `${h.base}/split/confirmation`,
            { totalCents: total },
            { 'idempotency-key': 'demo-run-split-01' },
          )
        ).statusCode,
        201,
      );
      const balances = await call(app, s.ben, 'GET', '/me/balances');
      assert.equal(balances.statusCode, 200);
      assert.ok(
        balances.json().totalIOweCents > 0,
        'Ben sees what he owes Ava',
      );
      assert.equal(
        db.prepare('SELECT count(*) AS n FROM settlement_payment').get()?.n,
        0,
        'no money moves (ADR 0008)',
      );
    },
  );
}

test('Lane A: the demo as written (catalog-backed plan, real demo booker)', async (t) => {
  const w = await world();
  t.after(() => w.app.close());
  const events = catalog.events.slice(0, 2);
  await demoBeats(t, w, {
    after: BLOCKED_99,
    options: events.map((/** @type {any} */ e) => ({
      title: `${e.title} (demo)`.slice(0, 120),
      venueOrOrganizer: 'Seeded demo venue',
      startsAt: null,
      perPersonEstimateCents: e.estCostPerPersonCents,
      eventId: e.eventId,
    })),
  });
});

test('Lane B: REHEARSAL WORKAROUND, not the demo (non-catalog option, stub booker)', async (t) => {
  const w = await world();
  t.after(() => w.app.close());
  await demoBeats(t, w, {
    after: {},
    booker: STUB_BOOKER,
    options: [
      {
        title: 'Synthetic Lanes (demo)',
        venueOrOrganizer: 'Synthetic venue (demo)',
        startsAt: null,
        perPersonEstimateCents: 3000,
      },
    ],
  });
});
