/**
 * Booking confirmation and reminders (US-012), over the US-002 schema, the
 * hangout lifecycle and the US-001 contract (`volunteerAsPayer`,
 * `confirmBooking`, the `Booking` schema and the booking card).
 *
 * Rules:
 * - **Nothing is booked without confirmation.** The ready check closing with
 *   yeses opens a booking card in AWAITING_CONFIRMATION; only
 *   `confirmBooking` moves it to BOOKING, and only the payer may confirm
 *   (Q-011.6 contract default). The confirmation is bound to the estimate the
 *   payer saw: a different estimate is refused.
 * - **Every booking is simulated and labelled.** The booking is performed by
 *   a `VenueBooker` port. The default books seeded catalog venues only and
 *   never contacts a venue. Every `Booking` carries `simulated: true` and the
 *   contract's fixed label. No real reservation exists anywhere in this code.
 * - **Reminders until confirmed, privately.** While a booking waits, the
 *   payer (or, before anyone volunteers, each yes-member who could pay) gets
 *   a private reminder in their planner chat one interval after the card,
 *   then once per interval, up to a cap. A reminder never appears in pod chat (spec p.13–14).
 * - **A failed booking offers the next-best plan.** BOOKING_FAILED posts a
 *   planner offer card (`next_best`) and says nothing about why.
 * - **After booking, calendars are blocked** for the yes-members (US-011).
 *
 * The payer is the volunteer (Q-011.5 contract default): a yes-member with a
 * linked PayPal account; the first volunteer wins.
 *
 * Jobs take the current time as an argument; scheduling them is the server's.
 */
import { inTransaction } from './db/transaction.mjs';
import { applyHangoutEventInTransaction } from './db/hangout-store.mjs';
import { PodError, requireMember, newUlid } from './pods.mjs';
import {
  NO_PUSH,
  insertPlannerCard,
  deliverPodMessage,
  postPlannerPrivateMessage,
} from './chat.mjs';
import { getEventDetail } from './catalog.mjs';
import { NO_PROVIDER, blockBookedHangout } from './calendar.mjs';

/** @typedef {import('node:sqlite').DatabaseSync} DatabaseSync */
/** @typedef {import('./chat.mjs').PodEventBus} PodEventBus */
/** @typedef {import('./chat.mjs').PushPort} PushPort */
/** @typedef {import('./calendar.mjs').CalendarProvider} CalendarProvider */

/** The contract's fixed label (`Booking.simulatedLabel`). */
export const SIMULATED_LABEL =
  'Simulated booking for a seeded demo venue. No real reservation is made.';

/**
 * A reminder at most once per interval, and at most this many. A proposal for
 * Behavioral and Content review: the spec says "repeats until confirmed".
 */
export const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const MAX_REMINDERS = 3;

/**
 * @typedef {object} VenueBooker
 * @property {(input: { eventId: string | null, venue: string, partySize: number, startsAt: string }) => { ok: boolean }} book
 */

/**
 * The demo booker: a booking succeeds only for an option that points at a
 * seeded catalog event. It contacts nobody.
 *
 * @type {VenueBooker}
 */
export const SEEDED_VENUE_BOOKER = Object.freeze({
  book: ({ eventId }) => ({
    ok: eventId !== null && getEventDetail(eventId) !== null,
  }),
});

/**
 * @param {DatabaseSync} db @param {string} podId @param {string} hangoutId
 */
function readHangout(db, podId, hangoutId) {
  const row = /** @type {any} */ (
    db
      .prepare('SELECT * FROM hangout WHERE hangout_id = ? AND pod_id = ?')
      .get(hangoutId, podId)
  );
  if (!row) throw new PodError('not_found', 'hangout not found');
  return row;
}

/** @param {DatabaseSync} db @param {string} hangoutId */
function yesMembers(db, hangoutId) {
  return db
    .prepare(
      `SELECT r.user_id FROM ready_answer r
         JOIN hangout h ON h.hangout_id = r.hangout_id
         JOIN pod_membership m ON m.pod_id = h.pod_id AND m.user_id = r.user_id AND m.left_at IS NULL
        WHERE r.hangout_id = ? AND r.answer = 'yes' ORDER BY r.user_id`,
    )
    .all(hangoutId)
    .map((r) => String(r.user_id));
}

/** @param {DatabaseSync} db @param {string} userId */
const paypalLinked = (db, userId) =>
  Boolean(
    db
      .prepare(
        "SELECT 1 AS ok FROM paypal_link WHERE user_id = ? AND status = 'linked'",
      )
      .get(userId),
  );

/**
 * The booking card, in the contract's `Booking` shape. Visible to every pod
 * member: it holds no one's limits, answers or money.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, hangoutId: string, userId: string }} input
 */
export function getBooking(db, { podId, hangoutId, userId }) {
  requireMember(db, podId, userId);
  readHangout(db, podId, hangoutId);
  return bookingView(db, hangoutId);
}

/** @param {DatabaseSync} db @param {string} hangoutId */
function bookingView(db, hangoutId) {
  const b = /** @type {any} */ (
    db
      .prepare(
        `SELECT b.*, u.first_name FROM booking b
           LEFT JOIN app_user u ON u.user_id = b.confirmed_by
          WHERE b.hangout_id = ?`,
      )
      .get(hangoutId)
  );
  if (!b) return null;
  return {
    status:
      /** @type {'awaiting_confirmation' | 'booking' | 'booked' | 'failed'} */ (
        b.status
      ),
    partySize: Number(b.party_size),
    startsAt: String(b.starts_at),
    estimatedTotalCents: Number(b.estimated_total_cents),
    simulated: /** @type {true} */ (true),
    simulatedLabel: SIMULATED_LABEL,
    confirmedBy: b.confirmed_by
      ? { userId: String(b.confirmed_by), firstName: String(b.first_name) }
      : null,
    confirmedAt: b.confirmed_at ? String(b.confirmed_at) : null,
  };
}

/**
 * P13 "Who pays": a yes-member with linked PayPal volunteers. The first
 * volunteer wins; volunteering again as the payer is a no-op.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, hangoutId: string, userId: string, at: string }} input
 * @returns {{ payer: { userId: string, firstName: string } }}
 */
export function volunteerAsPayer(db, { podId, hangoutId, userId, at }) {
  requireMember(db, podId, userId);
  return inTransaction(db, () => {
    const h = readHangout(db, podId, hangoutId);
    if (h.payer_user_id && h.payer_user_id !== userId)
      throw new PodError('payer_already_chosen', 'someone is already paying');
    if (h.state !== 'AWAITING_CONFIRMATION' && !h.payer_user_id)
      throw new PodError(
        'wrong_hangout_state',
        'the payer is chosen before booking',
      );
    if (!yesMembers(db, hangoutId).includes(userId))
      throw new PodError(
        'not_yes_member',
        'only a member who said yes can pay',
      );
    if (!paypalLinked(db, userId))
      throw new PodError(
        'paypal_link_required',
        'link PayPal to pay the venue',
      );
    if (!h.payer_user_id)
      db.prepare(
        'UPDATE hangout SET payer_user_id = ?, version = version + 1, updated_at = ? WHERE hangout_id = ? AND version = ?',
      ).run(userId, at, hangoutId, h.version);
    const name = /** @type {{ first_name: string }} */ (
      db
        .prepare('SELECT first_name FROM app_user WHERE user_id = ?')
        .get(userId)
    );
    return { payer: { userId, firstName: name.first_name } };
  });
}

/**
 * P12 confirm. Payer only; bound to the estimate on the card.
 * AWAITING_CONFIRMATION → BOOKING. The booking itself runs in the job.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, hangoutId: string, userId: string, estimatedTotalCents: number, at: string }} input
 */
export function confirmBooking(
  db,
  { podId, hangoutId, userId, estimatedTotalCents, at },
) {
  requireMember(db, podId, userId);
  if (!Number.isSafeInteger(estimatedTotalCents) || estimatedTotalCents < 0)
    throw new PodError(
      'validation_failed',
      'estimatedTotalCents must be whole cents',
      [{ field: 'estimatedTotalCents', problem: 'integer' }],
    );
  return inTransaction(db, () => {
    const h = readHangout(db, podId, hangoutId);
    const booking = bookingView(db, hangoutId);
    if (
      h.state !== 'AWAITING_CONFIRMATION' ||
      booking?.status !== 'awaiting_confirmation'
    )
      throw new PodError(
        'wrong_hangout_state',
        'nothing is waiting for confirmation',
      );
    // The lifecycle checks payer chosen and actor is payer (Q-011.6).
    const next = applyHangoutEventInTransaction(db, {
      hangoutId,
      event: 'bookingConfirmed',
      expectedVersion: h.version,
      actorUserId: userId,
      at,
      guards: {
        payerChosen: Boolean(h.payer_user_id),
        actorIsPayer: h.payer_user_id === userId,
      },
    });
    if (booking.estimatedTotalCents !== estimatedTotalCents)
      throw new PodError(
        'wrong_hangout_state',
        'the estimate changed; review the card again',
      );
    db.prepare(
      "UPDATE booking SET status = 'booking', confirmed_by = ?, confirmed_at = ? WHERE hangout_id = ?",
    ).run(userId, at, hangoutId);
    return { state: next.state, booking: bookingView(db, hangoutId) };
  });
}

/**
 * Open the booking card for a hangout that reached AWAITING_CONFIRMATION:
 * head count = the yes-members, estimate = per-person estimate × head count.
 * Idempotent. Returns the card's message id, or null if one already existed.
 *
 * @param {DatabaseSync} db
 * @param {{ hangoutId: string, at: string, newId?: () => string }} input
 */
function openBookingCard(db, { hangoutId, at, newId = () => newUlid() }) {
  return inTransaction(db, () => {
    if (
      db
        .prepare('SELECT 1 AS x FROM booking WHERE hangout_id = ?')
        .get(hangoutId)
    )
      return null;
    const h = /** @type {any} */ (
      db
        .prepare(
          `SELECT h.pod_id, o.per_person_estimate_cents, t.starts_at
             FROM hangout h
             JOIN shortlist_option o ON o.option_id = h.chosen_option_id
             JOIN time_slot t ON t.slot_id = h.chosen_slot_id
            WHERE h.hangout_id = ? AND h.state = 'AWAITING_CONFIRMATION'`,
        )
        .get(hangoutId)
    );
    if (!h) return null;
    const partySize = yesMembers(db, hangoutId).length;
    if (partySize < 1) return null;
    db.prepare(
      `INSERT INTO booking (hangout_id, status, party_size, starts_at, estimated_total_cents, simulated)
       VALUES (?, 'awaiting_confirmation', ?, ?, ?, 1)`,
    ).run(
      hangoutId,
      partySize,
      h.starts_at,
      Number(h.per_person_estimate_cents) * partySize,
    );
    const podId = String(h.pod_id);
    const messageId = insertPlannerCard(db, {
      podId,
      card: { cardType: 'booking_confirmation', hangoutId },
      at,
      newId,
    });
    return { podId, messageId };
  });
}

/**
 * Perform the simulated booking for a hangout in BOOKING.
 * BOOKING → BOOKED (then calendars) or BOOKING_FAILED (then a next-best offer).
 *
 * @param {DatabaseSync} db
 * @param {{ hangoutId: string, at: string, booker: VenueBooker, newId?: () => string }} input
 * @returns {{ podId: string, ok: boolean, offerMessageId: string | null } | null}
 */
function performBooking(
  db,
  { hangoutId, at, booker, newId = () => newUlid() },
) {
  const h = /** @type {any} */ (
    db
      .prepare(
        `SELECT h.pod_id, h.version, o.event_id, o.venue_or_organizer, b.party_size, b.starts_at
           FROM hangout h
           JOIN booking b ON b.hangout_id = h.hangout_id AND b.status = 'booking'
           JOIN shortlist_option o ON o.option_id = h.chosen_option_id
          WHERE h.hangout_id = ? AND h.state = 'BOOKING'`,
      )
      .get(hangoutId)
  );
  if (!h) return null;
  let ok = false;
  try {
    ok =
      booker.book({
        eventId: h.event_id === null ? null : String(h.event_id),
        venue: String(h.venue_or_organizer),
        partySize: Number(h.party_size),
        startsAt: String(h.starts_at),
      }).ok === true;
  } catch {
    ok = false;
  }
  const podId = String(h.pod_id);
  return inTransaction(db, () => {
    applyHangoutEventInTransaction(db, {
      hangoutId,
      event: ok ? 'bookingSucceeded' : 'bookingFailed',
      expectedVersion: Number(h.version),
      actorUserId: null,
      at,
    });
    db.prepare('UPDATE booking SET status = ? WHERE hangout_id = ?').run(
      ok ? 'booked' : 'failed',
      hangoutId,
    );
    const offerMessageId = ok
      ? null
      : insertPlannerCard(db, {
          podId,
          card: { cardType: 'planner_offer', hangoutId, offer: 'next_best' },
          at,
          newId,
        });
    return { podId, ok, offerMessageId };
  });
}

/**
 * Private reminders while a booking waits for confirmation. To the payer once
 * one has volunteered; before that, to each yes-member who could pay. At most
 * one per member per interval, at most MAX_REMINDERS in all.
 *
 * @param {DatabaseSync} db
 * @param {{ at: string, push: PushPort, newId: () => string }} input
 */
function sendBookingReminders(db, { at, push, newId }) {
  /** @type {{ userId: string, refId: string }[]} */
  const sent = [];
  const waiting = db
    .prepare(
      `SELECT h.hangout_id, h.payer_user_id,
              (SELECT max(t.at) FROM hangout_transition t
                WHERE t.hangout_id = h.hangout_id AND t.to_state = 'AWAITING_CONFIRMATION') AS since
         FROM hangout h JOIN booking b ON b.hangout_id = h.hangout_id
        WHERE h.state = 'AWAITING_CONFIRMATION' AND b.status = 'awaiting_confirmation'
        ORDER BY h.hangout_id`,
    )
    .all();
  for (const w of waiting) {
    const hangoutId = String(w.hangout_id);
    const elapsed = Date.parse(at) - Date.parse(String(w.since));
    // The card is the first ask; reminders follow one interval apart.
    const round = Math.floor(elapsed / REMINDER_INTERVAL_MS);
    if (round < 1 || round > MAX_REMINDERS) continue;
    const recipients = w.payer_user_id
      ? [String(w.payer_user_id)]
      : yesMembers(db, hangoutId).filter((u) => paypalLinked(db, u));
    for (const userId of recipients) {
      const refId = `${hangoutId}#${round}`;
      const fresh = inTransaction(db, () => {
        const inserted = db
          .prepare(
            "INSERT INTO reminder_sent (kind, ref_id, user_id, sent_at) VALUES ('booking_confirmation_needed', ?, ?, ?) ON CONFLICT DO NOTHING",
          )
          .run(refId, userId, at);
        if (inserted.changes === 0) return false;
        postPlannerPrivateMessage(db, {
          userId,
          kind: 'reminder',
          reminderKey: 'booking_confirmation_needed',
          at,
          newId,
        });
        return true;
      });
      if (!fresh) continue;
      push.enqueue({
        kind: 'private_reminder',
        userId,
        reminderKey: 'booking_confirmation_needed',
        refId: hangoutId,
      });
      sent.push({ userId, refId });
    }
  }
  return sent;
}

/**
 * The booking job: open cards for hangouts that reached
 * AWAITING_CONFIRMATION, perform confirmed bookings, block calendars after
 * BOOKED, and send due reminders. Cards and pushes go out after each commit.
 *
 * @param {DatabaseSync} db
 * @param {{ at: string, booker?: VenueBooker, calendar?: CalendarProvider,
 *   bus?: PodEventBus, push?: PushPort, newId?: () => string }} input
 */
export function runBookingJobs(
  db,
  {
    at,
    booker = SEEDED_VENUE_BOOKER,
    calendar = NO_PROVIDER,
    bus,
    push = NO_PUSH,
    newId = () => newUlid(),
  },
) {
  const summary = {
    cardsOpened: /** @type {string[]} */ ([]),
    booked: /** @type {string[]} */ ([]),
    failed: /** @type {string[]} */ ([]),
    reminders: /** @type {{ userId: string, refId: string }[]} */ ([]),
  };
  /** @param {string} podId @param {string} messageId */
  const deliver = (podId, messageId) =>
    deliverPodMessage(db, {
      podId,
      messageId,
      authorUserId: null,
      at,
      bus,
      push,
    });

  for (const row of db
    .prepare(
      `SELECT h.hangout_id FROM hangout h
        WHERE h.state = 'AWAITING_CONFIRMATION'
          AND NOT EXISTS (SELECT 1 FROM booking b WHERE b.hangout_id = h.hangout_id)
        ORDER BY h.hangout_id`,
    )
    .all()) {
    const hangoutId = String(row.hangout_id);
    const card = openBookingCard(db, { hangoutId, at, newId });
    if (!card) continue;
    deliver(card.podId, card.messageId);
    summary.cardsOpened.push(hangoutId);
  }

  for (const row of db
    .prepare(
      "SELECT hangout_id FROM hangout WHERE state = 'BOOKING' ORDER BY hangout_id",
    )
    .all()) {
    const hangoutId = String(row.hangout_id);
    const result = performBooking(db, { hangoutId, at, booker, newId });
    if (!result) continue;
    if (result.ok) {
      summary.booked.push(hangoutId);
      // With no calendar provider configured there is nothing to write to;
      // skipping keeps connected accounts from being marked as broken.
      if (calendar !== NO_PROVIDER)
        blockBookedHangout(db, { hangoutId, at, provider: calendar });
    } else {
      summary.failed.push(hangoutId);
      if (result.offerMessageId) deliver(result.podId, result.offerMessageId);
    }
  }

  summary.reminders = sendBookingReminders(db, { at, push, newId });
  return summary;
}
