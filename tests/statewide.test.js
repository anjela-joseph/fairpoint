import test from 'node:test';
import assert from 'node:assert/strict';
import { KERALA_STATEWIDE } from '../data/kerala-statewide.js';
import { LOCATION_METADATA } from '../data/location-index.js';
import { searchSavedLocations } from '../lib/location-index.js';
import { inCoverage } from '../lib/coverage.js';
import { savedVenues, nearbySavedVenues } from '../lib/catalogues.js';
import { distanceKm, DEFAULT_PREFERENCES } from '../lib/discovery.js';
import { candidateTowns } from '../lib/experience.js';
import { searchLocations } from '../lib/geocoding.js';

test('statewide source covers all 14 districts with valid named venues and provenance', () => {
  const { metadata, venues, settlements } = KERALA_STATEWIDE;
  assert.equal(Object.keys(metadata.districtCounts).length, 14);
  assert.ok(Object.values(metadata.districtCounts).every(count => count > 0));
  assert.ok(venues.length > 10000 && settlements.length > 1000);
  assert.equal(new Set(venues.map(v => v.id)).size, venues.length);
  assert.match(metadata.sha256, /^[a-f0-9]{64}$/);
  assert.ok(metadata.osmBase && metadata.geometry && metadata.url.startsWith('https://download.geofabrik.de/'));
  assert.ok(LOCATION_METADATA.count > 50000);
});
test('coverage follows Kerala geometry rather than accepting the whole bounding rectangle', () => {
  assert.equal(inCoverage({ lat: 9.9971, lon: 76.3028 }, KERALA_STATEWIDE.metadata), true);
  assert.equal(inCoverage({ lat: 12.4984, lon: 74.9896 }, KERALA_STATEWIDE.metadata), true);
  assert.equal(inCoverage({ lat: 11.0168, lon: 76.9558 }, KERALA_STATEWIDE.metadata), false); // Coimbatore
});
test('offline typed search reaches towns outside shortcuts and supports aliases and Malayalam', () => {
  for (const query of ['Manjeri', 'Kasaragod', 'Punalur']) {
    const results = searchSavedLocations(query);
    assert.ok(results.some(p => p.name.toLowerCase() === query.toLowerCase()));
    assert.ok(results.length <= 20);
    assert.ok(results.every(p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.source));
  }
  assert.ok(searchSavedLocations('കോട്ടയം').some(p => p.name === 'Kottayam'));
  assert.ok(searchSavedLocations('Sulthan Bathery').some(p => p.matchedAlias));
  assert.deepEqual(searchSavedLocations('xyzzzzunknownplace12345'), []);
});
test('spatial venue lookup preserves exact nearby results while avoiding a statewide scan', () => {
  for (const point of [{ lat: 9.9971, lon: 76.3028 }, { lat: 12.4984, lon: 74.9896 }, { lat: 8.5241, lon: 76.9366 }]) {
    const expected = savedVenues().filter(v => distanceKm(point, v) <= 5).map(v => v.id).sort();
    const shortlist = nearbySavedVenues(point, 5);
    const actual = shortlist.filter(v => distanceKm(point, v) <= 5).map(v => v.id).sort();
    assert.deepEqual(actual, expected);
    assert.ok(shortlist.length < savedVenues().length / 2);
  }
});
test('northern Kerala gets data-derived meeting candidates with a bounded routing matrix', () => {
  const { candidates } = candidateTowns([{ lat: 12.4984, lon: 74.9896 }, { lat: 12.3167, lon: 75.0833 }], DEFAULT_PREFERENCES);
  assert.ok(candidates.length > 10 && candidates.length <= 64);
  assert.ok(candidates.some(town => town.source === 'OpenStreetMap'));
  assert.equal(new Set(candidates.map(town => town.id)).size, candidates.length);
  assert.ok(candidates.filter(town => town.source === 'OpenStreetMap').every(town => town.vibes.length === 0));
});
test('online lookup restricts and filters results to Kerala, including when a stale worldwide option is supplied', async () => {
  let requested;
  const fetchImpl = async url => { requested = url; return { ok: true, json: async () => ({ features: [
    { geometry: { coordinates: [2.2945, 48.8584] }, properties: { gid: 'outside', name: 'Paris' } },
    { geometry: { coordinates: [76.3028, 9.9971] }, properties: { gid: 'inside', name: 'Kaloor', label: 'Kaloor, Kerala' } },
    { geometry: { coordinates: [76.9558, 11.0168] }, properties: { gid: 'outside-state', name: 'Coimbatore' } },
  ] }) }; };
  const results = await searchLocations('Kaloor', { key: 'test', country: 'worldwide', fetchImpl });
  assert.ok(requested.includes('boundary.country=IN') && requested.includes('boundary.rect'));
  assert.deepEqual(results.map(p => p.name), ['Kaloor']);
  assert.equal(results[0].lat, 9.9971);
});
test('scenic farther samples actual nature destinations beyond local exploration circles', () => {
  const friends = [{lat: 9.9971, lon: 76.3028}, {lat: 10.0261, lon: 76.3125}];
  const close = candidateTowns(friends, { ...DEFAULT_PREFERENCES, experience: 'scenic', reach: 30 });
  const far = candidateTowns(friends, { ...DEFAULT_PREFERENCES, experience: 'scenic', reach: 80 });
  assert.equal(far.area.statewide, true);
  assert.ok(far.candidates.length > 20 && far.candidates.length <= 64);
  assert.ok(far.candidates.some(place => distanceKm(place, close.area) > close.area.radiusKm));
  assert.ok(far.candidates.every(place => place.destinationKind && !['park', 'garden'].includes(place.destinationKind)));
  assert.ok(far.candidates.some(place => ['forest', 'dam', 'waterfall'].includes(place.destinationKind)));
});
test('airports and metro stations rank above similarly named road segments', () => {
  assert.equal(searchSavedLocations('Kannur airport')[0].kind, 'airport');
  assert.equal(searchSavedLocations('COK')[0].kind, 'airport');
  assert.equal(searchSavedLocations('Edappally metro')[0].kind, 'metro station');
  const roadResults = searchSavedLocations('Kannur airport').filter(p => p.kind === 'road');
  assert.equal(new Set(roadResults.map(p => p.name + p.address)).size, roadResults.length);
});
test('forests, dams and reservoirs are included as real nature features', () => {
  for(const kind of ['forest','dam','reservoir','waterfall']) assert.ok(KERALA_STATEWIDE.venues.some(p => p.kind === kind && p.categories.includes('nature')));
});
test('local area search works across all fourteen Kerala districts', () => {
  for (const [query, district] of [['Vellayambalam','Thiruvananthapuram'], ['Kadappakada','Kollam'], ['Adoor','Pathanamthitta'], ['Ambalappuzha','Alappuzha'], ['Ettumanoor','Kottayam'], ['Kattappana','Idukki'], ['Kaloor','Ernakulam'], ['Ollur','Thrissur'], ['Olavakkode','Palakkad'], ['Perinthalmanna','Malappuram'], ['Feroke','Kozhikode'], ['Meppadi','Wayanad'], ['Thalassery','Kannur'], ['Kanhangad','Kasaragod']]) {
    assert.ok(searchSavedLocations(`${query} ${district}`).some(place => place.address.includes(district)), query);
  }
});
