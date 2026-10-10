import test from 'node:test';
import assert from 'node:assert/strict';
import { KOCHI_CATALOGUE } from '../data/kochi.js';
import { savedCatalogueFor } from '../lib/local-venues.js';
import { discoverVenues, buildCandidates, DEFAULT_PREFERENCES } from '../lib/discovery.js';

const friends = [{ lat: 10.0261, lon: 76.3125 }, { lat: 9.9971, lon: 76.3028 }];
test('saved Kochi dataset has unique real OSM IDs, coordinates, provenance, and all six categories', () => {
  const { venues, metadata } = KOCHI_CATALOGUE;
  assert.ok(venues.length > 1000);
  assert.equal(new Set(venues.map(v => v.id)).size, venues.length);
  for (const venue of venues) {
    assert.match(venue.id, /^osm:(node|way|relation):\d+$/);
    assert.ok(venue.name.trim());
    assert.ok(venue.lat > 9.8 && venue.lat < 10.2 && venue.lon > 76.1 && venue.lon < 76.5);
    assert.match(venue.url, /^https:\/\/www\.openstreetmap\.org\//);
  }
  for (const [category, count] of Object.entries(metadata.counts)) {
    assert.ok(count > 0);
    assert.equal(count, venues.filter(v => v.categories.includes(category)).length);
  }
  assert.ok(metadata.sources.length && metadata.osmBaseOldest && metadata.osmBaseNewest);
  assert.equal(metadata.license, 'ODbL 1.0');
});

test('Kochi discovery succeeds with network unavailable, and candidates retain activity evidence', async () => {
  const result = await discoverVenues(friends, DEFAULT_PREFERENCES, { fetchImpl: () => { throw new Error('Network unavailable'); } });
  assert.equal(result.source.id, 'kochi-snapshot');
  assert.ok(result.venues.length > 1000);
  const preferences = { ...DEFAULT_PREFERENCES, activities: ['cafe', 'cinema'] };
  const candidates = buildCandidates(result.venues, preferences, result.area);
  assert.ok(candidates.length > 1 && candidates.length <= 24);
  assert.ok(candidates.every(c => preferences.activities.every(id => c.places.some(p => p.categories.includes(id)))));
});

test('saved coverage requires every friend to be in the Kochi area', () => {
  assert.equal(savedCatalogueFor([]), null);
  assert.equal(savedCatalogueFor([...friends, { lat: 10.52, lon: 76.21 }]), null);
  assert.equal(savedCatalogueFor([{ lat: 9.96, lon: 76.24 }, ...friends]).metadata.id, 'kochi-snapshot');
});

test('trips outside Kochi still use live discovery instead of silently limiting to Kochi', async () => {
  let requested = false;
  const result = await discoverVenues([{ lat: 10.52, lon: 76.21 }, ...friends], DEFAULT_PREFERENCES, { fetchImpl: async () => {
    requested = true;
    return { ok: true, json: async () => ({ elements: [] }) };
  } });
  assert.equal(requested, true);
  assert.equal(result.source, undefined);
  assert.deepEqual(result.venues, []);
});
