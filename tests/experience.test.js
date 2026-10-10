import test from 'node:test';
import assert from 'node:assert/strict';
import { fairTownRows, rankExperiences, townEvidence, enrichTowns, candidateTowns } from '../lib/experience.js';
import { DEFAULT_PREFERENCES } from '../lib/discovery.js';
import { normalizeVenues } from '../lib/osm-venues.js';
import { mergeAttractions, getAttractions, wikipediaAttractions } from '../lib/attractions.js';

const preferences = { ...DEFAULT_PREFERENCES, activities: [], experience: 'city', maxMinutes: 180, maxGapMinutes: 30 };
const friends = [{ lat: 10, lon: 76 }, { lat: 10.2, lon: 76.3 }];
const towns = [
  { id: 'a', name: 'A', lat: 0, lon: 0, vibes: ['city'] },
  { id: 'b', name: 'B', lat: 0.1, lon: 0.1, vibes: ['city', 'scenic'] },
  { id: 'c', name: 'C', lat: 0.2, lon: 0.2, vibes: ['scenic'] },
];
const matrix = { durations: [[60, 64, 120], [45, 60, 120]].map(row => row.map(v => v * 60)), distances: [[50000, 53000, 100000], [35000, 51000, 100000]] };
function evidence(row, city = 1, nature = 0) {
  return { ...row, evidenceSource: { kind: 'saved' }, categories: [], counts: { cafe: city, nature },
    places: [...Array.from({ length: city }, (_, i) => ({ id: `c${i}`, categories: ['cafe'] })), ...Array.from({ length: nature }, (_, i) => ({ id: `n${i}`, categories: ['nature'], kind: 'park' }))] };
}
test('longer equal trips remain eligible and scores stay bounded', () => {
  const fair = fairTownRows(friends, towns, matrix, preferences);
  assert.deepEqual(fair.rows.map(row => row.id), ['a', 'b', 'c']);
  assert.equal(fair.bestWorst, 3600);
  assert.equal(fair.worstLimit, undefined);
  const ranked = rankExperiences(fair, fair.rows.map(row => evidence(row, row.id === 'b' ? 8 : 1)), preferences);
  assert.equal(ranked.winner.id, 'b');
  assert.ok(ranked.winner.fairnessScore <= 70 && ranked.winner.experienceScore <= 30);
  assert.equal(ranked.winner.score, ranked.winner.fairnessScore + ranked.winner.experienceScore);
});
test('old hard-limit values are ignored while unreachable and visited places remain excluded', () => {
  assert.equal(fairTownRows(friends, towns, matrix, { ...preferences, maxMinutes: 1, maxGapMinutes: 1 }).rows.length, 3);
  assert.deepEqual(fairTownRows(friends, towns, matrix, preferences, [towns[0]]).rows.map(row => row.id), ['b', 'c']);
  const unreachable = { ...matrix, durations: [[null, 100, 200], [null, 100, 210]] };
  assert.deepEqual(fairTownRows(friends, towns, unreachable, preferences).rows.map(row => row.id), ['b', 'c']);
});
test('scenic farther balances relative road distance and keeps multi-hour trips', () => {
  const pref = { ...preferences, experience: 'scenic', reach: 80, metric: 'time' };
  const roads = { durations: [[3600, 15000, 19000], [4000, 19000, 19500]], distances: [[20000, 200000, 300000], [80000, 205000, 330000]] };
  const fair = fairTownRows(friends, towns, roads, pref);
  const result = rankExperiences(fair, fair.rows.map(row => evidence(row, 0, 6)), pref);
  assert.equal(result.winner.id, 'b');
  assert.ok(result.winner.worst > 180 * 60);
  assert.equal(result.preferences.metric, 'distance');
  assert.equal(result.winner.similarity, 98);
  assert.ok(result.rows.every(row => Number.isFinite(row.score)));
});
test('zero-length journeys have finite, fully balanced scores', () => {
  const zero = { durations: [[0], [0]], distances: [[0], [0]] };
  const fair = fairTownRows(friends, [towns[0]], zero, preferences);
  const result = rankExperiences(fair, fair.rows.map(row => evidence(row, 1)), preferences);
  assert.equal(result.winner.similarity, 100);
  assert.ok(Number.isFinite(result.winner.score));
});
test('city, scenic and mixed require matching evidence; no mismatched fallback result', () => {
  const fair = fairTownRows(friends, towns, matrix, preferences);
  const enriched = fair.rows.map(row => evidence(row, row.id === 'a' ? 8 : 0, row.id === 'b' ? 6 : 0));
  assert.equal(rankExperiences(fair, enriched, preferences).winner.id, 'a');
  assert.equal(rankExperiences(fair, enriched, { ...preferences, experience: 'scenic' }).winner.id, 'b');
  assert.throws(() => rankExperiences(fair, enriched, { ...preferences, experience: 'mixed' }), /No reachable destination/);
  assert.throws(() => rankExperiences(fair, enriched, { ...preferences, activities: ['museum'] }), /No reachable destination/);
});
test('Overpass failure uses explicit handwritten vibes without invented venue counts', async () => {
  const fair = fairTownRows(friends, towns, matrix, preferences);
  const rows = await enrichTowns(fair.rows, { fetchImpl: async () => { throw new Error('offline'); } });
  assert.ok(rows.every(row => row.evidenceSource.kind === 'vibes' && Object.values(row.counts).every(count => count === 0)));
  assert.equal(rankExperiences(fair, rows, { ...preferences, experience: 'mixed' }).winner.id, 'b');
  assert.throws(() => rankExperiences(fair, rows, { ...preferences, activities: ['cafe'] }), /No reachable destination/);
});
test('a successful empty lookup does not fabricate counts or replace them with vibes', async () => {
  const rows = await enrichTowns([{ ...towns[2], id: 'empty-response' }], { fetchImpl: async () => ({ ok: true, json: async () => ({ elements: [] }) }) });
  assert.equal(rows[0].evidenceSource.kind, 'live');
  assert.equal(rows[0].counts.nature, 0);
});
test('experience counts use only places within five km', () => {
  const town = towns[0];
  const row = townEvidence(town, [{ id: 'near', name: 'Museum', lat: 0.001, lon: 0, categories: ['museum'] }, { id: 'far', name: 'Park', lat: 1, lon: 0, categories: ['nature'] }], { kind: 'saved' });
  assert.equal(row.counts.museum, 1);
  assert.equal(row.counts.nature, 0);
});
test('candidate towns include destinations beyond the friends rather than only midpoint towns', () => {
  const { candidates } = candidateTowns([{ lat: 9.99, lon: 76.30 }, { lat: 10.01, lon: 76.31 }], { ...preferences, reach: 80 });
  assert.ok(candidates.some(town => town.lat > 12 || town.lat < 9));
  assert.ok(candidates.every(town => town.vibes.length || town.source === 'OpenStreetMap'));
});
test('OSM parsing prefers English names and recognises museums, hills and historic attractions', () => {
  const base = { type: 'node', lat: 10, lon: 76 };
  const venues = normalizeVenues([
    { ...base, id: 1, tags: { name: 'മ്യൂസിയം', 'name:en': 'History Museum', tourism: 'museum' } },
    { ...base, id: 2, tags: { name: 'Hill', natural: 'peak' } },
    { ...base, id: 3, tags: { name: 'Fort', historic: 'fort' } },
    { ...base, id: 4, tags: { name: 'Hotel', tourism: 'hotel' } },
  ]);
  assert.equal(venues[0].name, 'History Museum');
  assert.deepEqual(venues[0].categories, ['museum']);
  assert.ok(venues.every(v => v.attraction));
  assert.equal(venues.length, 3);
});
test('attractions merge names across sources, retain both links and sort by distance', () => {
  const merged = mergeAttractions([
    { id: 'osm', name: 'Hill-Palace', dist: 400, sources: [{ label: 'OpenStreetMap', url: 'https://www.openstreetmap.org/node/1' }], description: 'Mapped museum.' },
    { id: 'park', name: 'Park', dist: 100, sources: [{ label: 'OpenStreetMap', url: 'https://www.openstreetmap.org/node/2' }] },
  ], [{ id: 'wiki', name: 'Hill Palace', dist: 410, description: 'A museum in Kerala.', sources: [{ label: 'Wikipedia', url: 'https://en.wikipedia.org/?curid=1' }] }]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'park');
  assert.equal(merged[1].description, 'A museum in Kerala.');
  assert.equal(merged[1].sources.length, 2);
});
test('Wikipedia uses nearby English pages and retrieves one-line descriptions', async () => {
  const requested = [];
  const items = await wikipediaAttractions(towns[0], { fetchImpl: async url => {
    requested.push(url);
    return { ok: true, json: async () => url.includes('list=geosearch') ? { query: { geosearch: [{ pageid: 3, title: 'Local museum', dist: 100 }] } } : { query: { pages: { 3: { description: 'A local history museum.' } } } } };
  } });
  assert.ok(requested.every(url => url.startsWith('https://en.wikipedia.org/')));
  assert.equal(items[0].description, 'A local history museum.');
  assert.equal(items[0].dist, 100);
});
test('Wikipedia failure leaves saved OSM attractions available', async () => {
  const result = await getAttractions({ id: 'fort-kochi', lat: 9.9656, lon: 76.2421 }, { fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(result.wikipediaUnavailable, true);
  assert.ok(result.items.length > 0);
  assert.equal(result.osmUnavailable, false);
});
test('cancelled attraction requests do not return a stale town result', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(getAttractions(towns[0], { signal: controller.signal, fetchImpl: async () => { throw new Error('offline'); } }), { name: 'AbortError' });
});
