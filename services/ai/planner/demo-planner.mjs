/**
 * Demo planner worker (#78): posts the polls the planner owns, so the core
 * flow (pod → hangout → poll → vote → ready check → split) can be walked
 * against `npm run dev:api`.
 *
 * What it does, each tick:
 * - a hangout in PLANNING with no activity poll gets a shortlist of seeded
 *   NYC catalog events (cheapest first, so a free or near-free option is
 *   always among them);
 * - a hangout in TIME_VOTE with no time poll gets three evening slots.
 *
 * Honest limits (demo only):
 * - **Rules only, no model.** It does not call the Muse client and does not
 *   read anyone's private limits: the API keeps those in its own vault, out
 *   of reach of another process. So no private budget check runs here yet,
 *   and stretch asks are never sent. A shortlist from this worker is "the
 *   cheapest seeded events", not "events that fit everyone".
 * - Closing polls, opening the ready check and running bookings are the
 *   scheduler's job (#100, PR #106). Until that lands, `--with-jobs` runs
 *   them here so the flow can be walked locally.
 * - It talks to the same SQLite file as the API from another process, so
 *   live chat delivery does not fire; the app sees new cards on its next read.
 *
 *   node services/ai/planner/demo-planner.mjs [--once] [--with-jobs]
 *   env: UNSPOKEN_DB (default .local/unspoken.sqlite),
 *        DEMO_POLL_MINUTES (default 2), DEMO_TICK_SECONDS (default 5)
 */
import { openDatabase, migrate } from '../../api/src/db/database.mjs';
import {
  openActivityPoll,
  openTimePoll,
  runPollJobs,
} from '../../api/src/polls.mjs';
import { runBookingJobs } from '../../api/src/booking.mjs';
import { suggestToPod } from '../../api/src/catalog.mjs';

/** @typedef {import('node:sqlite').DatabaseSync} DatabaseSync */

export const SHORTLIST_SIZE = 3;

/** @param {string} at @param {number} ms */
const plus = (at, ms) => new Date(Date.parse(at) + ms).toISOString();

/**
 * Three evening slots (7–10 pm New York time, written as UTC) on the next
 * three days after `at`. Deterministic for a given `at`.
 *
 * @param {string} at
 */
export function eveningSlots(at) {
  const day = new Date(at);
  return [1, 2, 3].map((n) => {
    const d = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + n),
    );
    // 19:00 in New York is 00:00 UTC the next day (EST, UTC-5).
    const starts = new Date(d.getTime() + 24 * 3600_000);
    return {
      startsAt: starts.toISOString(),
      endsAt: new Date(starts.getTime() + 3 * 3600_000).toISOString(),
    };
  });
}

/**
 * The shortlist for a pod: the cheapest seeded events for its size.
 *
 * @param {number} podSize
 */
export function shortlistFor(podSize) {
  return suggestToPod(
    { size: podSize, dietary: [], budgetCents: Number.MAX_SAFE_INTEGER },
    SHORTLIST_SIZE,
  ).map((e) => ({
    title: String(e.title),
    venueOrOrganizer: String(e.venue?.name ?? e.venueId),
    startsAt: new Date(Date.parse(e.startsAt)).toISOString(),
    perPersonEstimateCents: Number(e.estCostPerPersonCents),
    eventId: String(e.eventId),
  }));
}

/**
 * One planner tick. Returns what it posted.
 *
 * @param {DatabaseSync} db
 * @param {{ at: string, pollMs: number, withJobs?: boolean }} input
 */
export function plannerTick(db, { at, pollMs, withJobs = false }) {
  const posted = {
    activityPolls: /** @type {string[]} */ ([]),
    timePolls: /** @type {string[]} */ ([]),
  };
  for (const row of db
    .prepare(
      `SELECT h.hangout_id,
              (SELECT count(*) FROM pod_membership m WHERE m.pod_id = h.pod_id AND m.left_at IS NULL) AS size
         FROM hangout h
        WHERE h.state = 'PLANNING'
          AND NOT EXISTS (SELECT 1 FROM poll p WHERE p.hangout_id = h.hangout_id AND p.kind = 'activity')
        ORDER BY h.created_at`,
    )
    .all()) {
    const options = shortlistFor(Number(row.size));
    if (options.length === 0) continue;
    openActivityPoll(db, {
      hangoutId: String(row.hangout_id),
      closesAt: plus(at, pollMs),
      at,
      options,
    });
    posted.activityPolls.push(String(row.hangout_id));
  }
  for (const row of db
    .prepare(
      `SELECT h.hangout_id FROM hangout h
        WHERE h.state = 'TIME_VOTE'
          AND NOT EXISTS (SELECT 1 FROM poll p WHERE p.hangout_id = h.hangout_id AND p.kind = 'time')
        ORDER BY h.created_at`,
    )
    .all()) {
    openTimePoll(db, {
      hangoutId: String(row.hangout_id),
      closesAt: plus(at, pollMs),
      at,
      slots: eveningSlots(at),
    });
    posted.timePolls.push(String(row.hangout_id));
  }
  const jobs = withJobs
    ? {
        polls: runPollJobs(db, {
          at,
          extendByMs: pollMs,
          readyCheckWindowMs: pollMs,
        }),
        bookings: runBookingJobs(db, { at }),
      }
    : null;
  return { ...posted, jobs };
}

const invokedAsScript = process.argv[1]?.endsWith('demo-planner.mjs');
if (invokedAsScript) {
  const args = new Set(process.argv.slice(2));
  const dbPath = process.env.UNSPOKEN_DB ?? '.local/unspoken.sqlite';
  const pollMs = Number(process.env.DEMO_POLL_MINUTES ?? '2') * 60_000;
  const tickMs = Number(process.env.DEMO_TICK_SECONDS ?? '5') * 1000;
  const db = openDatabase(dbPath);
  db.exec('PRAGMA busy_timeout = 3000;');
  migrate(db);
  const withJobs = args.has('--with-jobs');
  console.log(
    `Demo planner on ${dbPath}: rules only, no model, no private budget check. Polls close after ${pollMs / 60_000} min.${withJobs ? ' Running poll and booking jobs too.' : ''}`,
  );
  const tick = () => {
    try {
      const out = plannerTick(db, {
        at: new Date().toISOString(),
        pollMs,
        withJobs,
      });
      for (const h of out.activityPolls)
        console.log(`posted the activity shortlist for ${h}`);
      for (const h of out.timePolls)
        console.log(`posted the time poll for ${h}`);
    } catch (error) {
      console.error(
        'planner tick failed:',
        /** @type {Error} */ (error).message,
      );
    }
  };
  tick();
  if (!args.has('--once')) setInterval(tick, tickMs);
}
