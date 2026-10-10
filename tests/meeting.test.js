import test from 'node:test';
import assert from 'node:assert/strict';
import { pickWinner } from '../lib/scoring.js';
import { findMeeting } from '../lib/meeting.js';
import { getTimes } from '../lib/routing.js';
import { getPlaces } from '../lib/places.js';
import { fetchJson } from '../lib/network.js';
import { DEMO_FRIENDS, DEMO_DURATIONS, DEMO_PLACES } from '../data/demo.js';
import { CANDIDATES } from '../data/candidates.js';

const friends = [{ lat: 10, lon: 76 }, { lat: 11, lon: 77 }];
const towns = [{ name: 'A', lat: 10.5, lon: 76.5 }, { name: 'B', lat: 10.4, lon: 76.4 }, { name: 'C', lat: 10.3, lon: 76.3 }];
const ok = data => async () => ({ ok: true, json: async () => data });

test('minimax considers the longest trip, not just total time', () => {
  const result = pickWinner(friends, towns, [[0, 60, 50], [100, 60, 80]]);
  assert.equal(result.rows[0].name, 'B');
  assert.equal(result.rows[0].worst, 60);
  assert.equal(result.naive.name, 'A');
});
test('ties use total travel time and then town name', () => {
  assert.deepEqual(pickWinner(friends, towns, [[50, 30, 30], [60, 60, 60]]).rows.map(r => r.name), ['B', 'C', 'A']);
});
test('unreachable candidates are excluded; zero duration is valid', () => {
  const result = pickWinner(friends, towns, [[null, 0, 10], [1, 0, null]]);
  assert.deepEqual(result.rows.map(r => r.name), ['B']);
  assert.equal(result.rows[0].worst, 0);
  assert.equal(result.naive.name, 'B');
});
test('malformed matrices and coordinates are rejected', () => {
  for (const matrix of [undefined, [[1, 2, 3]], [[1], [2]], [[NaN, 1, 2], [1, 2, 3]], [[-1, 1, 2], [1, 2, 3]], [['60', 1, 2], [1, 2, 3]]]) {
    assert.throws(() => pickWinner(friends, towns, matrix), /invalid travel-time matrix/);
  }
  assert.throws(() => pickWinner([{ lat: 100, lon: 76 }, friends[0]], towns, []), /valid latitude/);
  assert.throws(() => pickWinner([friends[0]], towns, [[1, 2, 3]]), /2–4/);
});
test('all unreachable produces a helpful error', async () => {
  await assert.rejects(findMeeting(friends, towns, [[null, null, null], [1, 2, 3]], async () => []), /No town is reachable/);
});
test('amenity filtering reports its fairness tradeoff', async () => {
  const result = await findMeeting(friends, towns, [[10, 20, 30], [10, 20, 30]], async lat => lat === 10.4 ? DEMO_PLACES : []);
  assert.equal(result.winner.name, 'B');
  assert.equal(result.amenityTradeoff, true);
});
test('sparse places preserve the fairest town and its own places', async () => {
  const result = await findMeeting(friends, towns, [[10, 20, 30], [10, 20, 30]], async lat => [{ title: String(lat), dist: 1 }]);
  assert.equal(result.winner.name, 'A');
  assert.equal(result.places[0].title, '10.5');
});
test('places outage still returns a valid routing result', async () => {
  let calls = 0;
  const result = await findMeeting(friends, towns, [[10, 20, 30], [10, 20, 30]], async () => { calls++; throw new Error('Offline'); });
  assert.equal(result.winner.name, 'A');
  assert.equal(result.placesUnavailable, true);
  assert.equal(calls, 1);
});
test('cancelled searches do not continue checking towns', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(findMeeting(friends, towns, [[10, 20, 30], [10, 20, 30]], async () => [], controller.signal), { name: 'AbortError' });
});
test('fixed sample matches its friends and all candidate columns', async () => {
  assert.equal(DEMO_DURATIONS.length, DEMO_FRIENDS.length);
  assert.ok(DEMO_DURATIONS.every(row => row.length === CANDIDATES.length));
  const result = await findMeeting(DEMO_FRIENDS, CANDIDATES, DEMO_DURATIONS, async () => DEMO_PLACES);
  assert.equal(result.winner.name, 'Perumbavoor');
  assert.equal(result.naive.name, 'Tripunithura');
  assert.equal(result.winner.worst / 60, 71);
  assert.equal((result.naive.worst - result.winner.worst) / 60, 34);
});
test('routing sends longitude first and correct source/destination indices', async () => {
  let body;
  const durations = [[1, 2, 3], [4, 5, 6]];
  await getTimes(friends, towns, { key: 'test-token', fetchImpl: async (url, options) => {
    assert.match(url, /matrix\/driving-car$/);
    assert.equal(options.headers.Authorization, 'test-token');
    body = JSON.parse(options.body);
    return { ok: true, json: async () => ({ durations }) };
  } });
  assert.deepEqual(body.locations[0], [76, 10]);
  assert.deepEqual(body.sources, [0, 1]);
  assert.deepEqual(body.destinations, [2, 3, 4]);
  assert.deepEqual(body.metrics, ['duration']);
});
test('missing key, invalid token, and quota errors are actionable', async () => {
  await assert.rejects(getTimes(friends, towns, { key: '' }), /needs an openrouteservice key/);
  for (const [status, message] of [[403, /not accepted/], [429, /limit has been reached/], [500, /unavailable/]]) {
    await assert.rejects(getTimes(friends, towns, { key: 'test', fetchImpl: async () => ({ ok: false, status }) }), message);
  }
});
test('Wikipedia keeps useful place metadata and rejects malformed payloads', async () => {
  const places = await getPlaces(10, 76, { fetchImpl: ok({ query: { geosearch: [{ title: 'Place', dist: 90, pageid: 7 }] } }) });
  assert.deepEqual(places, [{ title: 'Place', dist: 90, pageid: 7 }]);
  await assert.rejects(getPlaces(10, 76, { fetchImpl: ok({ error: { code: 'bad' } }) }), /unavailable/);
});
test('timeouts and upstream cancellation abort fetch', async () => {
  const blockingFetch = async (_, { signal }) => new Promise((resolve, reject) => {
    const abort = () => { const error = new Error('Aborted'); error.name = 'AbortError'; reject(error); };
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  });
  await assert.rejects(fetchJson('https://example.test', {}, { timeout: 5, fetchImpl: blockingFetch }), /timed out/);
  const controller = new AbortController();
  const promise = fetchJson('https://example.test', {}, { signal: controller.signal, fetchImpl: blockingFetch });
  controller.abort();
  await assert.rejects(promise, { name: 'AbortError' });
});
