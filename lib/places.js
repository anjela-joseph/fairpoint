import { fetchJson } from './network.js';
import { validatePoints } from './scoring.js';

export async function getPlaces(lat, lon, options = {}) {
  validatePoints([{ lat, lon }]);
  const url = 'https://en.wikipedia.org/w/api.php?action=query&list=geosearch' +
    `&gscoord=${lat}%7C${lon}&gsradius=5000&gslimit=8&format=json&origin=*`;
  const data = await fetchJson(url, {}, { timeout: 6000, ...options });
  if (data.error || !Array.isArray(data.query?.geosearch)) throw new Error('Nearby places are unavailable.');
  return data.query.geosearch.filter(p => typeof p.title === 'string' && Number.isFinite(p.dist))
    .map(p => ({ title: p.title, dist: p.dist, pageid: p.pageid }));
}
