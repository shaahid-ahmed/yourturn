// US-019 wave 2: calendar HTTP handler tests (listOwnCalendarAccounts,
// startCalendarConnect, disconnectCalendarAccount, setPlannerCalendarAccess,
// getOwnCalendar, addEventToOwnCalendar). All tests use NO_PROVIDER (the
// default) so no real Google credentials are required.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';

const U1 = '01J00000000000000000000001';
const U9 = '01J00000000000000000000009';
const ACCT = '01J00000000000000000000030';
const T0 = '2026-11-12T12:00:00.000Z';
const FROM = '2026-11-15T00:00:00.000Z';
const TO = '2026-11-22T00:00:00.000Z';

function calendarApp() {
  const db = openDatabase(':memory:');
  migrate(db);
  const add = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  add.run(U1, 'Sam', '+15550001111', T0);
  add.run(U9, 'Out', '+15550009999', T0);
  return { app: buildApp({ db }), db };
}

function calendarAppWithAccount() {
  const { app, db } = calendarApp();
  db.prepare(
    "INSERT INTO calendar_account (calendar_account_id, user_id, provider, status, credential_ref, created_at) VALUES (?, ?, 'google', 'connected', 'cred-ref-001', ?)",
  ).run(ACCT, U1, T0);
  db.prepare(
    "INSERT INTO calendar_consent (calendar_account_id, calendar_id, name, planner_may_read) VALUES (?, 'cal-primary', 'Primary', 0)",
  ).run(ACCT);
  return { app, db };
}

/** @param {any} app @param {string} [phone] */
async function signIn(app, phone = '+15550001111') {
  const challenge = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/phone-codes',
    payload: { phone },
  });
  assert.equal(challenge.statusCode, 201);
  const session = await app.inject({
    method: 'POST',
    url: '/api/v1/sessions',
    payload: { challengeId: challenge.json().challengeId, code: '000000' },
  });
  assert.equal(session.statusCode, 201);
  return {
    cookie: session.headers['set-cookie'].split(';')[0],
    'x-csrf-token': session.json().csrfToken,
  };
}

test('calendar: unauthenticated request is rejected with 401', async () => {
  const { app } = calendarApp();
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/me/calendar-accounts',
  });
  assert.equal(res.statusCode, 401);
});

test('calendar: listOwnCalendarAccounts returns empty list when no accounts', async () => {
  const { app } = calendarApp();
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/me/calendar-accounts',
    headers: h1,
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { accounts: [] });
});

test('calendar: listOwnCalendarAccounts returns connected account with calendars', async () => {
  const { app } = calendarAppWithAccount();
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/me/calendar-accounts',
    headers: h1,
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.accounts.length, 1);
  assert.equal(body.accounts[0].calendarAccountId, ACCT);
  assert.equal(body.accounts[0].provider, 'google');
  assert.equal(body.accounts[0].status, 'connected');
  assert.equal(body.accounts[0].calendars.length, 1);
  assert.equal(body.accounts[0].calendars[0].calendarId, 'cal-primary');
  assert.equal(body.accounts[0].calendars[0].plannerMayRead, false);
});

test('calendar: startCalendarConnect without real provider returns 422 calendar_not_connected', async () => {
  const { app } = calendarApp();
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/me/calendar-accounts',
    headers: h1,
    payload: { provider: 'google' },
  });
  assert.equal(res.statusCode, 422);
  assert.equal(res.json().code, 'calendar_not_connected');
});

test('calendar: getOwnCalendar returns empty items when no accounts connected', async () => {
  const { app } = calendarApp();
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/me/calendar?from=${encodeURIComponent(FROM)}&to=${encodeURIComponent(TO)}`,
    headers: h1,
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.from, FROM);
  assert.equal(body.to, TO);
  assert.deepEqual(body.items, []);
});

test('calendar: addEventToOwnCalendar with unknown event id returns 404', async () => {
  const { app } = calendarApp();
  const h1 = await signIn(app);
  // Catalog events use non-ULID IDs; a valid-format ULID that has no catalog
  // entry hits not_found before the calendar-not-connected check.
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/me/calendar/events',
    headers: h1,
    payload: { eventId: '01J00000000000000000000099' },
  });
  assert.equal(res.statusCode, 404);
  assert.equal(res.json().code, 'not_found');
});

test('calendar: setPlannerCalendarAccess toggles plannerMayRead to true', async () => {
  const { app } = calendarAppWithAccount();
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'PUT',
    url: `/api/v1/me/calendar-accounts/${ACCT}/calendars/cal-primary/planner-access`,
    headers: h1,
    payload: { plannerMayRead: true },
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.calendarId, 'cal-primary');
  assert.equal(body.plannerMayRead, true);
});

test('calendar: setPlannerCalendarAccess on another user account returns 404', async () => {
  const { app } = calendarAppWithAccount();
  const h9 = await signIn(app, '+15550009999');
  const res = await app.inject({
    method: 'PUT',
    url: `/api/v1/me/calendar-accounts/${ACCT}/calendars/cal-primary/planner-access`,
    headers: h9,
    payload: { plannerMayRead: true },
  });
  assert.equal(res.statusCode, 404);
});

test('calendar: disconnectCalendarAccount removes account and returns 204', async () => {
  const { app, db } = calendarAppWithAccount();
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'DELETE',
    url: `/api/v1/me/calendar-accounts/${ACCT}`,
    headers: h1,
  });
  assert.equal(res.statusCode, 204);
  const remaining = db
    .prepare('SELECT 1 FROM calendar_account WHERE calendar_account_id = ?')
    .get(ACCT);
  assert.equal(remaining, undefined);
});

test('calendar: disconnectCalendarAccount on another user account returns 404', async () => {
  const { app } = calendarAppWithAccount();
  const h9 = await signIn(app, '+15550009999');
  const res = await app.inject({
    method: 'DELETE',
    url: `/api/v1/me/calendar-accounts/${ACCT}`,
    headers: h9,
  });
  assert.equal(res.statusCode, 404);
});
