import { distanceKm, searchArea } from '../lib/discovery.js';
import { DEMO_FRIENDS } from './demo.js';
// Fictional venues and travel estimates for the exact DEMO_FRIENDS coordinates.
// They demonstrate filters; they are never used for custom starting points.
const places = [
  ['riverside', 'Riverside café stop', 10.11, 76.36, ['cafe', 'restaurant', 'nature'], [65, 42, 82], [46, 23, 58]],
  ['city', 'City coffee & cinema', 10.027, 76.309, ['cafe', 'restaurant', 'cinema', 'shopping'], [88, 30, 87], [62, 15, 64]],
  ['garden', 'Garden-side catch-up', 10.11, 76.475, ['nature', 'cafe', 'restaurant'], [65, 52, 71], [45, 35, 48]],
  ['coast', 'Coastal café afternoon', 10.142, 76.178, ['nature', 'cafe', 'restaurant'], [82, 68, 103], [59, 40, 76]],
  ['hills', 'Hill-view picnic', 10.13, 76.72, ['nature', 'cafe', 'restaurant'], [108, 112, 110], [79, 82, 80]],
  ['stage', 'Dinner & a live stage', 9.957, 76.296, ['theatre', 'restaurant', 'cafe'], [102, 22, 78], [72, 11, 54]],
  ['lake', 'Lakeside slow day', 9.76, 76.40, ['nature', 'restaurant', 'cafe'], [135, 65, 45], [98, 45, 26]],
  ['screen', 'Market & movie evening', 10.21, 76.40, ['cinema', 'theatre', 'shopping', 'cafe', 'restaurant'], [65, 60, 100], [43, 40, 70]],
  ['mountains', 'Mountain day out', 10.96, 76.75, ['nature', 'cafe'], [172, 170, 171], [124, 125, 124]],
];
export const DEMO_OUTINGS = places.map(([id, name, lat, lon, categories]) => ({
  id: `sample:${id}`, name, lat, lon, categories,
  places: categories.map((category, index) => ({ id: `${id}-${category}`, title: `Sample ${category === 'nature' ? 'scenic spot' : category}`, categories: [category], dist: index * 350, illustrative: true })),
}));
export const DEMO_MATRIX = {
  durations: [0, 1, 2].map(i => places.map(row => row[5][i] * 60)),
  distances: [0, 1, 2].map(i => places.map(row => row[6][i] * 1000)),
};

export function demoOutingData(preferences) {
  const area = searchArea(DEMO_FRIENDS, preferences.reach);
  const indices = DEMO_OUTINGS.map((point, i) => distanceKm(point, area) <= area.radiusKm ? i : -1).filter(i => i >= 0);
  return { candidates: indices.map(i => DEMO_OUTINGS[i]), matrix: {
    durations: DEMO_MATRIX.durations.map(row => indices.map(i => row[i])),
    distances: DEMO_MATRIX.distances.map(row => indices.map(i => row[i])),
  }, area };
}
