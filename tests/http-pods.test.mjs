// US-019 wave 4: pods, invitations, links, rhythm and activities over HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';

const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const U3 = '01J00000000000000000000003';
const AT_USERS = [
  [U1, 'Sam', '+15550001111'],
  [U2, 'Pri', '+15550002222'],
  [U3, 'Lee', '+15550003333'],
];

/** App with three seeded synthetic users. */
function podsApp() {
  const db = openDatabase(':memory:');
  migrate(db);
  const add = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  for (const [id, name, phone] of AT_USERS)
    add.run(id, name, phone, '2026-11-12T12:00:00.000Z');
  return buildApp({ db });
}

/**
 * @param {any} app
 * @param {string} [phone]
 */
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

/**
 * @param {any} app
 * @param {any} headers
 * @param {string[]} [invitePhones]
 */
async function createPod(app, headers, invitePhones = []) {
  const phones = invitePhones.length
    ? await app.inject({
        method: 'POST',
        url: '/api/v1/contacts/matches',
        headers,
        payload: { phones: invitePhones },
      })
    : null;
  void phones;
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/pods',
    headers,
    payload: { name: 'Friday crew', inviteUserIds: [] },
  });
  assert.equal(res.statusCode, 201);
  return res.json();
}

test('wave4: create, list and read a pod', async () => {
  const app = podsApp();
  const h1 = await signIn(app);
  const pod = await createPod(app, h1);
  assert.equal(pod.memberCount, 1);
  assert.equal(pod.stage, 'none');
  assert.equal(pod.muted, false);
  assert.equal(pod.rhythm, null);
  const list = await app.inject({
    method: 'GET',
    url: '/api/v1/pods',
    headers: { cookie: h1.cookie },
  });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().pods.length, 1);
  assert.equal(list.json().pods[0].podId, pod.podId);
  const anon = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${pod.podId}`,
  });
  assert.equal(anon.statusCode, 401);
});

test('wave4: invite, accept, leave and remove', async () => {
  const app = podsApp();
  const h1 = await signIn(app);
  const h2 = await signIn(app, '+15550002222');
  const h3 = await signIn(app, '+15550003333');
  await app.inject({
    method: 'PUT',
    url: '/api/v1/me/permissions',
    headers: h1,
    payload: {
      contacts: 'granted',
      notifications: 'not_asked',
      calendar: 'not_asked',
    },
  });
  const pod = await createPod(app, h1);
  const invited = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${pod.podId}/members`,
    headers: h1,
    payload: { userIds: [U2, U3] },
  });
  assert.equal(invited.statusCode, 201);
  assert.equal(invited.json().invitations.length, 2);
  const mine = await app.inject({
    method: 'GET',
    url: '/api/v1/me/pod-invitations',
    headers: { cookie: h2.cookie },
  });
  assert.equal(mine.json().invitations.length, 1);
  const joined = await app.inject({
    method: 'POST',
    url: `/api/v1/me/pod-invitations/${mine.json().invitations[0].invitationId}/acceptance`,
    headers: h2,
  });
  assert.equal(joined.statusCode, 200);
  assert.ok(
    joined
      .json()
      .members.some((/** @type {{ userId: string }} */ m) => m.userId === U2),
  );
  const mine3 = await app.inject({
    method: 'GET',
    url: '/api/v1/me/pod-invitations',
    headers: { cookie: h3.cookie },
  });
  const declined = await app.inject({
    method: 'POST',
    url: `/api/v1/me/pod-invitations/${mine3.json().invitations[0].invitationId}/decline`,
    headers: h3,
  });
  assert.equal(declined.statusCode, 204);
  const removed = await app.inject({
    method: 'DELETE',
    url: `/api/v1/pods/${pod.podId}/members/${U2}`,
    headers: h1,
  });
  assert.equal(removed.statusCode, 204);
  const gone = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${pod.podId}`,
    headers: { cookie: h2.cookie },
  });
  assert.equal(gone.statusCode, 404);
  const creatorLeft = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${pod.podId}/members/me/leave`,
    headers: h1,
  });
  assert.equal(creatorLeft.statusCode, 204);
  const empty = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${pod.podId}`,
    headers: { cookie: h1.cookie },
  });
  assert.equal(empty.statusCode, 404);
});

test('wave4: invite links use the configured public origin', async () => {
  const db = openDatabase(':memory:');
  migrate(db);
  db.prepare(
    "INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES ('01J00000000000000000000001', 'Sam', '+15550001111', 1, '2026-11-12T12:00:00.000Z')",
  ).run();
  const app = buildApp({ db, publicOrigin: 'https://demo.example.org' });
  const h1 = await signIn(app);
  const pod = await createPod(app, h1);
  const link = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${pod.podId}/invite-links`,
    headers: h1,
  });
  assert.equal(link.statusCode, 201);
  assert.ok(link.json().url.startsWith('https://demo.example.org/i/'));
});

test('wave4: invite links are single use', async () => {
  const app = podsApp();
  const h1 = await signIn(app);
  const h3 = await signIn(app, '+15550003333');
  const pod = await createPod(app, h1);
  const link = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${pod.podId}/invite-links`,
    headers: h1,
  });
  assert.equal(link.statusCode, 201);
  assert.equal(link.json().singleUse, true);
  assert.equal(link.json().status, 'active');
  const token = new URL(link.json().url).pathname.split('/').pop();
  const joined = await app.inject({
    method: 'POST',
    url: `/api/v1/invite-links/${token}/acceptance`,
    headers: h3,
  });
  assert.equal(joined.statusCode, 200);
  const reused = await app.inject({
    method: 'POST',
    url: `/api/v1/invite-links/${token}/acceptance`,
    headers: h3,
  });
  assert.equal(reused.statusCode, 409);
});

test('wave4: mute, rhythm and activities', async () => {
  const app = podsApp();
  const h1 = await signIn(app);
  const h2 = await signIn(app, '+15550002222');
  await app.inject({
    method: 'PUT',
    url: '/api/v1/me/permissions',
    headers: h1,
    payload: {
      contacts: 'granted',
      notifications: 'not_asked',
      calendar: 'not_asked',
    },
  });
  const pod = await createPod(app, h1);
  await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${pod.podId}/members`,
    headers: h1,
    payload: { userIds: [U2] },
  });
  const invites = await app.inject({
    method: 'GET',
    url: '/api/v1/me/pod-invitations',
    headers: { cookie: h2.cookie },
  });
  await app.inject({
    method: 'POST',
    url: `/api/v1/me/pod-invitations/${invites.json().invitations[0].invitationId}/acceptance`,
    headers: h2,
  });
  const muted = await app.inject({
    method: 'PUT',
    url: `/api/v1/pods/${pod.podId}/members/me/mute`,
    headers: h1,
    payload: { muted: true },
  });
  assert.equal(muted.statusCode, 200);
  assert.equal(muted.json().muted, true);
  const proposal = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${pod.podId}/rhythm-proposals`,
    headers: h1,
    payload: { cadence: 'weekly' },
  });
  assert.equal(proposal.statusCode, 201);
  const agreed = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${pod.podId}/rhythm-proposals/${proposal.json().proposalId}/acceptances`,
    headers: h2,
  });
  assert.equal(agreed.statusCode, 200);
  assert.equal(agreed.json().status, 'agreed');
  const act = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${pod.podId}/group-activities`,
    headers: h1,
    payload: { label: 'Bowling' },
  });
  assert.equal(act.statusCode, 201);
  const acts = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${pod.podId}/group-activities`,
    headers: { cookie: h1.cookie },
  });
  assert.equal(acts.json().activities.length, 1);
  assert.equal(acts.json().activities[0].addedBy.firstName, 'Sam');
});
