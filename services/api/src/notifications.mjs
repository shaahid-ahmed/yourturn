/**
 * Notifications and push (US-013), over the US-002 schema.
 *
 * Rules:
 * - **Per-type switches.** Each member has exactly four: polls, reminders,
 *   private asks and money (contract NotificationSettings). A switched-off
 *   type is never sent to that member.
 * - **Private reminders never go into pod chat.** Reminders and private asks
 *   reach one member as a push only; the dispatcher has no path that writes a
 *   pod message, and their payload carries no pod id.
 * - **No notification is sent without Content + Behavioral approval.** The
 *   send gate is keyed by notification kind and can only open a kind that
 *   records both a Content Designer and a Behavioral Scientist approval
 *   reference. With no approvals recorded, every notification is held.
 * - **Payloads are pointers.** A push names the kind and the object to open,
 *   never message text, an amount, a budget, a pod name or another member's
 *   name, so a lock screen cannot leak them.
 *
 * The actual push provider (APNs/FCM) is not wired: sending goes to an
 * injected sender, and the default sends nothing.
 */
import { inTransaction } from './db/transaction.mjs';
import { PodError, newUlid } from './pods.mjs';

/** @typedef {import('node:sqlite').DatabaseSync} DatabaseSync */
/** @typedef {import('./chat.mjs').PushIntent} PushIntent */

/** The four switches, in the contract's order. */
export const NOTIFICATION_TYPES = Object.freeze([
  'polls',
  'reminders',
  'privateAsks',
  'money',
]);

/**
 * Which switch governs each notification kind. `null` means the spec names
 * no switch for it; only the pod mute and the send gate apply. Those rows are
 * open questions for Content and Behavioral, not decisions.
 *
 * @type {Readonly<Record<string, 'polls' | 'reminders' | 'privateAsks' | 'money' | null>>}
 */
export const KIND_TYPES = Object.freeze({
  'message.text': null,
  'card.activity_shortlist': 'polls',
  'card.time_poll': 'polls',
  'card.ready_check': 'polls',
  'card.planner_offer': 'polls',
  'card.event_suggestion': 'polls',
  'card.booking_confirmation': 'polls',
  'card.payer_and_split': 'money',
  'reminder.poll_closing': 'reminders',
  'reminder.ready_check_open': 'reminders',
  'reminder.booking_confirmation_needed': 'reminders',
  'reminder.balance_owed': 'money',
  'private_ask.stretch': 'privateAsks',
});

/**
 * @typedef {object} Approval
 * @property {string} contentDesignerRef where the Content Designer approval of this copy is recorded
 * @property {string} behavioralScientistRef where the Behavioral Scientist approval is recorded
 */

/**
 * The send gate. Closed for every kind unless that kind carries both
 * approval references; it cannot be constructed otherwise.
 */
export class NotificationGate {
  /** @type {Map<string, Approval>} */
  #approved = new Map();

  /** @param {{ approvals?: Record<string, Approval> }} [input] */
  constructor({ approvals = {} } = {}) {
    for (const [kind, approval] of Object.entries(approvals)) {
      if (!(kind in KIND_TYPES))
        throw new RangeError(`unknown notification kind ${kind}`);
      if (
        !approval?.contentDesignerRef?.trim() ||
        !approval?.behavioralScientistRef?.trim()
      )
        throw new Error(
          `${kind} needs both a Content Designer and a Behavioral Scientist approval reference`,
        );
      this.#approved.set(kind, { ...approval });
    }
  }

  /** @param {string} kind */
  isApproved(kind) {
    return this.#approved.has(kind);
  }
}

/**
 * @typedef {object} NotificationSettings
 * @property {boolean} polls
 * @property {boolean} reminders
 * @property {boolean} privateAsks
 * @property {boolean} money
 */

/**
 * Defaults for a member who has never changed a switch: every type on. The
 * phone's own notification permission still has to be granted before
 * anything is sent. The default is a proposal for Behavioral review.
 */
export const DEFAULT_SETTINGS = Object.freeze({
  polls: true,
  reminders: true,
  privateAsks: true,
  money: true,
});

/**
 * @param {DatabaseSync} db
 * @param {string} userId
 * @returns {NotificationSettings}
 */
export function getOwnNotificationSettings(db, userId) {
  const row = /** @type {any} */ (
    db
      .prepare(
        'SELECT polls, reminders, private_asks, money FROM notification_settings WHERE user_id = ?',
      )
      .get(userId)
  );
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    polls: row.polls === 1,
    reminders: row.reminders === 1,
    privateAsks: row.private_asks === 1,
    money: row.money === 1,
  };
}

/**
 * @param {DatabaseSync} db
 * @param {{ userId: string, settings: NotificationSettings, at: string }} input
 * @returns {NotificationSettings}
 */
export function setOwnNotificationSettings(db, { userId, settings, at }) {
  const keys = Object.keys(settings ?? {}).sort();
  if (
    keys.join() !== [...NOTIFICATION_TYPES].sort().join() ||
    !NOTIFICATION_TYPES.every(
      (k) => typeof (/** @type {any} */ (settings)[k]) === 'boolean',
    )
  )
    throw new PodError(
      'validation_failed',
      'send exactly polls, reminders, privateAsks and money as booleans',
      [{ field: 'settings', problem: 'shape' }],
    );
  const b = (/** @type {boolean} */ v) => (v ? 1 : 0);
  db.prepare(
    `INSERT INTO notification_settings (user_id, polls, reminders, private_asks, money, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET polls = excluded.polls, reminders = excluded.reminders,
       private_asks = excluded.private_asks, money = excluded.money, updated_at = excluded.updated_at`,
  ).run(
    userId,
    b(settings.polls),
    b(settings.reminders),
    b(settings.privateAsks),
    b(settings.money),
    at,
  );
  return getOwnNotificationSettings(db, userId);
}

/**
 * Register this device. A token already registered to someone else moves to
 * the caller, because the device changed hands.
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, platform: 'ios' | 'android', token: string, at: string, newId?: () => string }} input
 * @returns {{ pushTokenId: string, platform: string, createdAt: string }}
 */
export function registerPushToken(
  db,
  { userId, platform, token, at, newId = () => newUlid() },
) {
  if (platform !== 'ios' && platform !== 'android')
    throw new PodError('validation_failed', 'platform is ios or android', [
      { field: 'platform', problem: 'enum' },
    ]);
  if (typeof token !== 'string' || token.length < 1 || token.length > 4096)
    throw new PodError('validation_failed', 'bad token', [
      { field: 'token', problem: 'length' },
    ]);
  return inTransaction(db, () => {
    db.prepare('DELETE FROM push_token WHERE token = ?').run(token);
    const pushTokenId = newId();
    db.prepare(
      'INSERT INTO push_token (push_token_id, user_id, platform, token, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(pushTokenId, userId, platform, token, at);
    return { pushTokenId, platform, createdAt: at };
  });
}

/**
 * @typedef {object} Sender
 * @property {(delivery: { userId: string, token: string, platform: string, payload: Record<string, string> }) => void} send
 */

/** Sends nothing. The default until a provider is wired. */
export const NO_SENDER = Object.freeze({ send: () => {} });

/**
 * @typedef {object} Outcome
 * @property {string} kind
 * @property {{ userId: string, payload: Record<string, string> }[]} sent
 * @property {{ userId: string }[]} held not sent because the copy is not approved
 * @property {{ userId: string, reason: string }[]} suppressed
 */

/**
 * Resolve an intent to its kind, recipients and pointer payload.
 * @param {DatabaseSync} db
 * @param {PushIntent} intent
 * @returns {{ kind: string, recipients: string[], payload: Record<string, string>, podId: string | null }}
 */
function resolve(db, intent) {
  if (intent.kind === 'pod_message') {
    const row = /** @type {any} */ (
      db
        .prepare(
          'SELECT kind, card_type FROM pod_message WHERE message_id = ? AND pod_id = ?',
        )
        .get(intent.messageId, intent.podId)
    );
    if (!row)
      throw new RangeError(
        `no message ${intent.messageId} in pod ${intent.podId}`,
      );
    const kind = row.kind === 'text' ? 'message.text' : `card.${row.card_type}`;
    return {
      kind,
      recipients: intent.recipientUserIds,
      payload: { kind, podId: intent.podId, messageId: intent.messageId },
      podId: intent.podId,
    };
  }
  if (intent.kind === 'private_reminder') {
    const kind = `reminder.${intent.reminderKey}`;
    if (!(kind in KIND_TYPES))
      throw new RangeError(`unknown reminder ${intent.reminderKey}`);
    return {
      kind,
      recipients: [intent.userId],
      payload: { kind, refId: intent.refId },
      podId: null,
    };
  }
  if (intent.kind === 'private_ask') {
    return {
      kind: 'private_ask.stretch',
      recipients: [intent.userId],
      payload: { kind: 'private_ask.stretch', refId: intent.refId },
      podId: null,
    };
  }
  throw new RangeError(`unknown intent ${/** @type {any} */ (intent).kind}`);
}

/**
 * Decide, for each recipient, whether an intent is sent, held or suppressed.
 *
 * @param {DatabaseSync} db
 * @param {PushIntent} intent
 * @param {{ gate: NotificationGate, sender?: Sender }} options
 * @returns {Outcome}
 */
export function dispatch(db, intent, { gate, sender = NO_SENDER }) {
  const { kind, recipients, payload, podId } = resolve(db, intent);
  const type = KIND_TYPES[kind];
  /** @type {Outcome} */
  const outcome = { kind, sent: [], held: [], suppressed: [] };
  for (const userId of [...new Set(recipients)].sort()) {
    const user = db
      .prepare(
        'SELECT 1 AS ok FROM app_user WHERE user_id = ? AND deleted_at IS NULL',
      )
      .get(userId);
    if (!user) {
      outcome.suppressed.push({ userId, reason: 'no_account' });
      continue;
    }
    if (podId) {
      const member = /** @type {any} */ (
        db
          .prepare(
            'SELECT muted FROM pod_membership WHERE pod_id = ? AND user_id = ? AND left_at IS NULL',
          )
          .get(podId, userId)
      );
      if (!member) {
        outcome.suppressed.push({ userId, reason: 'not_member' });
        continue;
      }
      if (member.muted === 1) {
        outcome.suppressed.push({ userId, reason: 'pod_muted' });
        continue;
      }
    }
    if (type && !getOwnNotificationSettings(db, userId)[type]) {
      outcome.suppressed.push({ userId, reason: 'switched_off' });
      continue;
    }
    const permission = db
      .prepare('SELECT notifications FROM permission_status WHERE user_id = ?')
      .get(userId);
    if (permission?.notifications !== 'granted') {
      outcome.suppressed.push({ userId, reason: 'permission_not_granted' });
      continue;
    }
    const tokens = /** @type {{ token: string, platform: string }[]} */ (
      /** @type {unknown} */ (
        db
          .prepare(
            'SELECT token, platform FROM push_token WHERE user_id = ? ORDER BY created_at',
          )
          .all(userId)
      )
    );
    if (tokens.length === 0) {
      outcome.suppressed.push({ userId, reason: 'no_device' });
      continue;
    }
    if (!gate.isApproved(kind)) {
      outcome.held.push({ userId });
      continue;
    }
    for (const { token, platform } of tokens)
      sender.send({ userId, token, platform, payload: { ...payload } });
    outcome.sent.push({ userId, payload: { ...payload } });
  }
  return outcome;
}

/**
 * A push port for chat.mjs and polls.mjs that dispatches every intent and
 * keeps the outcomes, so a server can log what was held.
 *
 * @param {DatabaseSync} db
 * @param {{ gate: NotificationGate, sender?: Sender }} options
 */
export function notificationPort(db, options) {
  /** @type {Outcome[]} */
  const outcomes = [];
  return {
    outcomes,
    /** @param {PushIntent} intent */
    enqueue(intent) {
      outcomes.push(dispatch(db, intent, options));
    },
  };
}
