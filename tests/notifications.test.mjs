// US-013: per-type switches, private reminders, and the Content + Behavioral send gate.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { createHangout } from '../services/api/src/db/hangout-store.mjs';
import { PodError, newUlid } from '../services/api/src/pods.mjs';
import {
  sendPodMessage,
  postPlannerCard,
  listPodMessages,
} from '../services/api/src/chat.mjs';
import {
  openActivityPoll,
  sendDueReminders,
} from '../services/api/src/polls.mjs';
import {
  NOTIFICATION_TYPES,
  KIND_TYPES,
  DEFAULT_SETTINGS,
  NotificationGate,
  getOwnNotificationSettings,
  setOwnNotificationSettings,
  registerPushToken,
  dispatch,
  notificationPort,
} from '../services/api/src/notifications.mjs';

const AT = '2026-11-12T12:00:00.000Z';
const APPROVAL = {
  contentDesignerRef: 'docs/02-design/VOICE_AND_TONE.md#v1',
  behavioralScientistRef: 'docs/04-behavioral/ETHICS_CHECKLIST.md#n1',
};

/** Pod p-a: u-1..u-4 joined with granted permission and a device each; u-4 muted the pod. */
function setup() {
  const db = openDatabase(':memory:');
  migrate(db);
  const user = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  const perm = db.prepare(
    "INSERT INTO permission_status (user_id, contacts, notifications, calendar, updated_at) VALUES (?, 'granted', ?, 'granted', ?)",
  );
  for (const i of [1, 2, 3, 4, 5]) {
    user.run(`u-${i}`, `Synth${i}`, `+155504000${i}`, AT);
    perm.run(`u-${i}`, i === 3 ? 'denied' : 'granted', AT);
  }
  db.prepare(
    "INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES ('p-a', 'Secret Supper Club', 'u-1', ?)",
  ).run(AT);
  const member = db.prepare(
    "INSERT INTO pod_membership (pod_id, user_id, role, muted, joined_at) VALUES ('p-a', ?, ?, ?, ?)",
  );
  for (const i of [1, 2, 3, 4])
    member.run(`u-${i}`, i === 1 ? 'creator' : 'member', i === 4 ? 1 : 0, AT);
  for (const i of [1, 2, 3, 4, 5])
    registerPushToken(db, {
      userId: `u-${i}`,
      platform: 'ios',
      token: `synthetic-token-${i}`,
      at: AT,
    });
  createHangout(db, {
    hangoutId: 'h-1',
    podId: 'p-a',
    actorUserId: 'u-1',
    at: AT,
  });
  /** @type {any[]} */
  const deliveries = [];
  return {
    db,
    sender: { send: (/** @type {any} */ d) => deliveries.push(d) },
    deliveries,
  };
}

test('exactly four switches, defaulting on, set only as a complete boolean set', () => {
  const { db } = setup();
  assert.deepEqual(NOTIFICATION_TYPES, [
    'polls',
    'reminders',
    'privateAsks',
    'money',
  ]);
  assert.deepEqual(getOwnNotificationSettings(db, 'u-1'), DEFAULT_SETTINGS);
  const off = {
    polls: false,
    reminders: true,
    privateAsks: true,
    money: false,
  };
  assert.deepEqual(
    setOwnNotificationSettings(db, { userId: 'u-1', settings: off, at: AT }),
    off,
  );
  assert.deepEqual(getOwnNotificationSettings(db, 'u-1'), off);
  assert.deepEqual(
    getOwnNotificationSettings(db, 'u-2'),
    DEFAULT_SETTINGS,
    'one member never changes another',
  );
  for (const bad of [
    { polls: false },
    { ...off, chat: true },
    { ...off, money: 'no' },
    null,
  ])
    assert.throws(
      () =>
        setOwnNotificationSettings(db, {
          userId: 'u-1',
          settings: /** @type {any} */ (bad),
          at: AT,
        }),
      (/** @type {any} */ e) =>
        e instanceof PodError && e.code === 'validation_failed',
    );
  for (const type of Object.values(KIND_TYPES))
    assert.ok(type === null || NOTIFICATION_TYPES.includes(type));
});

test('the gate cannot open a kind without both a Content and a Behavioral approval', () => {
  assert.throws(
    () =>
      new NotificationGate({
        approvals: {
          'card.time_poll': {
            contentDesignerRef: 'x',
            behavioralScientistRef: '',
          },
        },
      }),
    /both/,
  );
  assert.throws(
    () =>
      new NotificationGate({
        approvals: {
          'card.time_poll': /** @type {any} */ ({ contentDesignerRef: 'x' }),
        },
      }),
    /both/,
  );
  assert.throws(
    () =>
      new NotificationGate({
        approvals: { 'card.nudge_the_slacker': APPROVAL },
      }),
    /unknown notification kind/,
  );
  const gate = new NotificationGate({
    approvals: { 'card.time_poll': APPROVAL },
  });
  assert.equal(gate.isApproved('card.time_poll'), true);
  assert.equal(gate.isApproved('card.ready_check'), false);
  const closed = new NotificationGate();
  for (const kind of Object.keys(KIND_TYPES))
    assert.equal(closed.isApproved(kind), false, kind);
});

test('with no approvals recorded, nothing is sent: every eligible delivery is held', () => {
  const { db, sender, deliveries } = setup();
  const port = notificationPort(db, { gate: new NotificationGate(), sender });
  sendPodMessage(db, {
    podId: 'p-a',
    userId: 'u-1',
    clientMessageId: newUlid(),
    text: 'see you at 7',
    at: AT,
    push: port,
  });
  postPlannerCard(db, {
    podId: 'p-a',
    card: { cardType: 'ready_check', hangoutId: 'h-1' },
    at: AT,
    push: port,
  });
  assert.equal(deliveries.length, 0);
  assert.deepEqual(
    port.outcomes.map((o) => o.sent.length),
    [0, 0],
  );
  assert.deepEqual(port.outcomes[0].held, [{ userId: 'u-2' }]);
  assert.deepEqual(port.outcomes[0].suppressed, [
    { userId: 'u-3', reason: 'permission_not_granted' },
  ]);
});

test('approved kinds send pointer payloads that leak no text, names, pod name or amounts', () => {
  const { db, sender, deliveries } = setup();
  const gate = new NotificationGate({
    approvals: {
      'message.text': APPROVAL,
      'card.activity_shortlist': APPROVAL,
    },
  });
  const port = notificationPort(db, { gate, sender });
  const message = sendPodMessage(db, {
    podId: 'p-a',
    userId: 'u-1',
    clientMessageId: newUlid(),
    text: 'see you at 7',
    at: AT,
    push: port,
  });
  openActivityPoll(db, {
    hangoutId: 'h-1',
    closesAt: '2026-11-12T13:00:00.000Z',
    at: AT,
    push: port,
    options: [
      {
        title: 'Synthetic Lanes',
        venueOrOrganizer: 'Synthetic Bowl',
        startsAt: null,
        perPersonEstimateCents: 4500,
      },
    ],
  });
  assert.deepEqual(
    deliveries.map((d) => [d.userId, d.payload.kind]),
    [
      ['u-2', 'message.text'],
      ['u-1', 'card.activity_shortlist'],
      ['u-2', 'card.activity_shortlist'],
    ],
  );
  assert.deepEqual(deliveries[0].payload, {
    kind: 'message.text',
    podId: 'p-a',
    messageId: message.messageId,
  });
  const json = JSON.stringify(deliveries.map((d) => d.payload));
  for (const leak of [
    'see you at 7',
    'Secret Supper Club',
    'Synth1',
    'Synthetic Lanes',
  ])
    assert.ok(!json.includes(leak), `payload leaks ${leak}`);
  // Exact keys, all strings: no amount, budget or name can ride along.
  for (const { payload } of deliveries) {
    assert.deepEqual(Object.keys(payload).sort(), [
      'kind',
      'messageId',
      'podId',
    ]);
    assert.ok(Object.values(payload).every((v) => typeof v === 'string'));
  }
});

test('per-type switches suppress only their own type', () => {
  const { db, sender } = setup();
  const gate = new NotificationGate({
    approvals: {
      'card.ready_check': APPROVAL,
      'card.payer_and_split': APPROVAL,
      'reminder.balance_owed': APPROVAL,
    },
  });
  setOwnNotificationSettings(db, {
    userId: 'u-2',
    settings: { polls: false, reminders: true, privateAsks: true, money: true },
    at: AT,
  });
  const card = postPlannerCard(db, {
    podId: 'p-a',
    card: { cardType: 'ready_check', hangoutId: 'h-1' },
    at: AT,
  });
  const polls = dispatch(
    db,
    {
      kind: 'pod_message',
      podId: 'p-a',
      messageId: card.messageId,
      recipientUserIds: ['u-1', 'u-2'],
    },
    { gate, sender },
  );
  assert.deepEqual(
    polls.sent.map((s) => s.userId),
    ['u-1'],
  );
  assert.deepEqual(polls.suppressed, [
    { userId: 'u-2', reason: 'switched_off' },
  ]);
  const split = postPlannerCard(db, {
    podId: 'p-a',
    card: { cardType: 'payer_and_split', hangoutId: 'h-1' },
    at: AT,
  });
  const money = dispatch(
    db,
    {
      kind: 'pod_message',
      podId: 'p-a',
      messageId: split.messageId,
      recipientUserIds: ['u-2'],
    },
    { gate, sender },
  );
  assert.deepEqual(
    money.sent.map((s) => s.userId),
    ['u-2'],
    'polls off does not silence money',
  );
  setOwnNotificationSettings(db, {
    userId: 'u-2',
    settings: { polls: true, reminders: true, privateAsks: true, money: false },
    at: AT,
  });
  const owed = dispatch(
    db,
    {
      kind: 'private_reminder',
      userId: 'u-2',
      reminderKey: 'balance_owed',
      refId: 'h-1',
    },
    { gate, sender },
  );
  assert.deepEqual(owed.suppressed, [
    { userId: 'u-2', reason: 'switched_off' },
  ]);
});

test('private reminders and asks reach one member, carry no pod id, and never touch pod chat', () => {
  const { db, sender, deliveries } = setup();
  const gate = new NotificationGate({
    approvals: {
      'reminder.poll_closing': APPROVAL,
      'private_ask.stretch': APPROVAL,
    },
  });
  const port = notificationPort(db, { gate, sender });
  const pollId = openActivityPoll(db, {
    hangoutId: 'h-1',
    closesAt: '2026-11-12T12:30:00.000Z',
    at: AT,
    options: [
      {
        title: 'Synthetic Lanes',
        venueOrOrganizer: 'Synthetic Bowl',
        startsAt: null,
        perPersonEstimateCents: 3000,
      },
    ],
  });
  const before = JSON.stringify(
    listPodMessages(db, { podId: 'p-a', userId: 'u-1' }),
  );
  sendDueReminders(db, {
    at: '2026-11-12T12:10:00.000Z',
    windowMs: 30 * 60_000,
    push: port,
  });
  dispatch(
    db,
    { kind: 'private_ask', userId: 'u-2', refId: 'sa-1' },
    { gate, sender },
  );
  assert.equal(
    JSON.stringify(listPodMessages(db, { podId: 'p-a', userId: 'u-1' })),
    before,
    'pod chat unchanged',
  );
  const reminders = deliveries.filter(
    (d) => d.payload.kind === 'reminder.poll_closing',
  );
  // u-3 denied OS permission; u-4 muted the pod, but a private reminder is not a pod message.
  assert.deepEqual(
    reminders.map((d) => d.userId),
    ['u-1', 'u-2', 'u-4'],
  );
  for (const d of deliveries) {
    assert.equal(
      d.payload.podId,
      undefined,
      'private payloads carry no pod id',
    );
    assert.deepEqual(Object.keys(d.payload).sort(), ['kind', 'refId']);
  }
  assert.equal(reminders[0].payload.refId, pollId);
  assert.deepEqual(
    deliveries
      .filter((d) => d.payload.kind === 'private_ask.stretch')
      .map((d) => d.userId),
    ['u-2'],
  );
});

test('pod mute, membership, permission and devices are each respected', () => {
  const { db, sender } = setup();
  const gate = new NotificationGate({
    approvals: { 'message.text': APPROVAL },
  });
  const message = sendPodMessage(db, {
    podId: 'p-a',
    userId: 'u-1',
    clientMessageId: newUlid(),
    text: 'hi',
    at: AT,
  });
  db.prepare("DELETE FROM push_token WHERE user_id = 'u-2'").run();
  const outcome = dispatch(
    db,
    {
      kind: 'pod_message',
      podId: 'p-a',
      messageId: message.messageId,
      recipientUserIds: ['u-2', 'u-3', 'u-4', 'u-5', 'u-ghost'],
    },
    { gate, sender },
  );
  assert.deepEqual(outcome.sent, []);
  assert.deepEqual(outcome.suppressed, [
    { userId: 'u-2', reason: 'no_device' },
    { userId: 'u-3', reason: 'permission_not_granted' },
    { userId: 'u-4', reason: 'pod_muted' },
    { userId: 'u-5', reason: 'not_member' },
    { userId: 'u-ghost', reason: 'no_account' },
  ]);
  assert.throws(
    () =>
      dispatch(
        db,
        {
          kind: 'pod_message',
          podId: 'p-b',
          messageId: message.messageId,
          recipientUserIds: ['u-2'],
        },
        { gate, sender },
      ),
    /no message/,
  );
  assert.throws(
    () =>
      dispatch(
        db,
        {
          kind: 'private_reminder',
          userId: 'u-2',
          reminderKey: 'shame_them',
          refId: 'x',
        },
        { gate, sender },
      ),
    /unknown reminder/,
  );
});

test('a device token moves to its new owner and bad registrations are refused', () => {
  const { db } = setup();
  registerPushToken(db, {
    userId: 'u-2',
    platform: 'android',
    token: 'synthetic-token-1',
    at: AT,
  });
  assert.deepEqual(
    db
      .prepare(
        "SELECT user_id FROM push_token WHERE token = 'synthetic-token-1'",
      )
      .all()
      .map((r) => r.user_id),
    ['u-2'],
  );
  assert.throws(
    () =>
      registerPushToken(db, {
        userId: 'u-2',
        platform: /** @type {any} */ ('web'),
        token: 't',
        at: AT,
      }),
    PodError,
  );
  assert.throws(
    () =>
      registerPushToken(db, {
        userId: 'u-2',
        platform: 'ios',
        token: '',
        at: AT,
      }),
    PodError,
  );
});
