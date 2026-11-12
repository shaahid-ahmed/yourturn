// US-007: pod chat, the private planner chat and real-time delivery.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { PodError, newUlid, leavePod } from '../services/api/src/pods.mjs';
import {
  PodEventBus,
  sendPodMessage,
  postPlannerCard,
  listPodMessages,
  sendOwnPlannerChatMessage,
  postPlannerPrivateMessage,
  listOwnPlannerChat,
} from '../services/api/src/chat.mjs';

const AT = '2026-11-12T12:00:00.000Z';

/** @param {string} code */
const fails = (code) => (/** @type {any} */ error) =>
  error instanceof PodError && error.code === code;

/**
 * Two synthetic pods: p-a has u-1, u-2, u-3 (u-3 muted); p-b has u-4, u-5.
 * Each pod has one hangout and poll.
 */
function setup() {
  const db = openDatabase(':memory:');
  migrate(db);
  const user = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  for (let i = 1; i <= 6; i += 1)
    user.run(`u-${i}`, `Synth${i}`, `+155502000${i}`, AT);
  const pod = db.prepare(
    'INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
  );
  const member = db.prepare(
    'INSERT INTO pod_membership (pod_id, user_id, role, muted, joined_at) VALUES (?, ?, ?, ?, ?)',
  );
  pod.run('p-a', 'Pod A', 'u-1', AT);
  member.run('p-a', 'u-1', 'creator', 0, AT);
  member.run('p-a', 'u-2', 'member', 0, AT);
  member.run('p-a', 'u-3', 'member', 1, AT);
  pod.run('p-b', 'Pod B', 'u-4', AT);
  member.run('p-b', 'u-4', 'creator', 0, AT);
  member.run('p-b', 'u-5', 'member', 0, AT);
  const hangout = db.prepare(
    "INSERT INTO hangout (hangout_id, pod_id, state, created_at, updated_at) VALUES (?, ?, 'ACTIVITY_VOTE', ?, ?)",
  );
  hangout.run('h-a', 'p-a', AT, AT);
  hangout.run('h-b', 'p-b', AT, AT);
  const poll = db.prepare(
    "INSERT INTO poll (poll_id, hangout_id, kind, status, closes_at) VALUES (?, ?, 'activity', 'open', ?)",
  );
  poll.run('poll-a', 'h-a', AT);
  poll.run('poll-b', 'h-b', AT);
  /** @type {any[]} */
  const pushes = [];
  const push = { enqueue: (/** @type {any} */ intent) => pushes.push(intent) };
  return { db, push, pushes, bus: new PodEventBus(db) };
}

/** @param {number} n */
const at = (n) => `2026-11-12T12:00:${String(n).padStart(2, '0')}.000Z`;

test('a member sends a text message; a resend returns the original', () => {
  const { db } = setup();
  const clientMessageId = newUlid();
  const first = sendPodMessage(db, {
    podId: 'p-a',
    userId: 'u-1',
    clientMessageId,
    text: 'Bowling Thursday?',
    at: AT,
  });
  assert.deepEqual(Object.keys(first).sort(), [
    'author',
    'kind',
    'messageId',
    'podId',
    'sentAt',
    'text',
  ]);
  assert.deepEqual(first.author, {
    kind: 'member',
    userId: 'u-1',
    firstName: 'Synth1',
  });
  const again = sendPodMessage(db, {
    podId: 'p-a',
    userId: 'u-1',
    clientMessageId,
    text: 'Bowling Thursday?',
    at: at(5),
  });
  assert.deepEqual(again, first);
  assert.equal(db.prepare('SELECT count(*) AS n FROM pod_message').get()?.n, 1);
  for (const text of ['', '   ', 'x'.repeat(2001), /** @type {any} */ (42)])
    assert.throws(
      () =>
        sendPodMessage(db, {
          podId: 'p-a',
          userId: 'u-1',
          clientMessageId: newUlid(),
          text,
          at: AT,
        }),
      fails('validation_failed'),
    );
  assert.throws(
    () =>
      sendPodMessage(db, {
        podId: 'p-a',
        userId: 'u-1',
        clientMessageId: 'nope',
        text: 'hi',
        at: AT,
      }),
    fails('validation_failed'),
  );
});

test('a non-member cannot read or write a pod, and gets not_found', () => {
  const { db, bus } = setup();
  assert.throws(
    () =>
      sendPodMessage(db, {
        podId: 'p-a',
        userId: 'u-4',
        clientMessageId: newUlid(),
        text: 'hi',
        at: AT,
      }),
    fails('not_found'),
  );
  assert.throws(
    () => listPodMessages(db, { podId: 'p-a', userId: 'u-4' }),
    fails('not_found'),
  );
  assert.throws(
    () => listPodMessages(db, { podId: 'no-pod', userId: 'u-1' }),
    fails('not_found'),
  );
  assert.throws(
    () => bus.subscribe({ podId: 'p-a', userId: 'u-4' }, () => {}),
    fails('not_found'),
  );
});

test('no chat content from one pod appears in another pod', () => {
  const { db, bus } = setup();
  sendPodMessage(db, {
    podId: 'p-a',
    userId: 'u-1',
    clientMessageId: newUlid(),
    text: 'secret plan for A',
    at: AT,
  });
  postPlannerCard(db, {
    podId: 'p-a',
    card: {
      cardType: 'activity_shortlist',
      hangoutId: 'h-a',
      pollId: 'poll-a',
    },
    at: AT,
  });
  const b = listPodMessages(db, { podId: 'p-b', userId: 'u-4' });
  assert.deepEqual(b.messages, []);
  assert.ok(!JSON.stringify(b).includes('secret'));
  // A card cannot point at another pod's hangout or poll.
  assert.throws(
    () =>
      postPlannerCard(db, {
        podId: 'p-b',
        card: { cardType: 'time_poll', hangoutId: 'h-a' },
        at: AT,
      }),
    fails('not_found'),
  );
  assert.throws(
    () =>
      postPlannerCard(db, {
        podId: 'p-b',
        card: { cardType: 'time_poll', hangoutId: 'h-b', pollId: 'poll-a' },
        at: AT,
      }),
    fails('not_found'),
  );
  // The event bus delivers only to the pod's own members.
  /** @type {any[]} */ const seenA = [];
  /** @type {any[]} */ const seenB = [];
  bus.subscribe({ podId: 'p-a', userId: 'u-2' }, (e) => seenA.push(e));
  bus.subscribe({ podId: 'p-b', userId: 'u-5' }, (e) => seenB.push(e));
  sendPodMessage(db, {
    podId: 'p-a',
    userId: 'u-1',
    clientMessageId: newUlid(),
    text: 'again',
    bus,
    at: AT,
  });
  assert.equal(seenA.length, 1);
  assert.equal(seenB.length, 0);
});

test('the planner is its own participant and posts structured cards', () => {
  const { db } = setup();
  const card = postPlannerCard(db, {
    podId: 'p-a',
    card: {
      cardType: 'activity_shortlist',
      hangoutId: 'h-a',
      pollId: 'poll-a',
    },
    at: AT,
  });
  assert.deepEqual(card.author, { kind: 'planner' });
  assert.equal(card.kind, 'card');
  assert.deepEqual(card.card, {
    cardType: 'activity_shortlist',
    hangoutId: 'h-a',
    pollId: 'poll-a',
  });
  assert.equal(/** @type {any} */ (card).text, undefined);
  const offer = postPlannerCard(db, {
    podId: 'p-a',
    card: {
      cardType: 'planner_offer',
      hangoutId: 'h-a',
      offer: 'widen_window',
    },
    at: AT,
  });
  assert.equal(offer.card?.offer, 'widen_window');
  assert.throws(
    () =>
      postPlannerCard(db, {
        podId: 'p-a',
        card: { cardType: 'planner_offer', offer: 'blame_sam' },
        at: AT,
      }),
    fails('validation_failed'),
  );
  assert.throws(
    () =>
      postPlannerCard(db, {
        podId: 'p-a',
        card: { cardType: 'time_poll', offer: 'next_best' },
        at: AT,
      }),
    fails('validation_failed'),
  );
  assert.throws(
    () =>
      postPlannerCard(db, {
        podId: 'p-a',
        card: { cardType: 'why_this_one' },
        at: AT,
      }),
    fails('validation_failed'),
  );
  assert.throws(
    () =>
      postPlannerCard(db, {
        podId: 'no-pod',
        card: { cardType: 'time_poll' },
        at: AT,
      }),
    fails('not_found'),
  );
});

test('pagination is newest first and stable when messages share a timestamp', () => {
  const { db } = setup();
  /** @type {string[]} */
  const sent = [];
  for (let i = 0; i < 7; i += 1) {
    const ts = i < 4 ? AT : at(i); // four messages at the same instant
    sent.push(
      sendPodMessage(db, {
        podId: 'p-a',
        userId: 'u-1',
        clientMessageId: newUlid(),
        text: `m${i}`,
        at: ts,
      }).messageId,
    );
  }
  /** @type {string[]} */
  const seen = [];
  let cursor = null;
  let pages = 0;
  do {
    const page = listPodMessages(db, {
      podId: 'p-a',
      userId: 'u-2',
      cursor,
      limit: 3,
    });
    seen.push(...page.messages.map((m) => /** @type {any} */ (m).messageId));
    cursor = page.nextCursor;
    pages += 1;
  } while (cursor);
  assert.equal(pages, 3);
  assert.equal(seen.length, 7);
  assert.equal(new Set(seen).size, 7, 'no duplicates across pages');
  assert.deepEqual(new Set(seen), new Set(sent));
  const all = listPodMessages(db, {
    podId: 'p-a',
    userId: 'u-2',
    limit: 100,
  }).messages.map((m) => /** @type {any} */ (m).sentAt);
  assert.deepEqual(all, [...all].sort().reverse());
  assert.throws(
    () => listPodMessages(db, { podId: 'p-a', userId: 'u-2', limit: 101 }),
    fails('validation_failed'),
  );
  assert.throws(
    () => listPodMessages(db, { podId: 'p-a', userId: 'u-2', limit: 0 }),
    fails('validation_failed'),
  );
  assert.throws(
    () =>
      listPodMessages(db, { podId: 'p-a', userId: 'u-2', cursor: 'garbage!!' }),
    fails('validation_failed'),
  );
});

test('stream events and push intents are pointers, never message text', () => {
  const { db, bus, push, pushes } = setup();
  /** @type {any[]} */ const events = [];
  bus.subscribe({ podId: 'p-a', userId: 'u-2' }, (e) => events.push(e));
  const sentId = newUlid();
  const message = sendPodMessage(db, {
    podId: 'p-a',
    userId: 'u-1',
    clientMessageId: sentId,
    text: 'meet at 7',
    bus,
    push,
    at: AT,
  });
  assert.equal(events.length, 1);
  assert.deepEqual(Object.keys(events[0]).sort(), [
    'at',
    'eventId',
    'messageId',
    'podId',
    'type',
  ]);
  assert.equal(events[0].type, 'message.created');
  assert.equal(events[0].messageId, message.messageId);
  // Push goes to joined, unmuted members other than the sender.
  assert.deepEqual(pushes, [
    {
      kind: 'pod_message',
      podId: 'p-a',
      messageId: message.messageId,
      recipientUserIds: ['u-2'],
    },
  ]);
  assert.ok(!JSON.stringify([events, pushes]).includes('meet at 7'));
  // A planner card notifies every unmuted member.
  postPlannerCard(db, {
    podId: 'p-a',
    card: { cardType: 'ready_check', hangoutId: 'h-a' },
    bus,
    push,
    at: AT,
  });
  assert.deepEqual(pushes[1].recipientUserIds, ['u-1', 'u-2']);
  // A resend delivers nothing again.
  const before = [events.length, pushes.length];
  sendPodMessage(db, {
    podId: 'p-a',
    userId: 'u-1',
    clientMessageId: sentId,
    text: 'meet at 7',
    bus,
    push,
    at: AT,
  });
  assert.deepEqual([events.length, pushes.length], before);
});

test('a member who leaves stops receiving events at once', () => {
  const { db, bus } = setup();
  /** @type {any[]} */ const events = [];
  const unsubscribe = bus.subscribe({ podId: 'p-a', userId: 'u-2' }, (e) =>
    events.push(e),
  );
  sendPodMessage(db, {
    podId: 'p-a',
    userId: 'u-1',
    clientMessageId: newUlid(),
    text: 'one',
    bus,
    at: AT,
  });
  leavePod(db, { podId: 'p-a', userId: 'u-2', at: AT });
  sendPodMessage(db, {
    podId: 'p-a',
    userId: 'u-1',
    clientMessageId: newUlid(),
    text: 'two',
    bus,
    at: AT,
  });
  assert.equal(events.length, 1);
  unsubscribe();
  sendPodMessage(db, {
    podId: 'p-a',
    userId: 'u-1',
    clientMessageId: newUlid(),
    text: 'three',
    bus,
    at: AT,
  });
  assert.equal(events.length, 1);
});

test('the private planner chat belongs to one member and has no path into a pod', () => {
  const { db } = setup();
  const clientMessageId = newUlid();
  const mine = sendOwnPlannerChatMessage(db, {
    userId: 'u-1',
    clientMessageId,
    text: 'I am vegetarian now',
    at: AT,
  });
  assert.deepEqual(
    mine,
    sendOwnPlannerChatMessage(db, {
      userId: 'u-1',
      clientMessageId,
      text: 'I am vegetarian now',
      at: at(3),
    }),
  );
  postPlannerPrivateMessage(db, {
    userId: 'u-1',
    kind: 'reminder',
    reminderKey: 'balance_owed',
    at: at(1),
  });
  const page = listOwnPlannerChat(db, { userId: 'u-1' });
  assert.deepEqual(
    page.messages.map((m) => /** @type {any} */ (m).author),
    ['planner', 'me'],
  );
  assert.deepEqual(
    listOwnPlannerChat(db, { userId: 'u-2' }).messages,
    [],
    'another member sees nothing',
  );
  for (const podId of ['p-a', 'p-b'])
    assert.ok(
      !JSON.stringify(
        listPodMessages(db, { podId, userId: podId === 'p-a' ? 'u-1' : 'u-4' }),
      ).includes('vegetarian'),
    );
  assert.ok(!JSON.stringify(page).includes('podId'));
  assert.throws(
    () =>
      sendOwnPlannerChatMessage(db, {
        userId: 'u-nobody',
        clientMessageId: newUlid(),
        text: 'hi',
        at: AT,
      }),
    fails('not_found'),
  );
});

test('a stretch ask goes only to the member it is about', () => {
  const { db } = setup();
  db.prepare(
    "INSERT INTO stretch_ask (stretch_ask_id, hangout_id, user_id, option_title, per_person_cost_cents, deadline, status) VALUES ('sa-1', 'h-a', 'u-2', 'Synthetic Lanes', 4500, ?, 'pending')",
  ).run(AT);
  const ask = postPlannerPrivateMessage(db, {
    userId: 'u-2',
    kind: 'stretch_ask',
    stretchAskId: 'sa-1',
    at: AT,
  });
  assert.equal(/** @type {any} */ (ask).stretchAskId, 'sa-1');
  assert.throws(
    () =>
      postPlannerPrivateMessage(db, {
        userId: 'u-1',
        kind: 'stretch_ask',
        stretchAskId: 'sa-1',
        at: AT,
      }),
    fails('not_found'),
  );
  assert.throws(
    () =>
      postPlannerPrivateMessage(db, {
        userId: 'u-2',
        kind: 'stretch_ask',
        at: AT,
      }),
    fails('validation_failed'),
  );
  assert.throws(
    () =>
      postPlannerPrivateMessage(db, {
        userId: 'u-2',
        kind: 'reminder',
        reminderKey: 'shame',
        at: AT,
      }),
    fails('validation_failed'),
  );
  assert.throws(
    () =>
      postPlannerPrivateMessage(db, { userId: 'u-2', kind: 'gossip', at: AT }),
    fails('validation_failed'),
  );
  for (const podId of ['p-a']) {
    const json = JSON.stringify(listPodMessages(db, { podId, userId: 'u-1' }));
    assert.ok(
      !json.includes('sa-1') && !json.includes('stretch'),
      'the pod never sees the ask',
    );
  }
});
