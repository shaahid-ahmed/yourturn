// US-015: the authorization matrix, executed. Every pod-scoped operation that
// exists so far is called by an outsider, by a member of another pod, and with
// another pod's ids, and must refuse with not_found (never revealing that the
// pod exists). Creator-only and payer-only rules are checked by role.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { createHangout } from '../services/api/src/db/hangout-store.mjs';
import {
  transition,
  IllegalTransitionError,
} from '../services/api/src/hangout-lifecycle.mjs';
import {
  PodError,
  newUlid,
  getPod,
  inviteMembers,
  removeMember,
  createInviteLink,
  revokeInviteLink,
  leavePod,
} from '../services/api/src/pods.mjs';
import {
  PodEventBus,
  sendPodMessage,
  listPodMessages,
  postPlannerCard,
  listOwnPlannerChat,
  sendOwnPlannerChatMessage,
} from '../services/api/src/chat.mjs';
import {
  openActivityPoll,
  getPoll,
  castOwnVote,
  getReadyCheck,
  setOwnReadyAnswer,
} from '../services/api/src/polls.mjs';

const AT = '2026-11-12T12:00:00.000Z';

/** Two pods. p-a: u-1 (creator), u-2. p-b: u-3 (creator), u-4. u-9 belongs to neither. */
function world() {
  const db = openDatabase(':memory:');
  migrate(db);
  const user = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  const perm = db.prepare(
    "INSERT INTO permission_status (user_id, contacts, notifications, calendar, updated_at) VALUES (?, 'granted', 'granted', 'granted', ?)",
  );
  for (const i of [1, 2, 3, 4, 5, 9]) {
    user.run(`u-${i}`, `Synth${i}`, `+155505000${i}`, AT);
    perm.run(`u-${i}`, AT);
  }
  const pod = db.prepare(
    'INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
  );
  const member = db.prepare(
    'INSERT INTO pod_membership (pod_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
  );
  pod.run('p-a', 'Pod A', 'u-1', AT);
  member.run('p-a', 'u-1', 'creator', AT);
  member.run('p-a', 'u-2', 'member', AT);
  pod.run('p-b', 'Pod B', 'u-3', AT);
  member.run('p-b', 'u-3', 'creator', AT);
  member.run('p-b', 'u-4', 'member', AT);
  createHangout(db, {
    hangoutId: 'h-a',
    podId: 'p-a',
    actorUserId: 'u-1',
    at: AT,
  });
  createHangout(db, {
    hangoutId: 'h-b',
    podId: 'p-b',
    actorUserId: 'u-3',
    at: AT,
  });
  const option = [
    {
      title: 'Synthetic Lanes',
      venueOrOrganizer: 'Synthetic Bowl',
      startsAt: null,
      perPersonEstimateCents: 2000,
    },
  ];
  const pollA = openActivityPoll(db, {
    hangoutId: 'h-a',
    options: option,
    closesAt: '2026-11-13T00:00:00.000Z',
    at: AT,
  });
  const pollB = openActivityPoll(db, {
    hangoutId: 'h-b',
    options: option,
    closesAt: '2026-11-13T00:00:00.000Z',
    at: AT,
  });
  const optionA = getPoll(db, {
    podId: 'p-a',
    hangoutId: 'h-a',
    pollId: pollA,
    userId: 'u-1',
  }).options[0].optionId;
  const link = createInviteLink(db, {
    podId: 'p-a',
    callerUserId: 'u-1',
    at: AT,
  });
  return { db, pollA, pollB, optionA, link };
}

/** @param {string} code */
const refuses = (code) => (/** @type {any} */ error) =>
  error instanceof PodError && error.code === code;

/**
 * Every pod-scoped operation, as a function of (caller, podId, hangoutId, pollId).
 * @param {ReturnType<typeof world>} w
 * @returns {Record<string, (caller: string, podId: string, hangoutId?: string, pollId?: string) => unknown>}
 */
function operations(w) {
  const { db } = w;
  return {
    getPod: (u, p) => getPod(db, { podId: p, callerUserId: u, at: AT }),
    listPodMessages: (u, p) => listPodMessages(db, { podId: p, userId: u }),
    sendPodMessage: (u, p) =>
      sendPodMessage(db, {
        podId: p,
        userId: u,
        clientMessageId: newUlid(),
        text: 'hello',
        at: AT,
      }),
    subscribe: (u, p) =>
      new PodEventBus(db).subscribe({ podId: p, userId: u }, () => {}),
    createInviteLink: (u, p) =>
      createInviteLink(db, { podId: p, callerUserId: u, at: AT }),
    revokeInviteLink: (u, p) =>
      revokeInviteLink(db, {
        podId: p,
        inviteLinkId: w.link.inviteLinkId,
        callerUserId: u,
        at: AT,
      }),
    leavePod: (u, p) => leavePod(db, { podId: p, userId: u, at: AT }),
    inviteMembers: (u, p) =>
      inviteMembers(db, {
        podId: p,
        callerUserId: u,
        userIds: ['u-5'],
        at: AT,
      }),
    removeMember: (u, p) =>
      removeMember(db, { podId: p, callerUserId: u, userId: 'u-2', at: AT }),
    getPoll: (u, p, h = 'h-a', poll = w.pollA) =>
      getPoll(db, { podId: p, hangoutId: h, pollId: poll, userId: u }),
    castOwnVote: (u, p, h = 'h-a', poll = w.pollA) =>
      castOwnVote(db, {
        podId: p,
        hangoutId: h,
        pollId: poll,
        userId: u,
        optionId: w.optionA,
        at: AT,
      }),
    getReadyCheck: (u, p, h = 'h-a') =>
      getReadyCheck(db, { podId: p, hangoutId: h, userId: u }),
    setOwnReadyAnswer: (u, p, h = 'h-a') =>
      setOwnReadyAnswer(db, {
        podId: p,
        hangoutId: h,
        userId: u,
        answer: 'no',
        at: AT,
      }),
  };
}

test('an outsider gets not_found from every pod-scoped operation', () => {
  for (const [name, call] of Object.entries(operations(world()))) {
    assert.throws(
      () => call('u-9', 'p-a'),
      refuses('not_found'),
      `${name} as an outsider`,
    );
  }
});

test('a member of another pod gets not_found, identical to a pod that does not exist', () => {
  for (const [name, call] of Object.entries(operations(world()))) {
    assert.throws(
      () => call('u-3', 'p-a'),
      refuses('not_found'),
      `${name} as pod B's creator`,
    );
    assert.throws(
      () => call('u-1', 'p-missing'),
      refuses('not_found'),
      `${name} on a missing pod`,
    );
  }
});

test("a member cannot reach another pod's hangout or poll through their own pod's path", () => {
  const w = world();
  const ops = operations(w);
  assert.throws(
    () => ops.getPoll('u-1', 'p-a', 'h-a', w.pollB),
    refuses('not_found'),
  );
  assert.throws(
    () => ops.getPoll('u-1', 'p-a', 'h-b', w.pollB),
    refuses('not_found'),
  );
  assert.throws(
    () => ops.castOwnVote('u-1', 'p-a', 'h-a', w.pollB),
    refuses('not_found'),
  );
  assert.throws(
    () => ops.getReadyCheck('u-1', 'p-a', 'h-b'),
    refuses('not_found'),
  );
  assert.throws(
    () => ops.setOwnReadyAnswer('u-1', 'p-a', 'h-b'),
    refuses('not_found'),
  );
  assert.throws(
    () =>
      postPlannerCard(w.db, {
        podId: 'p-a',
        card: { cardType: 'time_poll', hangoutId: 'h-b' },
        at: AT,
      }),
    refuses('not_found'),
  );
});

test('creator-only operations refuse a plain member with not_creator', () => {
  const ops = operations(world());
  assert.throws(() => ops.inviteMembers('u-2', 'p-a'), refuses('not_creator'));
  assert.throws(() => ops.removeMember('u-2', 'p-a'), refuses('not_creator'));
});

test('payer-only transitions refuse anyone who is not the payer', () => {
  const notPayer = (/** @type {any} */ e) =>
    e instanceof IllegalTransitionError && e.code === 'not_payer';
  assert.throws(
    () =>
      transition('AWAITING_CONFIRMATION', 'bookingConfirmed', {
        payerChosen: true,
        actorIsPayer: false,
      }),
    notPayer,
  );
  assert.throws(
    () => transition('BOOKED', 'splitConfirmed', { actorIsPayer: false }),
    notPayer,
  );
});

test('the private planner chat is reachable only by its owner', () => {
  const { db } = world();
  sendOwnPlannerChatMessage(db, {
    userId: 'u-1',
    clientMessageId: newUlid(),
    text: 'my budget is private',
    at: AT,
  });
  for (const other of ['u-2', 'u-3', 'u-9'])
    assert.deepEqual(
      listOwnPlannerChat(db, { userId: other }).messages,
      [],
      other,
    );
  for (const [podId, userId] of [
    ['p-a', 'u-2'],
    ['p-b', 'u-3'],
  ])
    assert.ok(
      !JSON.stringify(listPodMessages(db, { podId, userId })).includes(
        'budget',
      ),
    );
});
