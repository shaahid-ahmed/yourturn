// US-019 pod views: lists, mute, rhythm, activities over the US-002 schema.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { createPod, acceptInvitation } from '../services/api/src/pods.mjs';
import {
  listOwnPods,
  listOwnInvitations,
  setOwnPodMute,
  proposeRhythm,
  acceptRhythmProposal,
  listRhythmProposals,
  addGroupActivity,
  listGroupActivities,
  podStageFor,
  agreedRhythm,
  PodViewError,
} from '../services/api/src/pod-views.mjs';

const AT = '2026-11-12T12:00:00.000Z';

function setup() {
  const db = openDatabase(':memory:');
  migrate(db);
  const add = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  add.run('u-1', 'Sam', '+15550001111', AT);
  add.run('u-2', 'Pri', '+15550002222', AT);
  add.run('u-3', 'Lee', '+15550003333', AT);
  db.prepare(
    "INSERT INTO permission_status (user_id, contacts, notifications, calendar, updated_at) VALUES ('u-1', 'granted', 'not_asked', 'not_asked', ?)",
  ).run(AT);
  return db;
}

/** @param {any} db */
function podWithThree(db) {
  const { podId } = createPod(db, {
    name: 'Friday crew',
    creatorUserId: 'u-1',
    inviteUserIds: ['u-2', 'u-3'],
    at: AT,
  });
  for (const userId of ['u-2', 'u-3']) {
    const [invite] = listOwnInvitations(db, userId);
    acceptInvitation(db, { invitationId: invite.invitationId, userId, at: AT });
  }
  return podId;
}

test('pods list only joined pods, invitations list only pending ones', () => {
  const db = setup();
  assert.deepEqual(listOwnPods(db, 'u-2'), []);
  const { podId } = createPod(db, {
    name: 'Friday crew',
    creatorUserId: 'u-1',
    inviteUserIds: ['u-2', 'u-3'],
    at: AT,
  });
  assert.deepEqual(listOwnPods(db, 'u-1'), [podId]);
  const invites = listOwnInvitations(db, 'u-2');
  assert.equal(invites.length, 1);
  assert.equal(invites[0].podId, podId);
  assert.equal(invites[0].status, 'pending');
});

test('mute is per member and defaults to false', () => {
  const db = setup();
  const podId = podWithThree(db);
  assert.equal(
    /** @type {{ muted: number }} */ (
      db
        .prepare(
          'SELECT muted FROM pod_membership WHERE pod_id = ? AND user_id = ?',
        )
        .get(podId, 'u-1')
    ).muted,
    0,
  );
  setOwnPodMute(db, { podId, userId: 'u-1', muted: true, at: AT });
  assert.equal(
    /** @type {{ muted: number }} */ (
      db
        .prepare(
          'SELECT muted FROM pod_membership WHERE pod_id = ? AND user_id = ?',
        )
        .get(podId, 'u-1')
    ).muted,
    1,
  );
  assert.throws(
    () => setOwnPodMute(db, { podId, userId: 'u-9', muted: true, at: AT }),
    PodViewError,
  );
});

test('rhythm: propose, accept, agreed when every joined member accepts', () => {
  const db = setup();
  const podId = podWithThree(db);
  const p = proposeRhythm(db, {
    podId,
    userId: 'u-1',
    cadence: 'weekly',
    at: AT,
  });
  assert.equal(p.status, 'open');
  let list = listRhythmProposals(db, { podId, userId: 'u-1' });
  assert.equal(list.length, 1);
  assert.equal(list[0].acceptedBy.length, 1);
  acceptRhythmProposal(db, { proposalId: p.proposalId, userId: 'u-2', at: AT });
  acceptRhythmProposal(db, { proposalId: p.proposalId, userId: 'u-3', at: AT });
  list = listRhythmProposals(db, { podId, userId: 'u-1' });
  assert.equal(list[0].status, 'agreed');
  const agreed = /** @type {{ cadence: string }} */ (agreedRhythm(db, podId));
  assert.equal(agreed.cadence, 'weekly');
  const p2 = proposeRhythm(db, {
    podId,
    userId: 'u-2',
    cadence: 'monthly',
    at: AT,
  });
  const relisted =
    /** @type {Array<{ proposalId: string, status: string }>} */ (
      listRhythmProposals(db, { podId, userId: 'u-1' })
    );
  assert.equal(
    relisted.find((r) => r.proposalId === p.proposalId)?.status,
    'superseded',
  );
  assert.equal(p2.status, 'open');
});

test('a non-member cannot touch rhythm or activities', () => {
  const db = setup();
  const podId = podWithThree(db);
  assert.throws(
    () =>
      proposeRhythm(db, { podId, userId: 'u-9', cadence: 'weekly', at: AT }),
    PodViewError,
  );
  assert.throws(
    () =>
      addGroupActivity(db, { podId, userId: 'u-9', label: 'Bowling', at: AT }),
    PodViewError,
  );
});

test('group activities are listed newest first with the adder named', () => {
  const db = setup();
  const podId = podWithThree(db);
  addGroupActivity(db, { podId, userId: 'u-1', label: 'Bowling', at: AT });
  addGroupActivity(db, {
    podId,
    userId: 'u-2',
    label: 'Ramen',
    at: '2026-11-13T12:00:00.000Z',
  });
  const acts = listGroupActivities(db, { podId, userId: 'u-1' });
  assert.equal(acts.length, 2);
  assert.equal(acts[0].label, 'Ramen');
  assert.equal(acts[0].addedBy.firstName, 'Pri');
});

test('pod stage follows the latest active hangout', () => {
  const db = setup();
  const podId = podWithThree(db);
  assert.equal(podStageFor(db, podId), 'none');
  db.prepare(
    "INSERT INTO hangout (hangout_id, pod_id, state, created_at, updated_at) VALUES ('h-1', ?, 'ACTIVITY_VOTE', ?, ?)",
  ).run(podId, AT, AT);
  assert.equal(podStageFor(db, podId), 'poll_open');
});
