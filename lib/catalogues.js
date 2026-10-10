import { KOCHI_CATALOGUE } from '../data/kochi.js';
import { KERALA_REGIONS } from '../data/kerala-regions.js';
import { KERALA_STATEWIDE } from '../data/kerala-statewide.js';
import { inCoverage } from './coverage.js';

export const CATALOGUES = [...KERALA_REGIONS, ...(KERALA_STATEWIDE.metadata ? [KERALA_STATEWIDE] : [KOCHI_CATALOGUE])];
export function catalogueAt(point) {
  return CATALOGUES.find(c => inCoverage(point, c.metadata));
}
let allVenues;
export function savedVenues() {
  if (allVenues) return allVenues;
  const seen = new Set();
  allVenues = CATALOGUES.flatMap(c => c.venues.filter(v => { if (seen.has(v.id)) return false; seen.add(v.id); return true; }));
  return allVenues;
}

let grid;
export function nearbySavedVenues(point, radiusKm = 5) {
  if (!grid) {
    grid = new Map();
    for (const venue of savedVenues()) {
      const key = `${Math.floor(venue.lat / 0.05)}:${Math.floor(venue.lon / 0.05)}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(venue);
    }
  }
  // Retrieve a bounding envelope cheaply; callers apply exact haversine distance.
  const dLat = radiusKm / 110.5, dLon = radiusKm / (111 * Math.max(0.01, Math.cos(point.lat * Math.PI / 180)));
  const venues = [];
  for (let lat = Math.floor((point.lat - dLat) / 0.05); lat <= Math.floor((point.lat + dLat) / 0.05); lat++) {
    for (let lon = Math.floor((point.lon - dLon) / 0.05); lon <= Math.floor((point.lon + dLon) / 0.05); lon++) venues.push(...(grid.get(`${lat}:${lon}`) || []));
  }
  return venues;
}
