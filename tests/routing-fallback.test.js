import test from 'node:test';
import assert from 'node:assert/strict';
import { getDriveMatrix } from '../lib/routing.js';

const friends = [{ lat: 10.0261, lon: 76.3125 }, { lat: 9.9971, lon: 76.3028 }];
const towns = [{ id: 'a', name: 'A', lat: 10.008, lon: 76.325 }, { id: 'b', name: 'B', lat: 10.05, lon: 76.33 }];
const ors = { durations: [[600, 900], [700, 800]], distances: [[5000, 8000], [6000, 7000]] };
const osrm = { code: 'Ok', durations: [[610, 910], [710, 810]], distances: [[5100, 8100], [6100, 7100]] };
const reply = (status, body) => async () => ({ ok: status === 200, status, json: async () => body });

function services({ orsStatus = 200, osrmStatus = 200 }) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    if (options?.signal?.aborted) { const error = new Error('Aborted'); error.name = 'AbortError'; throw error; }
    calls.push(url.includes('openrouteservice') ? 'ors' : url.includes('project-osrm') ? 'osrm' : url);
    return url.includes('openrouteservice') ? reply(orsStatus, ors)() : reply(osrmStatus, osrm)();
  };
  return { calls, fetchImpl };
}

test('uses openrouteservice when it works', async () => {
  const { calls, fetchImpl } = services({});
  const result = await getDriveMatrix(friends, towns, { key: 'k', fetchImpl });
  assert.equal(result.source, 'openrouteservice');
  assert.deepEqual(calls, ['ors']);
});

test('falls back to OSRM when openrouteservice is out of quota or rejects the key', async () => {
  for (const orsStatus of [429, 403, 502]) {
    const { calls, fetchImpl } = services({ orsStatus });
    const result = await getDriveMatrix(friends, towns, { key: 'k', fetchImpl });
    assert.equal(result.source, 'osrm');
    assert.deepEqual(result.durations, osrm.durations);
    assert.deepEqual(calls, ['ors', 'osrm']);
  }
});

test('falls back when the browser blocks the request (CORS / network error)', async () => {
  const fetchImpl = async url => { if (url.includes('openrouteservice')) throw new TypeError('Failed to fetch'); return reply(200, osrm)(); };
  assert.equal((await getDriveMatrix(friends, towns, { key: 'k', fetchImpl })).source, 'osrm');
});

test('works with no key by going straight to OSRM', async () => {
  const { calls, fetchImpl } = services({});
  const result = await getDriveMatrix(friends, towns, { key: '', fetchImpl });
  assert.equal(result.source, 'osrm');
  assert.deepEqual(calls, ['osrm']);
});

test('if both services fail, reports the main service’s reason', async () => {
  const { fetchImpl } = services({ orsStatus: 429, osrmStatus: 503 });
  await assert.rejects(getDriveMatrix(friends, towns, { key: 'k', fetchImpl }), /routing limit has been reached/);
});

test('cancelling a search does not trigger the backup', async () => {
  const controller = new AbortController(); controller.abort();
  const { calls, fetchImpl } = services({});
  await assert.rejects(getDriveMatrix(friends, towns, { key: 'k', fetchImpl, signal: controller.signal }));
  assert.ok(!calls.includes('osrm'));
});
