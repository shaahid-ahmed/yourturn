// US-004: pods, invitations, single-use invite links and contact matching.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import {
  MAX_MEMBERS,
  MIN_MEMBERS,
  PodError,
  newUlid,
  tokenDigest,
  placesTaken,
  matchContacts,
  createPod,
  inviteMembers,
  acceptInvitation,
  declineInvitation,
  createInviteLink,
  revokeInviteLink,
  acceptInviteLink,
  leavePod,
  removeMember,
  getPod,
  readyForPlanning,
} from '../services/api/src/pods.mjs';

const AT = '2026-11-12T12:00:00.000Z';
const LATER = '2026-11-20T12:00:00.000Z';

/**
 * A migrated in-memory database with ten synthetic people, u-1 .. u-10.
 * @param {{ contacts?: string }} [options] u-1's contacts permission
 */
function setup({ contacts = 'granted' } = {}) {
  const db = openDatabase(':memory:');
  migrate(db);
  const user = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  for (let i = 1; i <= 10; i += 1)
    user.run(
      `u-${i}`,
      `Synth${i}`,
      `+1555010${String(i).padStart(4, '0')}`,
      AT,
    );
  const permission = db.prepare(
    "INSERT INTO permission_status (user_id, contacts, notifications, calendar, updated_at) VALUES (?, ?, 'granted', 'granted', ?)",
  );
  permission.run('u-1', contacts, AT);
  for (let i = 2; i <= 10; i += 1) permission.run(`u-${i}`, 'granted', AT);
  let n = 0;
  const newId = () => `id-${(n += 1)}`;
  return { db, newId };
}

/** @param {string} code */
const fails = (code) => (/** @type {any} */ error) =>
  error instanceof PodError && error.code === code;

/** @param {number} i */
const phone = (i) => `+1555010${String(i).padStart(4, '0')}`;

/** @param {import('node:sqlite').DatabaseSync} db */
function rowCounts(db) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const { name } of db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .all())
    counts[String(name)] = Number(
      db.prepare(`SELECT count(*) AS n FROM ${name}`).get()?.n,
    );
  return counts;
}

test('contacts are matched by phone, unmatched numbers are not stored', () => {
  const { db } = setup();
  const before = rowCounts(db);
  const matches = matchContacts(db, {
    callerUserId: 'u-1',
    phones: [phone(2), phone(3), '+15559999999', phone(1), phone(2)],
  });
  assert.deepEqual(matches, [
    { phone: phone(2), userId: 'u-2', firstName: 'Synth2' },
    { phone: phone(3), userId: 'u-3', firstName: 'Synth3' },
  ]);
  assert.deepEqual(rowCounts(db), before, 'matching writes nothing');
  assert.throws(
    () => matchContacts(db, { callerUserId: 'u-1', phones: [] }),
    fails('validation_failed'),
  );
  assert.throws(
    () => matchContacts(db, { callerUserId: 'u-1', phones: ['5550100002'] }),
    fails('validation_failed'),
  );
  assert.throws(
    () =>
      matchContacts(db, {
        callerUserId: 'u-1',
        phones: Array.from(
          { length: 2001 },
          (_, i) => `+1555${String(i).padStart(7, '0')}`,
        ),
      }),
    fails('validation_failed'),
  );
  db.prepare("UPDATE app_user SET deleted_at = ? WHERE user_id = 'u-3'").run(
    AT,
  );
  assert.deepEqual(
    matchContacts(db, { callerUserId: 'u-1', phones: [phone(3)] }),
    [],
    'a deleted account is never matched',
  );
});

test('declined contacts leaves invite links as the only way to build a pod', () => {
  const { db, newId } = setup({ contacts: 'denied' });
  assert.deepEqual(
    matchContacts(db, { callerUserId: 'u-1', phones: [phone(2)] }),
    [],
  );
  assert.throws(
    () =>
      createPod(db, {
        name: 'Synthetic Pod',
        creatorUserId: 'u-1',
        inviteUserIds: ['u-2'],
        at: AT,
        newId,
      }),
    (/** @type {any} */ e) =>
      e.code === 'validation_failed' &&
      e.details[0].problem === 'contacts_permission_not_granted',
  );
  const { podId, invitationIds } = createPod(db, {
    name: 'Synthetic Pod',
    creatorUserId: 'u-1',
    inviteUserIds: [],
    at: AT,
    newId,
  });
  assert.deepEqual(invitationIds, []);
  assert.throws(
    () =>
      inviteMembers(db, {
        podId,
        callerUserId: 'u-1',
        userIds: ['u-2'],
        at: AT,
        newId,
      }),
    fails('validation_failed'),
  );
  const link = createInviteLink(db, {
    podId,
    callerUserId: 'u-1',
    at: AT,
    newId,
  });
  assert.equal(
    acceptInviteLink(db, { token: link.token, userId: 'u-2', at: AT }),
    podId,
  );
});

test('a pod is created with its creator and pending invitations', () => {
  const { db, newId } = setup();
  const { podId, invitationIds } = createPod(db, {
    name: 'Synthetic Pod',
    creatorUserId: 'u-1',
    inviteUserIds: ['u-2', 'u-3'],
    at: AT,
    newId,
  });
  assert.equal(invitationIds.length, 2);
  const pod = getPod(db, { podId, callerUserId: 'u-1', at: AT });
  assert.equal(pod.memberCount, 3);
  assert.equal(pod.minMembers, MIN_MEMBERS);
  assert.equal(pod.maxMembers, MAX_MEMBERS);
  assert.equal(pod.readyForPlanning, false, 'invited people are not joined');
  assert.deepEqual(
    pod.members.map((m) => [m.userId, m.role, m.status]),
    [
      ['u-1', 'creator', 'joined'],
      ['u-2', 'member', 'invited'],
      ['u-3', 'member', 'invited'],
    ],
  );
  for (const member of pod.members)
    assert.deepEqual(
      Object.keys(member).sort(),
      ['firstName', 'role', 'status', 'userId'],
      'no phone number',
    );
  for (const bad of ['', '   ', 'x'.repeat(41)])
    assert.throws(
      () =>
        createPod(db, {
          name: bad,
          creatorUserId: 'u-1',
          inviteUserIds: [],
          at: AT,
          newId,
        }),
      fails('validation_failed'),
    );
  for (const bad of [['u-1'], ['u-2', 'u-2'], ['u-nobody']])
    assert.throws(
      () =>
        createPod(db, {
          name: 'P',
          creatorUserId: 'u-1',
          inviteUserIds: bad,
          at: AT,
          newId,
        }),
      PodError,
    );
});

test('3 to 8: planning needs three joined; invitations, links and members never exceed eight', () => {
  const { db, newId } = setup();
  const { podId, invitationIds } = createPod(db, {
    name: 'Synthetic Pod',
    creatorUserId: 'u-1',
    inviteUserIds: ['u-2', 'u-3', 'u-4', 'u-5', 'u-6'],
    at: AT,
    newId,
  });
  assert.throws(
    () =>
      createPod(db, {
        name: 'Too big',
        creatorUserId: 'u-1',
        inviteUserIds: ['u-2', 'u-3', 'u-4', 'u-5', 'u-6', 'u-7', 'u-8', 'u-9'],
        at: AT,
        newId,
      }),
    fails('pod_full'),
  );
  acceptInvitation(db, {
    invitationId: invitationIds[0],
    userId: 'u-2',
    at: AT,
  });
  assert.equal(readyForPlanning(db, podId), false);
  acceptInvitation(db, {
    invitationId: invitationIds[1],
    userId: 'u-3',
    at: AT,
  });
  assert.equal(readyForPlanning(db, podId), true);
  // 3 joined + 3 pending = 6; two links fill it to 8.
  createInviteLink(db, { podId, callerUserId: 'u-2', at: AT, newId });
  const last = createInviteLink(db, {
    podId,
    callerUserId: 'u-1',
    at: AT,
    newId,
  });
  assert.equal(placesTaken(db, podId, AT), 8);
  assert.throws(
    () => createInviteLink(db, { podId, callerUserId: 'u-1', at: AT, newId }),
    (/** @type {any} */ e) =>
      e.code === 'pod_full' &&
      e.constraint.maxMembers === 8 &&
      e.constraint.minMembers === 3,
  );
  assert.throws(
    () =>
      inviteMembers(db, {
        podId,
        callerUserId: 'u-1',
        userIds: ['u-9'],
        at: AT,
        newId,
      }),
    fails('pod_full'),
  );
  // Revoking a link frees its place.
  revokeInviteLink(db, {
    podId,
    inviteLinkId: last.inviteLinkId,
    callerUserId: 'u-1',
    at: AT,
  });
  assert.equal(placesTaken(db, podId, AT), 7);
  inviteMembers(db, {
    podId,
    callerUserId: 'u-1',
    userIds: ['u-9'],
    at: AT,
    newId,
  });
  // An expired link frees its place too.
  assert.equal(placesTaken(db, podId, LATER), 7);
});

test('an invite link is single use and its token is never stored', () => {
  const { db, newId } = setup();
  const { podId } = createPod(db, {
    name: 'Synthetic Pod',
    creatorUserId: 'u-1',
    inviteUserIds: [],
    at: AT,
    newId,
  });
  const link = createInviteLink(db, {
    podId,
    callerUserId: 'u-1',
    at: AT,
    newId,
  });
  assert.match(link.token, /^[A-Za-z0-9_-]{43}$/);
  const stored = db
    .prepare('SELECT token_digest FROM invite_link')
    .all()
    .map((r) => r.token_digest);
  assert.deepEqual(stored, [tokenDigest(link.token)]);
  assert.ok(!JSON.stringify(rowCounts(db)).includes(link.token));
  const dump = db.prepare('SELECT * FROM invite_link').all();
  assert.ok(
    !JSON.stringify(dump).includes(link.token),
    'the raw token is nowhere in the table',
  );

  assert.equal(
    acceptInviteLink(db, { token: link.token, userId: 'u-2', at: AT }),
    podId,
  );
  assert.throws(
    () => acceptInviteLink(db, { token: link.token, userId: 'u-3', at: AT }),
    fails('invite_link_used'),
  );
  assert.throws(
    () => acceptInviteLink(db, { token: link.token, userId: 'u-2', at: AT }),
    fails('invite_link_used'),
  );
  assert.throws(
    () =>
      acceptInviteLink(db, {
        token: 'not-a-real-token',
        userId: 'u-3',
        at: AT,
      }),
    fails('not_found'),
  );

  const revoked = createInviteLink(db, {
    podId,
    callerUserId: 'u-1',
    at: AT,
    newId,
  });
  revokeInviteLink(db, {
    podId,
    inviteLinkId: revoked.inviteLinkId,
    callerUserId: 'u-1',
    at: AT,
  });
  assert.throws(
    () => acceptInviteLink(db, { token: revoked.token, userId: 'u-3', at: AT }),
    fails('not_found'),
  );
  assert.throws(
    () =>
      revokeInviteLink(db, {
        podId,
        inviteLinkId: revoked.inviteLinkId,
        callerUserId: 'u-1',
        at: AT,
      }),
    fails('not_found'),
  );

  const expiring = createInviteLink(db, {
    podId,
    callerUserId: 'u-1',
    at: AT,
    newId,
  });
  assert.throws(
    () =>
      acceptInviteLink(db, { token: expiring.token, userId: 'u-3', at: LATER }),
    fails('invite_link_expired'),
  );

  const spare = createInviteLink(db, {
    podId,
    callerUserId: 'u-1',
    at: AT,
    newId,
  });
  assert.throws(
    () => acceptInviteLink(db, { token: spare.token, userId: 'u-1', at: AT }),
    fails('already_member'),
  );
  // The refused attempt did not use up the link.
  assert.equal(
    acceptInviteLink(db, { token: spare.token, userId: 'u-3', at: AT }),
    podId,
  );
});

test('joining by link resolves a pending invitation so a place is not counted twice', () => {
  const { db, newId } = setup();
  const { podId } = createPod(db, {
    name: 'Synthetic Pod',
    creatorUserId: 'u-1',
    inviteUserIds: ['u-2'],
    at: AT,
    newId,
  });
  const link = createInviteLink(db, {
    podId,
    callerUserId: 'u-1',
    at: AT,
    newId,
  });
  assert.equal(placesTaken(db, podId, AT), 3);
  acceptInviteLink(db, { token: link.token, userId: 'u-2', at: AT });
  assert.equal(placesTaken(db, podId, AT), 2);
  assert.equal(
    db
      .prepare(
        "SELECT status FROM pod_invitation WHERE invitee_user_id = 'u-2'",
      )
      .get()?.status,
    'accepted',
  );
});

test('invitations are accepted or declined once, by the invitee only', () => {
  const { db, newId } = setup();
  const {
    podId,
    invitationIds: [inv],
  } = createPod(db, {
    name: 'Synthetic Pod',
    creatorUserId: 'u-1',
    inviteUserIds: ['u-2'],
    at: AT,
    newId,
  });
  assert.throws(
    () => acceptInvitation(db, { invitationId: inv, userId: 'u-3', at: AT }),
    fails('not_found'),
  );
  assert.throws(
    () => declineInvitation(db, { invitationId: inv, userId: 'u-3', at: AT }),
    fails('not_found'),
  );
  declineInvitation(db, { invitationId: inv, userId: 'u-2', at: AT });
  assert.throws(
    () => acceptInvitation(db, { invitationId: inv, userId: 'u-2', at: AT }),
    fails('invitation_resolved'),
  );
  assert.throws(
    () => declineInvitation(db, { invitationId: inv, userId: 'u-2', at: AT }),
    fails('invitation_resolved'),
  );
  // A declined invitation frees its place and can be re-sent.
  const [again] = inviteMembers(db, {
    podId,
    callerUserId: 'u-1',
    userIds: ['u-2'],
    at: AT,
    newId,
  });
  assert.throws(
    () =>
      inviteMembers(db, {
        podId,
        callerUserId: 'u-1',
        userIds: ['u-2'],
        at: AT,
        newId,
      }),
    fails('invitation_resolved'),
  );
  acceptInvitation(db, { invitationId: again, userId: 'u-2', at: AT });
  assert.throws(
    () =>
      inviteMembers(db, {
        podId,
        callerUserId: 'u-1',
        userIds: ['u-2'],
        at: AT,
        newId,
      }),
    fails('already_member'),
  );
  assert.throws(
    () =>
      inviteMembers(db, {
        podId,
        callerUserId: 'u-1',
        userIds: [],
        at: AT,
        newId,
      }),
    fails('validation_failed'),
  );
});

test('non-members get not_found; only the creator adds or removes', () => {
  const { db, newId } = setup();
  const { podId, invitationIds } = createPod(db, {
    name: 'Synthetic Pod',
    creatorUserId: 'u-1',
    inviteUserIds: ['u-2', 'u-3'],
    at: AT,
    newId,
  });
  for (const [i, inv] of invitationIds.entries())
    acceptInvitation(db, { invitationId: inv, userId: `u-${i + 2}`, at: AT });
  assert.throws(
    () => getPod(db, { podId, callerUserId: 'u-9', at: AT }),
    fails('not_found'),
  );
  assert.throws(
    () => getPod(db, { podId: 'no-pod', callerUserId: 'u-1', at: AT }),
    fails('not_found'),
  );
  assert.throws(
    () => createInviteLink(db, { podId, callerUserId: 'u-9', at: AT, newId }),
    fails('not_found'),
  );
  assert.throws(
    () =>
      inviteMembers(db, {
        podId,
        callerUserId: 'u-2',
        userIds: ['u-4'],
        at: AT,
        newId,
      }),
    fails('not_creator'),
  );
  assert.throws(
    () =>
      removeMember(db, { podId, callerUserId: 'u-2', userId: 'u-3', at: AT }),
    fails('not_creator'),
  );
  assert.throws(
    () =>
      removeMember(db, { podId, callerUserId: 'u-1', userId: 'u-1', at: AT }),
    fails('validation_failed'),
  );
  assert.throws(
    () =>
      removeMember(db, { podId, callerUserId: 'u-1', userId: 'u-9', at: AT }),
    fails('not_found'),
  );
  removeMember(db, { podId, callerUserId: 'u-1', userId: 'u-3', at: AT });
  assert.throws(
    () => getPod(db, { podId, callerUserId: 'u-3', at: AT }),
    fails('not_found'),
  );
  assert.equal(readyForPlanning(db, podId), false);
});

test('leaving keeps history and the member can rejoin; balances are untouched', () => {
  const { db, newId } = setup();
  const {
    podId,
    invitationIds: [inv],
  } = createPod(db, {
    name: 'Synthetic Pod',
    creatorUserId: 'u-1',
    inviteUserIds: ['u-2'],
    at: AT,
    newId,
  });
  acceptInvitation(db, { invitationId: inv, userId: 'u-2', at: AT });
  db.prepare(
    "INSERT INTO hangout (hangout_id, pod_id, state, created_at, updated_at) VALUES ('h-1', ?, 'BALANCES_OPEN', ?, ?)",
  ).run(podId, AT, AT);
  db.prepare(
    "INSERT INTO ledger_entry (entry_id, seq, hangout_id, debtor_user_id, creditor_user_id, kind, amount_cents, synthetic, created_at) VALUES ('e-1', 1, 'h-1', 'u-2', 'u-1', 'balance_created', 1250, 1, ?)",
  ).run(AT);
  leavePod(db, { podId, userId: 'u-2', at: AT });
  assert.throws(
    () => leavePod(db, { podId, userId: 'u-2', at: AT }),
    fails('not_found'),
  );
  assert.equal(
    db
      .prepare(
        "SELECT count(*) AS n FROM ledger_entry WHERE debtor_user_id = 'u-2'",
      )
      .get()?.n,
    1,
  );
  assert.ok(
    db.prepare("SELECT left_at FROM pod_membership WHERE user_id = 'u-2'").get()
      ?.left_at,
  );
  const link = createInviteLink(db, {
    podId,
    callerUserId: 'u-1',
    at: AT,
    newId,
  });
  acceptInviteLink(db, { token: link.token, userId: 'u-2', at: AT });
  assert.equal(
    getPod(db, { podId, callerUserId: 'u-2', at: AT }).members.find(
      (m) => m.userId === 'u-2',
    )?.status,
    'joined',
  );
});

test('a failure inside an operation rolls back everything it did', () => {
  const { db, newId } = setup();
  const before = rowCounts(db);
  // u-nobody fails validation after the pod row was inserted.
  assert.throws(
    () =>
      createPod(db, {
        name: 'Synthetic Pod',
        creatorUserId: 'u-1',
        inviteUserIds: ['u-2', 'u-nobody'],
        at: AT,
        newId,
      }),
    fails('not_found'),
  );
  assert.deepEqual(rowCounts(db), before);
});

test('ids are ULIDs', () => {
  const id = newUlid(Date.parse(AT));
  assert.match(id, /^[0-9A-HJKMNP-TV-Z]{26}$/);
  assert.ok(newUlid(Date.parse(AT)) !== id);
  assert.ok(newUlid(Date.parse(LATER)) > id, 'later ids sort later');
});
