import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PREFERENCES as defaults, buildCandidates, buildDiscoveryQuery, categoriesFor, discoverVenues, distanceKm, matchesPreferences, normalizeVenues, searchArea, wasVisited } from '../lib/discovery.js';
import { planOuting, selectAlternative } from '../lib/planner.js';
import { searchLocations } from '../lib/geocoding.js';
import { localLocations } from '../data/locations.js';
import { parseHistory } from '../lib/history.js';
import { getTravelMatrix } from '../lib/routing.js';
import { DEMO_FRIENDS } from '../data/demo.js';
import { DEMO_OUTINGS, DEMO_MATRIX, demoOutingData } from '../data/outings.js';

const plan = (preferences = {}, history = []) => planOuting(DEMO_FRIENDS, DEMO_OUTINGS, DEMO_MATRIX, { ...defaults, ...preferences }, history);
test('similar journeys can select a farther outing while less travel minimizes the longest drive', () => {
  assert.equal(plan().winner.id, 'sample:mountains');
  assert.ok(plan().winner.worst > 120 * 60);
  assert.equal(plan({ strategy: 'shortest' }).winner.id, 'sample:garden');
  assert.equal(plan({ strategy: 'shortest' }).winner.worst / 60, 71);
});
test('legacy planner also ignores obsolete maximum-drive preferences', () => {
  assert.equal(plan({ maxMinutes: 1 }).winner.id, plan().winner.id);
  assert.ok(plan({ maxMinutes: 1 }).rows.some(row => row.worst > 120 * 60));
});
test('Go farther also expands the fixed sample candidate set without mismatching matrix columns', () => {
  const close = demoOutingData({ ...defaults, maxMinutes: 180 });
  const far = demoOutingData({ ...defaults, maxMinutes: 180, reach: 80 });
  assert.ok(!close.candidates.some(p => p.id === 'sample:mountains'));
  assert.ok(far.candidates.some(p => p.id === 'sample:mountains'));
  assert.equal(planOuting(DEMO_FRIENDS, far.candidates, far.matrix, { ...defaults, maxMinutes: 180 }).winner.id, 'sample:mountains');
  assert.ok(far.matrix.durations.every(row => row.length === far.candidates.length));
});
test('all selected activities must be present, with strict scenic/city anchors', () => {
  const cinema = plan({ activities: ['cafe', 'cinema'] });
  assert.ok(cinema.rows.every(row => row.places.some(p => p.categories.includes('cinema'))));
  assert.throws(() => plan({ activities: ['cinema'], vibe: 'scenic' }), /No discovered spot/);
  assert.ok(plan({ vibe: 'city' }).rows.every(row => !row.categories.includes('nature')));
});
test('distance ranking uses the road-distance matrix rather than straight-line coordinates', () => {
  const candidates = DEMO_OUTINGS.slice(0, 2);
  const matrix = { durations: [[600, 1200], [600, 1800]], distances: [[1000, 5000], [9000, 5000]] };
  const friends = DEMO_FRIENDS.slice(0, 2);
  assert.equal(planOuting(friends, candidates, matrix, { ...defaults, metric: 'distance' }).winner.id, candidates[1].id);
  assert.equal(planOuting(friends, candidates, matrix, defaults).winner.id, candidates[0].id);
  assert.throws(() => planOuting(friends, candidates, { durations: matrix.durations }, { ...defaults, metric: 'distance' }), /distances are unavailable/);
});
test('saved outings exclude the venue and nearby area, with an opt-out', () => {
  const winner = plan().winner;
  assert.notEqual(plan({}, [winner]).winner.id, winner.id);
  assert.equal(plan({ avoidVisited: false }, [winner]).winner.id, winner.id);
  assert.equal(wasVisited({ ...winner, id: 'another-venue', lat: winner.lat + 0.001 }, [winner]), true);
});
test('selecting an alternative changes the winner and associated evidence', () => {
  const original = plan();
  const next = selectAlternative(original, original.alternatives[1].id);
  assert.notEqual(next.winner.id, original.winner.id);
  assert.deepEqual(next.places, next.winner.places);
  assert.equal(selectAlternative(original, 'missing'), original);
});
test('search exploration extends outside shared radii without clipping far-apart friends', () => {
  const friends = [{ lat: 10, lon: 76 }, { lat: 10, lon: 76.1 }];
  const area = searchArea(friends, 80);
  const far = { id: 'far', name: 'Far café', lat: 10.5, lon: 76.05, categories: ['cafe'] };
  assert.ok(distanceKm(far, friends[0]) > 50 && distanceKm(far, friends[1]) > 50);
  assert.ok(buildCandidates([far], defaults, area).some(p => p.id === 'far'));
  assert.ok(searchArea([{ lat: 8.52, lon: 76.94 }, { lat: 12.5, lon: 74.99 }], 80).radiusKm > 150);
});
test('nearby activity evidence uses a real distance cutoff', () => {
  const cafe = { id: 'cafe', name: 'Cafe', lat: 10, lon: 76, categories: ['cafe'] };
  const cinema = { id: 'cinema', name: 'Cinema', lat: 10.005, lon: 76, categories: ['cinema'] };
  const farTheatre = { id: 'theatre', name: 'Stage', lat: 10.1, lon: 76, categories: ['theatre'] };
  const area = { lat: 10, lon: 76, radiusKm: 30 };
  assert.ok(buildCandidates([cafe, cinema, farTheatre], { ...defaults, activities: ['cafe', 'cinema'] }, area).length);
  assert.equal(buildCandidates([cafe, cinema, farTheatre], { ...defaults, activities: ['cafe', 'theatre'] }, area).length, 0);
});
test('candidate sampling keeps geographic diversity, caps size, and excludes visited areas', () => {
  const venues = Array.from({ length: 40 }, (_, i) => ({ id: String(i), name: `Cafe ${i}`, lat: 10 + i * 0.02, lon: 76, categories: ['cafe'] }));
  const selected = buildCandidates(venues, defaults, { lat: 10, lon: 76, radiusKm: 100 }, [venues[0]]);
  assert.equal(selected.length, 24);
  assert.ok(selected.every(row => !wasVisited(row, [venues[0]])));
  assert.ok(selected.some(row => row.id === '39'));
});
test('venue parsing classifies actual OSM tags, deduplicates IDs, and rejects invalid centers', () => {
  assert.deepEqual(categoriesFor({ amenity: 'cinema' }), ['cinema']);
  assert.deepEqual(categoriesFor({ waterway: 'waterfall' }), ['nature']);
  const node = { type: 'node', id: 1, lat: 10, lon: 76, tags: { name: 'A', amenity: 'cafe' } };
  const output = normalizeVenues([node, node, { ...node, id: 2, lat: 100 }, { type: 'way', id: 3, center: { lat: 10, lon: 76 }, tags: { name: 'Garden', leisure: 'garden' } }]);
  assert.equal(output.length, 2);
  assert.equal(output[1].url, 'https://www.openstreetmap.org/way/3');
});
test('place discovery treats partial timeout responses as a failure, not an empty success', async () => {
  await assert.rejects(discoverVenues(DEMO_FRIENDS, defaults, { fetchImpl: async () => ({ ok: true, json: async () => ({ elements: [], remark: 'timeout' }) }) }), /could not finish/);
});
test('discovery uses an encoded GET query supported by the approved provider', async () => {
  let url, request;
  const result = await discoverVenues(DEMO_FRIENDS, defaults, { fetchImpl: async (requestedUrl, options) => {
    url = new URL(requestedUrl); request = options;
    return { ok: true, json: async () => ({ elements: [] }) };
  } });
  assert.equal(url.hostname, 'overpass.private.coffee');
  assert.match(url.searchParams.get('data'), /^\[out:json\]/);
  assert.equal(request.method, 'GET');
  assert.equal(request.body, undefined);
  assert.deepEqual(result.venues, []);
});
test('discovery requests selected activities and any required setting anchors only', () => {
  const area = { lat: 10, lon: 76, radiusKm: 30 };
  const cafe = buildDiscoveryQuery(area, { ...defaults, activities: ['cafe'] });
  assert.match(cafe, /amenity=cafe/);
  assert.ok(!cafe.includes('cinema') && !cafe.includes('leisure'));
  const scenic = buildDiscoveryQuery(area, { ...defaults, activities: ['cafe'], vibe: 'scenic' });
  assert.match(scenic, /amenity=cafe/);
  assert.match(scenic, /tourism=viewpoint/);
  const cityNature = buildDiscoveryQuery(area, { ...defaults, activities: ['nature'], vibe: 'city' });
  assert.match(cityNature, /amenity=cafe/);
  assert.match(cityNature, /natural=beach/);
});
test('location shortcuts include Kochi neighbourhoods and match multiple words', () => {
  assert.equal(localLocations('Kochi Edappally')[0].name, 'Edappally');
  assert.equal(localLocations('kaloor')[0].name, 'Kaloor');
  assert.equal(localLocations('fort kochi')[0].name, 'Fort Kochi');
});
test('online geocoding encodes the query and preserves exact returned coordinates/address', async () => {
  let requested;
  const result = await searchLocations('Cafe & street, Kochi', { key: 'test-key', fetchImpl: async (url, options) => {
    requested = url; assert.equal(options.headers.Authorization, 'test-key');
    return { ok: true, json: async () => ({ features: [{ geometry: { coordinates: [76.31415, 10.02468] }, properties: { name: 'A cafe', label: 'A cafe, Kochi, India', gid: 'osm:venue:1' } }] }) };
  } });
  assert.ok(requested.includes('Cafe%20%26%20street%2C%20Kochi'));
  assert.equal(result[0].lat, 10.02468);
  assert.equal(result[0].address, 'A cafe, Kochi, India');
  await assert.rejects(searchLocations('test street', { key: '' }), /needs your openrouteservice key/);
});
test('routing requests and validates both road duration and distance', async () => {
  const candidates = DEMO_OUTINGS.slice(0, 2), friends = DEMO_FRIENDS.slice(0, 2);
  let payload;
  const response = { durations: [[1, 2], [3, 4]], distances: [[100, 200], [300, 400]] };
  const result = await getTravelMatrix(friends, candidates, { key: 'test', fetchImpl: async (_, options) => { payload = JSON.parse(options.body); return { ok: true, json: async () => response }; } });
  assert.deepEqual(payload.metrics, ['duration', 'distance']);
  assert.deepEqual(result.distances, response.distances);
});
test('stored history is validated and separate modes remain tagged', () => {
  assert.deepEqual(parseHistory('bad json'), []);
  const sample = { id: 'sample:one', name: 'Sample', lat: 10, lon: 76, kind: 'demo' };
  assert.deepEqual(parseHistory(JSON.stringify([sample, { ...sample, lat: 999 }, { ...sample, kind: 'unknown' }])), [sample]);
});
