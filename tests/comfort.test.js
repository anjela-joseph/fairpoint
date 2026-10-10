import test from 'node:test';
import assert from 'node:assert/strict';
import { fairTownRows, rankExperiences, townEvidence } from '../lib/experience.js';
import { DEFAULT_PREFERENCES } from '../lib/discovery.js';

const friends = [{ lat: 10.0, lon: 76.3 }, { lat: 10.01, lon: 76.31 }, { lat: 10.02, lon: 76.32 }];
const prefs = { ...DEFAULT_PREFERENCES, experience: 'city', reach: 30 };
const place = (id, lat) => ({ id, name: id, lat, lon: 76.3, vibes: ['city'] });
const cafes = row => townEvidence(row, [{ id: `${row.id}-c`, name: 'Cafe', lat: row.lat, lon: row.lon, categories: ['cafe', 'restaurant'] }], { kind: 'saved' });
const rank = (candidates, minutes, group = friends) => {
  const durations = group.map((_, i) => candidates.map((_, j) => minutes[j][i] * 60));
  const fair = fairTownRows(group, candidates, { durations }, prefs, []);
  return rankExperiences(fair, fair.rows.map(cafes), prefs);
};

test('friends who live close together get a close spot, not a far "even" one', () => {
  const result = rank([place('near', 10.01), place('far', 10.3)], [[5, 8, 12], [50, 52, 58]]);
  assert.equal(result.winner.id, 'near');
  assert.equal(result.winner.similarity, 100); // all drives under 20 minutes count as even
});

test('friends who live far apart still get the fairer middle', () => {
  const apart = [{ lat: 10.0, lon: 76.3 }, { lat: 10.5, lon: 76.2 }];
  const result = rank([place('lopsided', 10.05), place('middle', 10.25)], [[20, 75], [45, 50]], apart);
  assert.equal(result.winner.id, 'middle');
});
