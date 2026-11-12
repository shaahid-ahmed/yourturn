/**
 * Pod chat, the private planner chat, and real-time delivery (US-007), over the
 * US-002 schema and the contract's PodMessage / PlannerChatMessage shapes.
 *
 * Rules:
 * - **One pod's content never reaches another pod.** Every read and write is
 *   scoped by pod and re-checks that the caller is a joined member. A planner
 *   card may only point at a hangout or poll of the same pod. The event bus
 *   delivers a pod's events only to that pod's current members.
 * - **The planner is a participant.** It posts structured cards (and text) as
 *   author `planner`, never as a member.
 * - **Events and pushes are pointers.** A stream event or push intent names
 *   the pod and message; it never carries the message text, so a lock screen
 *   or a log line cannot leak it.
 * - **The private planner chat has no path into a pod.** Its functions take no
 *   pod id at all.
 *
 * HTTP routes and actual push sending are not part of this task: pushes are
 * handed to an injected port, and sending is gated in US-013.
 */
import { inTransaction } from './db/transaction.mjs';
import { PodError, requireMember, newUlid } from './pods.mjs';

/** @typedef {import('node:sqlite').DatabaseSync} DatabaseSync */

/**
 * The contract PodMessage shape.
 * @typedef {object} PodMessage
 * @property {string} messageId
 * @property {string} podId
 * @property {{ kind: 'planner' } | { kind: 'member', userId: string, firstName: string }} author
 * @property {string} sentAt
 * @property {'text' | 'card'} kind
 * @property {string} [text]
 * @property {Record<string, string>} [card]
 */

/**
 * The contract PlannerChatMessage shape.
 * @typedef {object} PlannerChatMessage
 * @property {string} messageId
 * @property {'me' | 'planner'} author
 * @property {string} sentAt
 * @property {string} kind
 * @property {string} [text]
 * @property {string} [stretchAskId]
 * @property {string} [reminderKey]
 */

export const PAGE_DEFAULT = 50;
export const PAGE_MAX = 100;
export const CARD_TYPES = Object.freeze([
  'activity_shortlist',
  'time_poll',
  'ready_check',
  'booking_confirmation',
  'payer_and_split',
  'event_suggestion',
  'planner_offer',
]);
const OFFERS = Object.freeze(['widen_window', 'widen_area', 'next_best']);
const PLANNER_KINDS = Object.freeze([
  'text',
  'stretch_ask',
  'reminder',
  'limit_suggestion',
]);
const REMINDER_KEYS = Object.freeze([
  'booking_confirmation_needed',
  'balance_owed',
  'poll_closing',
  'ready_check_open',
]);
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/**
 * A pod message for its members, or a private reminder for one member.
 * Both are pointers: neither carries message text or another member's data.
 * @typedef {{ kind: 'pod_message', podId: string, messageId: string, recipientUserIds: string[] }
 *   | { kind: 'private_reminder', userId: string, reminderKey: string, refId: string }
 *   | { kind: 'private_ask', userId: string, refId: string }} PushIntent
 */

/**
 * @typedef {object} PushPort
 * @property {(intent: PushIntent) => void} enqueue
 */

/** A push port that sends nothing; the default until US-013. */
export const NO_PUSH = Object.freeze({ enqueue: () => {} });

/**
 * In-process real-time delivery for one server. A subscriber is bound to one
 * pod and one member; membership is checked when subscribing and again on
 * every delivery, so a member who leaves stops receiving at once.
 */
export class PodEventBus {
  /** @type {Map<string, Set<{ userId: string, listener: (event: object) => void }>>} */
  #subscribers = new Map();
  #db;

  /** @param {DatabaseSync} db */
  constructor(db) {
    this.#db = db;
  }

  /**
   * @param {{ podId: string, userId: string }} who
   * @param {(event: object) => void} listener
   * @returns {() => void} unsubscribe
   */
  subscribe({ podId, userId }, listener) {
    requireMember(this.#db, podId, userId);
    const entry = { userId, listener };
    let set = this.#subscribers.get(podId);
    if (!set) this.#subscribers.set(podId, (set = new Set()));
    set.add(entry);
    return () => {
      set.delete(entry);
    };
  }

  /**
   * @param {string} podId
   * @param {{ type: string, messageId?: string, hangoutId?: string, pollId?: string, at: string }} event
   */
  publish(podId, event) {
    const full = Object.freeze({ eventId: newUlid(), podId, ...event });
    for (const entry of this.#subscribers.get(podId) ?? []) {
      try {
        requireMember(this.#db, podId, entry.userId);
      } catch {
        continue;
      }
      entry.listener(full);
    }
  }
}

/** @param {unknown} text */
function assertText(text) {
  if (typeof text !== 'string' || text.trim().length < 1 || text.length > 2000)
    throw new PodError(
      'validation_failed',
      'a message is 1 to 2000 characters',
      [{ field: 'text', problem: 'length' }],
    );
}

/** @param {unknown} id */
function assertClientMessageId(id) {
  if (typeof id !== 'string' || !ULID.test(id))
    throw new PodError('validation_failed', 'clientMessageId must be a ULID', [
      { field: 'clientMessageId', problem: 'format' },
    ]);
}

/**
 * @param {any} row
 * @returns {PodMessage}
 */
function toPodMessage(row) {
  /** @type {Record<string, unknown>} */
  const message = {
    messageId: row.message_id,
    podId: row.pod_id,
    author:
      row.author_kind === 'planner'
        ? { kind: 'planner' }
        : {
            kind: 'member',
            userId: row.author_user_id,
            firstName: row.first_name,
          },
    sentAt: row.sent_at,
    kind: row.kind,
  };
  if (row.kind === 'text') message.text = row.body;
  else {
    /** @type {Record<string, string>} */
    const card = { cardType: row.card_type };
    if (row.card_hangout_id) card.hangoutId = row.card_hangout_id;
    if (row.card_poll_id) card.pollId = row.card_poll_id;
    if (row.card_event_id) card.eventId = row.card_event_id;
    if (row.card_offer) card.offer = row.card_offer;
    message.card = card;
  }
  return /** @type {PodMessage} */ (/** @type {unknown} */ (message));
}

const SELECT_POD_MESSAGE = `SELECT m.*, u.first_name FROM pod_message m
  LEFT JOIN app_user u ON u.user_id = m.author_user_id`;

/** @param {DatabaseSync} db @param {string} messageId @returns {PodMessage} */
function readPodMessage(db, messageId) {
  return toPodMessage(
    db.prepare(`${SELECT_POD_MESSAGE} WHERE m.message_id = ?`).get(messageId),
  );
}

/**
 * Joined, unmuted members other than the author.
 * @param {DatabaseSync} db
 * @param {string} podId
 * @param {string | null} authorUserId
 */
function pushRecipients(db, podId, authorUserId) {
  return db
    .prepare(
      `SELECT user_id FROM pod_membership
        WHERE pod_id = ? AND left_at IS NULL AND muted = 0 AND user_id IS NOT ?
        ORDER BY user_id`,
    )
    .all(podId, authorUserId)
    .map((row) => String(row.user_id));
}

/**
 * Send a text message as a member. A resend with the same clientMessageId
 * returns the original and delivers nothing again.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, userId: string, clientMessageId: string, text: string, at: string,
 *           bus?: PodEventBus, push?: PushPort, newId?: () => string }} input
 */
export function sendPodMessage(db, input) {
  const {
    podId,
    userId,
    clientMessageId,
    text,
    at,
    bus,
    push = NO_PUSH,
    newId = () => newUlid(),
  } = input;
  assertText(text);
  assertClientMessageId(clientMessageId);
  const outcome = inTransaction(db, () => {
    requireMember(db, podId, userId);
    const existing = db
      .prepare(
        'SELECT message_id FROM pod_message WHERE pod_id = ? AND author_user_id = ? AND client_message_id = ?',
      )
      .get(podId, userId, clientMessageId);
    if (existing)
      return { messageId: String(existing.message_id), created: false };
    const messageId = newId();
    db.prepare(
      `INSERT INTO pod_message (message_id, pod_id, author_kind, author_user_id, kind, body, client_message_id, sent_at)
       VALUES (?, ?, 'member', ?, 'text', ?, ?, ?)`,
    ).run(messageId, podId, userId, text, clientMessageId, at);
    return { messageId, created: true };
  });
  if (outcome.created)
    deliver(db, podId, outcome.messageId, userId, at, bus, push);
  return readPodMessage(db, outcome.messageId);
}

/**
 * The planner posts a structured card in a pod's chat.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, card: { cardType: string, hangoutId?: string, pollId?: string, eventId?: string, offer?: string },
 *           at: string, bus?: PodEventBus, push?: PushPort, newId?: () => string }} input
 */
export function postPlannerCard(db, input) {
  const { podId, at, bus, push = NO_PUSH } = input;
  const messageId = inTransaction(db, () => insertPlannerCard(db, input));
  deliverPodMessage(db, {
    podId,
    messageId,
    authorUserId: null,
    at,
    bus,
    push,
  });
  return readPodMessage(db, messageId);
}

/**
 * Validate and store a planner card inside the caller's transaction. The
 * caller delivers it with deliverPodMessage after committing.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, card: { cardType: string, hangoutId?: string, pollId?: string, eventId?: string, offer?: string },
 *           at: string, newId?: () => string }} input
 * @returns {string} the message id
 */
export function insertPlannerCard(db, input) {
  const { podId, card, at, newId = () => newUlid() } = input;
  if (!CARD_TYPES.includes(card.cardType))
    throw new PodError('validation_failed', 'unknown card type', [
      { field: 'cardType', problem: 'enum' },
    ]);
  if (
    card.cardType === 'planner_offer'
      ? !OFFERS.includes(String(card.offer))
      : card.offer !== undefined
  )
    throw new PodError(
      'validation_failed',
      'an offer goes only on a planner_offer card',
      [{ field: 'offer', problem: 'enum' }],
    );
  {
    if (!db.prepare('SELECT 1 AS ok FROM pod WHERE pod_id = ?').get(podId))
      throw new PodError('not_found', 'no such pod');
    // A card may only point at this pod's own hangout and poll.
    if (card.hangoutId) {
      const owner = db
        .prepare('SELECT pod_id FROM hangout WHERE hangout_id = ?')
        .get(card.hangoutId);
      if (owner?.pod_id !== podId)
        throw new PodError('not_found', 'no such hangout in this pod');
    }
    if (card.pollId) {
      const poll = db
        .prepare('SELECT hangout_id FROM poll WHERE poll_id = ?')
        .get(card.pollId);
      if (!poll || poll.hangout_id !== card.hangoutId)
        throw new PodError('not_found', 'no such poll in this hangout');
    }
    const id = newId();
    db.prepare(
      `INSERT INTO pod_message (message_id, pod_id, author_kind, kind, card_type, card_hangout_id, card_poll_id, card_event_id, card_offer, sent_at)
       VALUES (?, ?, 'planner', 'card', ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      podId,
      card.cardType,
      card.hangoutId ?? null,
      card.pollId ?? null,
      card.eventId ?? null,
      card.offer ?? null,
      at,
    );
    return id;
  }
}

/**
 * Publish a stored pod message to the event bus and the push port.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, messageId: string, authorUserId: string | null, at: string, bus?: PodEventBus, push?: PushPort }} input
 */
export function deliverPodMessage(
  db,
  { podId, messageId, authorUserId, at, bus, push = NO_PUSH },
) {
  deliver(db, podId, messageId, authorUserId, at, bus, push);
}

/**
 * @param {DatabaseSync} db
 * @param {string} podId
 * @param {string} messageId
 * @param {string | null} authorUserId
 * @param {string} at
 * @param {PodEventBus | undefined} bus
 * @param {PushPort} push
 */
function deliver(db, podId, messageId, authorUserId, at, bus, push) {
  bus?.publish(podId, { type: 'message.created', messageId, at });
  const recipientUserIds = pushRecipients(db, podId, authorUserId);
  if (recipientUserIds.length)
    push.enqueue({ kind: 'pod_message', podId, messageId, recipientUserIds });
}

/** @param {string} sentAt @param {string} messageId */
const encodeCursor = (sentAt, messageId) =>
  Buffer.from(JSON.stringify([sentAt, messageId]), 'utf8').toString(
    'base64url',
  );

/** @param {string} cursor @returns {[string, string]} */
function decodeCursor(cursor) {
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      value.every((v) => typeof v === 'string')
    )
      return /** @type {[string, string]} */ (value);
  } catch {
    // fall through
  }
  throw new PodError('validation_failed', 'bad cursor', [
    { field: 'cursor', problem: 'format' },
  ]);
}

/** @param {number | undefined} limit */
function pageSize(limit) {
  const size = limit ?? PAGE_DEFAULT;
  if (!Number.isInteger(size) || size < 1 || size > PAGE_MAX)
    throw new PodError('validation_failed', `limit is 1 to ${PAGE_MAX}`, [
      { field: 'limit', problem: 'range' },
    ]);
  return size;
}

/**
 * Newest first. The cursor is the (sentAt, messageId) of the last message
 * returned, so pages are stable even when messages share a timestamp.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, userId: string, cursor?: string | null, limit?: number }} input
 * @returns {{ messages: PodMessage[], nextCursor: string | null }}
 */
export function listPodMessages(db, { podId, userId, cursor = null, limit }) {
  const size = pageSize(limit);
  requireMember(db, podId, userId);
  const [sentAt, messageId] = cursor ? decodeCursor(cursor) : ['￿', '￿'];
  const rows = db
    .prepare(
      `${SELECT_POD_MESSAGE}
        WHERE m.pod_id = ? AND (m.sent_at < ? OR (m.sent_at = ? AND m.message_id < ?))
        ORDER BY m.sent_at DESC, m.message_id DESC LIMIT ?`,
    )
    .all(podId, sentAt, sentAt, messageId, size + 1);
  const page = rows.slice(0, size);
  const last = page.at(-1);
  return {
    messages: page.map(toPodMessage),
    nextCursor:
      rows.length > size && last
        ? encodeCursor(String(last.sent_at), String(last.message_id))
        : null,
  };
}

// ---------------- private planner chat ----------------

/** @param {any} row @returns {PlannerChatMessage} */
function toPlannerChatMessage(row) {
  /** @type {Record<string, unknown>} */
  const message = {
    messageId: row.message_id,
    author: row.author,
    sentAt: row.sent_at,
    kind: row.kind,
  };
  if (row.body !== null) message.text = row.body;
  if (row.stretch_ask_id !== null) message.stretchAskId = row.stretch_ask_id;
  if (row.reminder_key !== null) message.reminderKey = row.reminder_key;
  return /** @type {PlannerChatMessage} */ (/** @type {unknown} */ (message));
}

/**
 * The member writes to their own planner. There is no pod parameter.
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, clientMessageId: string, text: string, at: string, newId?: () => string }} input
 */
export function sendOwnPlannerChatMessage(
  db,
  { userId, clientMessageId, text, at, newId = () => newUlid() },
) {
  assertText(text);
  assertClientMessageId(clientMessageId);
  const messageId = inTransaction(db, () => {
    if (
      !db
        .prepare(
          'SELECT 1 AS ok FROM app_user WHERE user_id = ? AND deleted_at IS NULL',
        )
        .get(userId)
    )
      throw new PodError('not_found', 'no such user');
    const existing = db
      .prepare(
        'SELECT message_id FROM planner_chat_message WHERE user_id = ? AND client_message_id = ?',
      )
      .get(userId, clientMessageId);
    if (existing) return String(existing.message_id);
    const id = newId();
    db.prepare(
      `INSERT INTO planner_chat_message (message_id, user_id, author, kind, body, client_message_id, sent_at)
       VALUES (?, ?, 'me', 'text', ?, ?, ?)`,
    ).run(id, userId, text, clientMessageId, at);
    return id;
  });
  return toPlannerChatMessage(
    db
      .prepare('SELECT * FROM planner_chat_message WHERE message_id = ?')
      .get(messageId),
  );
}

/**
 * The planner writes privately to one member.
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, kind: string, text?: string, stretchAskId?: string, reminderKey?: string, at: string, newId?: () => string }} input
 */
export function postPlannerPrivateMessage(
  db,
  {
    userId,
    kind,
    text,
    stretchAskId,
    reminderKey,
    at,
    newId = () => newUlid(),
  },
) {
  if (!PLANNER_KINDS.includes(kind))
    throw new PodError('validation_failed', 'unknown kind', [
      { field: 'kind', problem: 'enum' },
    ]);
  if (text !== undefined) assertText(text);
  if (kind === 'stretch_ask' && !stretchAskId)
    throw new PodError('validation_failed', 'a stretch ask needs its id', [
      { field: 'stretchAskId', problem: 'required' },
    ]);
  if (kind === 'reminder' && !REMINDER_KEYS.includes(String(reminderKey)))
    throw new PodError('validation_failed', 'unknown reminder', [
      { field: 'reminderKey', problem: 'enum' },
    ]);
  if (stretchAskId) {
    const ask = db
      .prepare('SELECT user_id FROM stretch_ask WHERE stretch_ask_id = ?')
      .get(stretchAskId);
    // A stretch ask goes only to the member it is about.
    if (ask?.user_id !== userId)
      throw new PodError('not_found', 'no such stretch ask for this member');
  }
  const id = newId();
  db.prepare(
    `INSERT INTO planner_chat_message (message_id, user_id, author, kind, body, stretch_ask_id, reminder_key, sent_at)
     VALUES (?, ?, 'planner', ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    kind,
    text ?? null,
    stretchAskId ?? null,
    reminderKey ?? null,
    at,
  );
  return toPlannerChatMessage(
    db
      .prepare('SELECT * FROM planner_chat_message WHERE message_id = ?')
      .get(id),
  );
}

/**
 * @param {DatabaseSync} db
 * @param {{ userId: string, cursor?: string | null, limit?: number }} input
 */
export function listOwnPlannerChat(db, { userId, cursor = null, limit }) {
  const size = pageSize(limit);
  const [sentAt, messageId] = cursor ? decodeCursor(cursor) : ['￿', '￿'];
  const rows = db
    .prepare(
      `SELECT * FROM planner_chat_message
        WHERE user_id = ? AND (sent_at < ? OR (sent_at = ? AND message_id < ?))
        ORDER BY sent_at DESC, message_id DESC LIMIT ?`,
    )
    .all(userId, sentAt, sentAt, messageId, size + 1);
  const page = rows.slice(0, size);
  const last = page.at(-1);
  return {
    messages: page.map(toPlannerChatMessage),
    nextCursor:
      rows.length > size && last
        ? encodeCursor(String(last.sent_at), String(last.message_id))
        : null,
  };
}
