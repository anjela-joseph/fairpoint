import { fetchJson } from './network.js';
import { inCoverage } from './coverage.js';
import { KERALA_STATEWIDE } from '../data/kerala-statewide.js';

const cache = new Map();
export async function searchLocations(text, options = {}) {
  const query = text.trim();
  if (query.length < 3) throw new Error('Enter at least 3 characters and include a city for better results.');
  const key = options.key ?? process.env.EXPO_PUBLIC_ORS_KEY;
  if (!key?.trim()) throw new Error('Online address search needs your openrouteservice key. You can still use neighbourhood shortcuts or drop an exact map pin.');
  const cacheKey = `kerala:${query.toLowerCase()}`;
  if (cache.has(cacheKey) && !options.fetchImpl) return cache.get(cacheKey);
  const url = `https://api.openrouteservice.org/geocode/search?text=${encodeURIComponent(`${query}, Kerala`)}&size=20&boundary.country=IN&boundary.rect.min_lat=8&boundary.rect.max_lat=13&boundary.rect.min_lon=74.5&boundary.rect.max_lon=77.6`;
  try {
    const data = await fetchJson(url, { headers: { Authorization: key.trim() } }, options);
    if (!Array.isArray(data.features)) throw new Error('Address search returned an invalid response. Please try again.');
    const seen = new Set();
    const places = data.features.flatMap(feature => {
      const [lon, lat] = feature.geometry?.coordinates || [];
      const props = feature.properties || {};
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return [];
      if (!inCoverage({ lat, lon }, KERALA_STATEWIDE.metadata)) return [];
      const id = props.gid || `${lat},${lon}`;
      if (seen.has(id)) return [];
      seen.add(id);
      return [{ id, lat, lon, name: props.name || props.label || 'Search result', address: props.label || props.name || 'Search result', source: 'OpenRouteService', kind: props.layer || 'address' }];
    });
    if (!options.fetchImpl) { if (cache.size >= 40) cache.delete(cache.keys().next().value); cache.set(cacheKey, places); }
    return places;
  } catch (error) {
    if (error.status === 401 || error.status === 403) throw new Error('Address search did not accept the routing key. Check your token and restart Expo.');
    if (error.status === 429) throw new Error('Address search is busy. Try again later or use a map pin.');
    throw error;
  }
}
