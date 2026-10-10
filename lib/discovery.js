import { fetchJson } from './network.js';
import { validatePoints } from './scoring.js';
import { savedCatalogueFor } from './local-venues.js';
import { normalizeVenues } from './osm-venues.js';

export const ACTIVITIES = [
  { id: 'restaurant', label: 'Restaurants', icon: 'coffee' },
  { id: 'cafe', label: 'Cafés', icon: 'coffee' },
  { id: 'cinema', label: 'Cinema', icon: 'film' },
  { id: 'theatre', label: 'Theatre', icon: 'music' },
  { id: 'nature', label: 'Nature', icon: 'sun' },
  { id: 'shopping', label: 'Shopping', icon: 'shopping-bag' },
  { id: 'museum', label: 'Museums', icon: 'book-open' },
];
export const DEFAULT_PREFERENCES = { activities: [], vibe: 'any', experience: 'mixed', strategy: 'equal', metric: 'time', reach: 30, avoidVisited: true };

export function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function searchArea(friends, reach = 30) {
  validatePoints(friends, 'Friends');
  const center = { lat: friends.reduce((s, p) => s + p.lat, 0) / friends.length, lon: friends.reduce((s, p) => s + p.lon, 0) / friends.length };
  const radiusKm = Math.max(...friends.map(p => distanceKm(center, p))) + reach;
  return { ...center, radiusKm };
}

export { categoriesFor, normalizeVenues } from './osm-venues.js';

export function buildDiscoveryQuery(area, preferences = DEFAULT_PREFERENCES) {
  // Fetch an outward-rounded search envelope; buildCandidates applies the
  // exact radius afterwards. Avoid unnecessary precision in provider queries.
  const around = `(around:${Math.ceil(area.radiusKm) * 1000},${area.lat.toFixed(5)},${area.lon.toFixed(5)})`;
  // Separate bounded outputs prevent food venues from using the whole output
  // budget before scenic/entertainment places. This is a sample, not an inventory.
  const needed = new Set(preferences.activities.length ? preferences.activities : ACTIVITIES.map(a => a.id));
  if (preferences.vibe === 'scenic') needed.add('nature');
  if (preferences.vibe === 'city' && [...needed].every(id => id === 'nature')) {
    ACTIVITIES.filter(a => a.id !== 'nature').forEach(a => needed.add(a.id));
  }
  const filters = {
    restaurant: ['amenity=restaurant', 'amenity=fast_food', 'amenity=food_court'],
    cafe: ['amenity=cafe'], cinema: ['amenity=cinema'], theatre: ['amenity=theatre'],
    shopping: ['shop=mall'], museum: ['tourism=museum'],
    nature: ['tourism=viewpoint', 'natural=beach', 'natural=waterfall', 'waterway=waterfall', 'leisure=park', 'leisure=nature_reserve', 'leisure=garden'],
  };
  return `[out:json][timeout:25];` + [...needed].sort().map(id => {
    const selectors = filters[id].map(filter => `nwr[${filter}][name]${around};`).join('');
    return `${filters[id].length === 1 ? selectors : `(${selectors});`}out center 100;`;
  }).join('');
}

const cache = new Map();
let nextRequestAt = 0;
export async function discoverVenues(friends, preferences, options = {}) {
  const area = searchArea(friends, preferences.reach);
  const saved = options.useSavedCatalogue === false ? null : savedCatalogueFor(friends);
  if (saved) return { venues: saved.venues, area, source: saved.metadata };
  const query = buildDiscoveryQuery(area, preferences);
  const cached = cache.get(query);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000 && !options.fetchImpl) return { ...cached.value, area };
  if (!options.fetchImpl && Date.now() < nextRequestAt) throw new Error(`Please wait ${Math.ceil((nextRequestAt - Date.now()) / 1000)} seconds before another place search. Cached searches are still available.`);
  if (!options.fetchImpl) nextRequestAt = Date.now() + 30000;
  const endpoint = process.env.EXPO_PUBLIC_OVERPASS_URL || 'https://overpass.private.coffee/api/interpreter';
  try {
    // These bounded queries fit in a URL. The provider's POST gateway can
    // return 500 even when the equivalent read-only GET succeeds.
    const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}data=${encodeURIComponent(query)}`;
    const data = await fetchJson(url, {
      method: 'GET', headers: { 'User-Agent': 'Fairpoint/1.0 (outing planner)' },
    }, { timeout: 30000, ...options });
    if (data.remark || !Array.isArray(data.elements)) throw new Error('Place discovery could not finish. Try a smaller exploration area or retry later.');
    const value = { venues: normalizeVenues(data.elements), area };
    if (!options.fetchImpl) { if (cache.size >= 8) cache.delete(cache.keys().next().value); cache.set(query, { at: Date.now(), value }); }
    return value;
  } catch (error) {
    if (error.status) throw new Error(`Place discovery is unavailable (${error.status}). Try again later.`);
    throw error;
  }
}

export function matchesPreferences(candidate, preferences) {
  const categories = new Set((candidate.places || []).flatMap(p => p.categories));
  return preferences.activities.every(id => categories.has(id)) &&
    (preferences.vibe !== 'scenic' || candidate.categories.includes('nature')) &&
    (preferences.vibe !== 'city' || (!candidate.categories.includes('nature') && candidate.categories.some(id => id !== 'nature')));
}

export function wasVisited(candidate, visited) {
  return visited.some(place => place.id === candidate.id || distanceKm(place, candidate) < 2);
}

export function buildCandidates(venues, preferences, area, visited = [], limit = 24) {
  const eligible = venues.map(venue => ({ ...venue, places: venues
    .map(place => ({ ...place, title: place.name, dist: distanceKm(venue, place) * 1000 }))
    .filter(place => place.dist <= 2000).sort((a, b) => a.dist - b.dist) }))
    .filter(candidate => distanceKm(candidate, area) <= area.radiusKm && matchesPreferences(candidate, preferences) &&
      (!preferences.avoidVisited || !wasVisited(candidate, visited)));
  // Spatially diverse sample: begin near group center, then choose farthest
  // from selected candidates. No intersection-of-friend-radii restriction.
  const selected = [];
  let pool = eligible.sort((a, b) => distanceKm(a, area) - distanceKm(b, area) || a.id.localeCompare(b.id));
  while (pool.length && selected.length < limit) {
    const next = pool.shift(); selected.push(next);
    pool = pool.filter(candidate => distanceKm(candidate, next) >= 1);
    pool.sort((a, b) => Math.min(...selected.map(p => distanceKm(b, p))) - Math.min(...selected.map(p => distanceKm(a, p))) || a.id.localeCompare(b.id));
  }
  return selected;
}
