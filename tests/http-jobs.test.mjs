// #100: the planner clock advances due polls and bookings.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { createHangout } from '../services/api/src/db/hangout-store.mjs';
import { openActivityPoll } from '../services/api/src/polls.mjs';
import { runPlannerJobs } from '../services/api/src/http/server.mjs';

const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const POD = '01J00000000000000000000010';
const HANGOUT = '01J00000000000000000000011';
const T0 = '2026-11-12T12:00:00.000Z';

test('#100: runPlannerJobs extends a voteless due poll instead of stalling', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  const add = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  add.run(U1, 'Sam', '+15550001111', T0);
  add.run(U2, 'Pri', '+15550002222', T0);
  db.prepare(
    'INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
  ).run(POD, 'Pod A', U1, T0);
  const member = db.prepare(
    'INSERT INTO pod_membership (pod_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
  );
  member.run(POD, U1, 'creator', T0);
  member.run(POD, U2, 'member', T0);
  createHangout(db, {
    hangoutId: HANGOUT,
    podId: POD,
    actorUserId: U1,
    at: T0,
  });
  const pollId = openActivityPoll(db, {
    hangoutId: HANGOUT,
    options: [
      {
        title: 'Lanes',
        venueOrOrganizer: 'Bowl',
        startsAt: '2026-11-21T00:00:00.000Z',
        perPersonEstimateCents: 100,
      },
    ],
    closesAt: '2026-11-12T12:30:00.000Z',
    at: T0,
  });

  const out = runPlannerJobs(db, { at: '2026-11-12T13:00:00.000Z' });
  assert.deepEqual(out.polls.extended, [pollId]);
  const poll =
    /** @type {{ status: string, extended_once: number } | undefined} */ (
      db
        .prepare('SELECT status, extended_once FROM poll WHERE poll_id = ?')
        .get(pollId)
    );
  assert.equal(poll?.status, 'open');
  assert.equal(poll?.extended_once, 1);
});
