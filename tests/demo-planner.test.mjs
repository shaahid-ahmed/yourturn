// #78: the API seed and the demo planner let the core flow walk end to end:
// pod → hangout → activity poll → vote → time poll → vote → ready check →
// awaiting confirmation (booking card). Domain-level, on a seeded file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { openDatabase } from '../services/api/src/db/database.mjs';
import { seedApiDemo } from '../infra/seed/api-demo.mjs';
import { readDemoFixture } from './fixtures/load-unspoken-demo.mjs';
import {
  plannerTick,
  eveningSlots,
  shortlistFor,
} from '../services/ai/planner/demo-planner.mjs';
import { startHangout } from '../services/api/src/subscription.mjs';
import { castOwnVote, setOwnReadyAnswer } from '../services/api/src/polls.mjs';

const T0 = '2026-11-12T15:00:00.000Z';
const MIN = 60_000;
/** @param {number} m */
const at = (m) => new Date(Date.parse(T0) + m * MIN).toISOString();

test('seeding is idempotent and only synthetic people can be seeded', () => {
  const dir = mkdtempSync(join(tmpdir(), 'unspoken-seed-'));
  try {
    const dbPath = join(dir, 'api.sqlite');
    const first = seedApiDemo({ dbPath, now: new Date(T0) });
    const second = seedApiDemo({ dbPath, now: new Date(T0) });
    assert.equal(first.seeded, true);
    assert.equal(second.seeded, false);
    const db = openDatabase(dbPath);
    const users = db
      .prepare('SELECT synthetic, first_name FROM app_user')
      .all();
    assert.equal(users.length, readDemoFixture().people.length);
    assert.ok(
      users.every(
        (u) => u.synthetic === 1 && String(u.first_name).endsWith('(demo)'),
      ),
    );
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the shortlist is cheapest-first seeded events and includes a free option', () => {
  const options = shortlistFor(4);
  assert.equal(options.length, 3);
  assert.equal(options[0].perPersonEstimateCents, 0);
  assert.ok(options.every((o) => Number.isInteger(o.perPersonEstimateCents)));
  const slots = eveningSlots(T0);
  assert.equal(slots.length, 3);
  assert.ok(slots.every((s) => s.endsAt > s.startsAt && s.startsAt > T0));
});

test('the core flow walks from a pod to the booking card', () => {
  const dir = mkdtempSync(join(tmpdir(), 'unspoken-flow-'));
  try {
    const dbPath = join(dir, 'api.sqlite');
    seedApiDemo({ dbPath, now: new Date(T0) });
    const db = openDatabase(dbPath);
    const fixture = readDemoFixture();
    const pod =
      fixture.pods.find((p) => p.key === 'thursday') ?? fixture.pods[0];
    const people = pod.members.map((k) =>
      fixture.people.find((p) => p.key === k),
    );
    const ids = people.map((p) => /** @type {any} */ (p).userId);
    const creator = /** @type {any} */ (
      fixture.people.find((p) => p.key === pod.creator)
    ).userId;
    const state = (/** @type {string} */ h) =>
      String(
        /** @type {any} */ (
          db.prepare('SELECT state FROM hangout WHERE hangout_id = ?').get(h)
        ).state,
      );
    const pollOf = (/** @type {string} */ h, /** @type {string} */ kind) =>
      /** @type {any} */ (
        db
          .prepare('SELECT poll_id FROM poll WHERE hangout_id = ? AND kind = ?')
          .get(h, kind)
      ).poll_id;
    const firstOption = (/** @type {string} */ pollId) =>
      String(
        /** @type {any} */ (
          db
            .prepare(
              'SELECT poll_option_id FROM poll_option WHERE poll_id = ? ORDER BY rowid LIMIT 1',
            )
            .get(pollId)
        ).poll_option_id,
      );

    const { hangoutId } = startHangout(db, {
      podId: pod.podId,
      userId: creator,
      at: at(0),
    });
    assert.equal(state(hangoutId), 'PLANNING');

    // The planner posts the shortlist.
    assert.deepEqual(
      plannerTick(db, { at: at(0), pollMs: 2 * MIN }).activityPolls,
      [hangoutId],
    );
    assert.equal(state(hangoutId), 'ACTIVITY_VOTE');
    assert.deepEqual(
      plannerTick(db, { at: at(0), pollMs: 2 * MIN }).activityPolls,
      [],
      'posted once',
    );
    const activityPoll = pollOf(hangoutId, 'activity');
    for (const userId of ids)
      castOwnVote(db, {
        podId: pod.podId,
        hangoutId,
        pollId: activityPoll,
        userId,
        optionId: firstOption(activityPoll),
        at: at(1),
      });

    // Close it; the planner posts the time poll.
    plannerTick(db, { at: at(3), pollMs: 2 * MIN, withJobs: true });
    assert.equal(state(hangoutId), 'TIME_VOTE');
    plannerTick(db, { at: at(3), pollMs: 2 * MIN });
    const timePoll = pollOf(hangoutId, 'time');
    for (const userId of ids)
      castOwnVote(db, {
        podId: pod.podId,
        hangoutId,
        pollId: timePoll,
        userId,
        optionId: firstOption(timePoll),
        at: at(4),
      });

    plannerTick(db, { at: at(6), pollMs: 2 * MIN, withJobs: true });
    assert.equal(state(hangoutId), 'READY_CHECK');

    // Members with PayPal say yes; the ready check closes into confirmation.
    const linked = people.filter((p) => /** @type {any} */ (p).paypalLinked);
    for (const p of linked)
      setOwnReadyAnswer(db, {
        podId: pod.podId,
        hangoutId,
        userId: /** @type {any} */ (p).userId,
        answer: 'yes',
        at: at(7),
      });
    plannerTick(db, { at: at(10), pollMs: 2 * MIN, withJobs: true });
    assert.equal(state(hangoutId), 'AWAITING_CONFIRMATION');
    const card = db
      .prepare(
        "SELECT 1 AS x FROM pod_message WHERE pod_id = ? AND card_type = 'booking_confirmation'",
      )
      .get(pod.podId);
    assert.ok(card, 'the booking card was posted');
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
