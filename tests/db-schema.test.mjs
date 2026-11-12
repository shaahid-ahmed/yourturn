// US-002: the durable schema, migrated on a scratch SQLite file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  openDatabase,
  migrate,
  currentVersion,
} from '../services/api/src/db/database.mjs';
import {
  MIGRATIONS,
  HANGOUT_STATES,
  LEDGER_KINDS,
} from '../services/api/src/db/migrations.mjs';

const NOW = '2026-11-12T12:00:00.000Z';

/** A fresh migrated database on a scratch file, removed after the test. */
function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'unspoken-schema-'));
  const path = join(dir, 'scratch.sqlite');
  const db = openDatabase(path);
  migrate(db);
  return {
    db,
    path,
    done: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** @param {import('node:sqlite').DatabaseSync} db @returns {string[]} */
function tables(db) {
  return db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((row) => String(row.name));
}

/** @param {import('node:sqlite').DatabaseSync} db @param {string} table */
function columns(db, table) {
  return db
    .prepare(`SELECT name FROM pragma_table_info('${table}')`)
    .all()
    .map((row) => String(row.name));
}

/**
 * Seed the minimum rows a hangout needs: two synthetic users, a pod, a hangout.
 * @param {import('node:sqlite').DatabaseSync} db
 */
function seedHangout(db) {
  const user = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  user.run('u-ada', 'Ada', '+15550000001', NOW);
  user.run('u-ben', 'Ben', '+15550000002', NOW);
  db.prepare(
    'INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
  ).run('p-1', 'Synthetic Pod', 'u-ada', NOW);
  db.prepare(
    "INSERT INTO hangout (hangout_id, pod_id, state, created_at, updated_at) VALUES ('h-1', 'p-1', 'BOOKED', ?, ?)",
  ).run(NOW, NOW);
}

/** @param {import('node:sqlite').DatabaseSync} db @param {Record<string, unknown>} [over] */
function owedEntry(db, over = {}) {
  const row = {
    entry_id: 'e-1',
    seq: 1,
    hangout_id: 'h-1',
    debtor_user_id: 'u-ben',
    creditor_user_id: 'u-ada',
    kind: 'balance_created',
    amount_cents: 1250,
    synthetic: 1,
    created_at: NOW,
    ...over,
  };
  const keys = Object.keys(row);
  db.prepare(
    `INSERT INTO ledger_entry (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
  ).run(.../** @type {any[]} */ (Object.values(row)));
}

test('migrations apply to a scratch file, are recorded, and re-running is a no-op', () => {
  const dir = mkdtempSync(join(tmpdir(), 'unspoken-schema-'));
  const path = join(dir, 'scratch.sqlite');
  try {
    const first = openDatabase(path);
    assert.equal(currentVersion(first), 0);
    assert.deepEqual(
      migrate(first),
      MIGRATIONS.map((m) => m.version),
    );
    first.close();

    // Reopen the file: the schema persisted and nothing is applied twice.
    const again = openDatabase(path);
    assert.equal(currentVersion(again), MIGRATIONS.length);
    assert.deepEqual(migrate(again), []);
    const integrity = again.prepare('PRAGMA integrity_check').get();
    assert.equal(integrity?.integrity_check, 'ok');
    assert.deepEqual(again.prepare('PRAGMA foreign_key_check').all(), []);
    again.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the schema covers every entity the US-002 criteria name', () => {
  const { db, done } = scratch();
  try {
    const present = tables(db);
    for (const table of [
      'pod',
      'pod_membership',
      'pod_invitation',
      'invite_link',
      'pod_message',
      'planner_chat_message',
      'poll',
      'poll_option',
      'poll_vote',
      'ready_answer',
      'hangout',
      'hangout_transition',
      'booking',
      'split',
      'split_actual_total',
      'ledger_entry',
      'settlement_payment',
      'provider_event',
      'calendar_account',
      'calendar_consent',
      'subscription_receipt',
      'idempotency_record',
    ])
      assert.ok(present.includes(table), `missing table ${table}`);
    // Every table is STRICT, so money columns are real integers.
    for (const table of present) {
      const sql = String(
        db
          .prepare(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
          )
          .get(table)?.sql,
      );
      assert.match(sql, /\)\s*STRICT$/, `${table} must be STRICT`);
    }
  } finally {
    done();
  }
});

test('no table stores a balance, a pot or a total owed', () => {
  const { db, done } = scratch();
  try {
    for (const table of tables(db))
      for (const column of columns(db, table))
        assert.doesNotMatch(
          column,
          /(^|_)(balance|balances|pot|owed|outstanding)(_|$)/i,
          `${table}.${column} would be a stored balance`,
        );
  } finally {
    done();
  }
});

test('the ledger is append-only: UPDATE and DELETE are refused', () => {
  const { db, done } = scratch();
  try {
    seedHangout(db);
    owedEntry(db);
    assert.throws(
      () =>
        db.exec(
          "UPDATE ledger_entry SET amount_cents = 1 WHERE entry_id = 'e-1'",
        ),
      /ledger_entry is append-only/,
    );
    assert.throws(
      () => db.exec("DELETE FROM ledger_entry WHERE entry_id = 'e-1'"),
      /ledger_entry is append-only/,
    );
    for (const table of [
      'hangout_transition',
      'split',
      'split_actual_total',
      'settlement_payment',
      'provider_event',
      'subscription_receipt',
      'idempotency_record',
    ]) {
      const triggers = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = ? ORDER BY name",
        )
        .all(table)
        .map((row) => String(row.name));
      assert.deepEqual(
        triggers,
        [`${table}_no_delete`, `${table}_no_update`],
        table,
      );
    }
  } finally {
    done();
  }
});

test('money columns accept only integer cents', () => {
  const { db, done } = scratch();
  try {
    seedHangout(db);
    assert.throws(
      () => owedEntry(db, { amount_cents: 12.5 }),
      /cannot store REAL/,
    );
    // A decimal string is refused. STRICT converts a lossless integer string,
    // and what it stores is a true integer.
    assert.throws(
      () => owedEntry(db, { amount_cents: '12.50' }),
      /cannot store (TEXT|REAL)/,
    );
    owedEntry(db, { entry_id: 'e-str', seq: 9, amount_cents: '1250' });
    assert.deepEqual(
      {
        ...db
          .prepare(
            "SELECT typeof(amount_cents) AS t FROM ledger_entry WHERE entry_id = 'e-str'",
          )
          .get(),
      },
      { t: 'integer' },
    );
    // A share owed must be positive; only an adjustment may be signed.
    assert.throws(
      () => owedEntry(db, { amount_cents: -5 }),
      /CHECK constraint/,
    );
    owedEntry(db, {
      entry_id: 'e-adj',
      seq: 2,
      kind: 'adjustment',
      amount_cents: -150,
    });
    assert.throws(
      () => owedEntry(db, { entry_id: 'e-x', seq: 3, kind: 'refund' }),
      /CHECK constraint/,
    );
  } finally {
    done();
  }
});

test('ledger rows keep their provenance and cannot double-apply one event', () => {
  const { db, done } = scratch();
  try {
    seedHangout(db);
    // A real (non-synthetic) capture needs a verified provider event.
    assert.throws(
      () => owedEntry(db, { kind: 'payment_captured', synthetic: 0 }),
      /CHECK constraint/,
    );
    db.prepare(
      'INSERT INTO settlement_payment (payment_id, hangout_id, debtor_user_id, creditor_user_id, amount_cents, environment, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      'pay-1',
      'h-1',
      'u-ben',
      'u-ada',
      1250,
      'sandbox',
      'key-00000001',
      NOW,
    );
    db.prepare(
      'INSERT INTO provider_event (provider_event_id, event_type, signature_verified, received_at) VALUES (?, ?, 1, ?)',
    ).run('WH-1', 'PAYMENT.CAPTURE.COMPLETED', NOW);
    const captured = {
      kind: 'payment_captured',
      synthetic: 0,
      payment_id: 'pay-1',
      provider_event_id: 'WH-1',
    };
    owedEntry(db, captured);
    assert.throws(
      () => owedEntry(db, { ...captured, entry_id: 'e-2', seq: 2 }),
      /UNIQUE constraint/,
    );
    // An unverified event cannot be recorded at all.
    assert.throws(
      () =>
        db
          .prepare(
            'INSERT INTO provider_event (provider_event_id, event_type, signature_verified, received_at) VALUES (?, ?, 0, ?)',
          )
          .run('WH-2', 'PAYMENT.CAPTURE.COMPLETED', NOW),
      /CHECK constraint/,
    );
    // A payment retried with the same key is the same payment.
    assert.throws(
      () =>
        db
          .prepare(
            'INSERT INTO settlement_payment (payment_id, hangout_id, debtor_user_id, creditor_user_id, amount_cents, environment, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .run(
            'pay-2',
            'h-1',
            'u-ben',
            'u-ada',
            1250,
            'sandbox',
            'key-00000001',
            NOW,
          ),
      /UNIQUE constraint/,
    );
  } finally {
    done();
  }
});

test('hangout states are exactly ADR 0007 and match the contract', async () => {
  const { db, done } = scratch();
  try {
    seedHangout(db);
    const contract = JSON.parse(
      (await import('node:fs')).readFileSync(
        new URL('../docs/03-architecture/openapi.json', import.meta.url),
        'utf8',
      ),
    );
    assert.deepEqual(
      HANGOUT_STATES,
      contract.components.schemas.HangoutState.enum,
    );
    const insert = db.prepare(
      "INSERT INTO hangout (hangout_id, pod_id, state, created_at, updated_at) VALUES (?, 'p-1', ?, ?, ?)",
    );
    HANGOUT_STATES.forEach((state, index) =>
      insert.run(`h-s${index}`, state, NOW, NOW),
    );
    for (const retired of [
      'COMMITTING',
      'SETTLING',
      'VOIDING',
      'NOT_HAPPENING',
      'SETTLEMENT_FAILED',
      'DRAFT',
    ])
      assert.throws(
        () => insert.run(`h-${retired}`, retired, NOW, NOW),
        /CHECK constraint/,
      );
    assert.ok(LEDGER_KINDS.includes('balance_created'));
  } finally {
    done();
  }
});

test('pods cap at eight joined members and invite links are single use', () => {
  const { db, done } = scratch();
  try {
    const user = db.prepare(
      'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
    );
    for (let i = 1; i <= 9; i += 1)
      user.run(`u-${i}`, `Member${i}`, `+1555000010${i}`, NOW);
    db.prepare(
      "INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES ('p-1', 'Synthetic Pod', 'u-1', ?)",
    ).run(NOW);
    const join = db.prepare(
      "INSERT INTO pod_membership (pod_id, user_id, role, joined_at) VALUES ('p-1', ?, ?, ?)",
    );
    for (let i = 1; i <= 8; i += 1)
      join.run(`u-${i}`, i === 1 ? 'creator' : 'member', NOW);
    assert.throws(() => join.run('u-9', 'member', NOW), /pod_full/);

    db.prepare(
      "INSERT INTO invite_link (invite_link_id, pod_id, token_digest, created_by, created_at, expires_at) VALUES ('l-1', 'p-1', 'digest-1', 'u-1', ?, ?)",
    ).run(NOW, NOW);
    db.exec(
      "UPDATE invite_link SET used_by = 'u-2', used_at = '2026-11-12T13:00:00Z' WHERE invite_link_id = 'l-1'",
    );
    assert.throws(
      () =>
        db.exec(
          "UPDATE invite_link SET used_by = 'u-3', used_at = '2026-11-12T14:00:00Z' WHERE invite_link_id = 'l-1'",
        ),
      /invite_link_used/,
    );
    assert.throws(
      () =>
        db.exec(
          "UPDATE invite_link SET used_by = NULL, used_at = NULL WHERE invite_link_id = 'l-1'",
        ),
      /invite_link_used/,
    );
  } finally {
    done();
  }
});

test('private data has nowhere to leak: no plaintext limits, no pod column in the private chat, no calendar content', () => {
  const { db, done } = scratch();
  try {
    assert.deepEqual(columns(db, 'private_limits_vault'), [
      'user_id',
      'sealed',
      'key_version',
      'updated_at',
    ]);
    for (const table of tables(db))
      for (const column of columns(db, table))
        assert.doesNotMatch(
          column,
          /budget|dietary|dislike|travel/i,
          `${table}.${column} would store a private limit in plaintext`,
        );
    assert.ok(!columns(db, 'planner_chat_message').some((c) => /pod/.test(c)));
    assert.ok(!columns(db, 'stretch_ask').some((c) => /pod/.test(c)));
    for (const table of [
      'calendar_account',
      'calendar_consent',
      'calendar_write',
    ])
      for (const column of columns(db, table))
        assert.doesNotMatch(
          column,
          /title|summary|description|attendee|location/i,
          `${table}.${column}`,
        );
    assert.ok(
      !columns(db, 'paypal_link').some((c) =>
        /card|bank|account_number/.test(c),
      ),
    );
  } finally {
    done();
  }
});

test('votes are single choice and bookings are always simulated', () => {
  const { db, done } = scratch();
  try {
    seedHangout(db);
    db.prepare(
      "INSERT INTO poll (poll_id, hangout_id, kind, status, closes_at) VALUES ('poll-1', 'h-1', 'time', 'open', ?)",
    ).run(NOW);
    const slot = db.prepare(
      "INSERT INTO time_slot (slot_id, hangout_id, starts_at, ends_at) VALUES (?, 'h-1', ?, ?)",
    );
    slot.run('s-1', '2026-11-20T19:00:00Z', '2026-11-20T21:00:00Z');
    slot.run('s-2', '2026-11-21T19:00:00Z', '2026-11-21T21:00:00Z');
    const option = db.prepare(
      "INSERT INTO poll_option (poll_option_id, poll_id, slot_id) VALUES (?, 'poll-1', ?)",
    );
    option.run('o-1', 's-1');
    option.run('o-2', 's-2');
    const vote = db.prepare(
      "INSERT INTO poll_vote (poll_id, user_id, poll_option_id, voted_at) VALUES ('poll-1', 'u-ben', ?, ?)",
    );
    vote.run('o-1', NOW);
    assert.throws(() => vote.run('o-2', NOW), /UNIQUE constraint|PRIMARY KEY/);
    assert.throws(
      () =>
        db
          .prepare(
            "INSERT INTO booking (hangout_id, status, party_size, starts_at, estimated_total_cents, simulated) VALUES ('h-1', 'booked', 2, ?, 5000, 0)",
          )
          .run(NOW),
      /CHECK constraint/,
    );
  } finally {
    done();
  }
});

test('a failing migration rolls back completely and records nothing', () => {
  const db = openDatabase(':memory:');
  try {
    const broken = [
      ...MIGRATIONS,
      {
        version: MIGRATIONS.length + 1,
        name: 'broken',
        sql: 'CREATE TABLE half_done (x INTEGER) STRICT; INSERT INTO no_such_table VALUES (1);',
      },
    ];
    assert.throws(() => migrate(db, broken), /no such table/);
    assert.equal(currentVersion(db), MIGRATIONS.length);
    assert.ok(!tables(db).includes('half_done'));
    assert.throws(
      () => migrate(db, [{ version: 2, name: 'gap', sql: '' }]),
      /no gaps/,
    );
    assert.throws(() => migrate(db, []), /newer than this code knows/);
  } finally {
    db.close();
  }
});

test('foreign keys are enforced on every connection', () => {
  const { db, done } = scratch();
  try {
    assert.throws(
      () =>
        db
          .prepare(
            "INSERT INTO pod_membership (pod_id, user_id, role, joined_at) VALUES ('no-pod', 'no-user', 'member', ?)",
          )
          .run(NOW),
      /FOREIGN KEY constraint/,
    );
  } finally {
    done();
  }
});
