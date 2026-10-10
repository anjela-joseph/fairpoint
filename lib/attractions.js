import { fetchJson } from './network.js';
import { distanceKm } from './discovery.js';
import { normalizeVenues } from './osm-venues.js';
import { nearbySavedVenues, catalogueAt } from './catalogues.js';

const nameKey = name => name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const oneLine = text => String(text || '').replace(/\s+/g, ' ').trim().slice(0, 240);
export function osmAttractions(town, venues = nearbySavedVenues(town, 5)) {
  return venues.filter(place => place.attraction || place.categories.includes('nature') || place.categories.includes('museum') || place.categories.includes('historic'))
    .map(place => ({ ...place, dist: distanceKm(town, place) * 1000,
      description: oneLine(place.description) || `${(place.kind || place.categories[0] || 'Place').replace(/_/g, ' ')} mapped in OpenStreetMap.`,
      sources: [{ label: 'OpenStreetMap', url: place.url }] }))
    .filter(place => place.dist <= 5000).sort((a, b) => a.dist - b.dist);
}

export function mergeAttractions(osm, wikipedia) {
  const merged = [], keys = new Map();
  for (const place of [...osm, ...wikipedia]) {
    const names = [place.name, ...(place.alternateNames || [])].filter(Boolean).map(nameKey).filter(Boolean);
    const existing = names.map(name => keys.get(name)).find(index => index !== undefined);
    if (existing !== undefined) {
      const old = merged[existing];
      const isWikipedia = place.sources.some(source => source.label === 'Wikipedia');
      merged[existing] = { ...old, ...(isWikipedia ? { name: place.name, description: place.description } : {}),
        sources: [...new Map([...old.sources, ...place.sources].map(source => [source.url, source])).values()] };
      names.forEach(name => keys.set(name, existing));
    } else {
      names.forEach(name => keys.set(name, merged.length));
      merged.push(place);
    }
  }
  return merged.sort((a, b) => a.dist - b.dist || a.name.localeCompare(b.name));
}

export async function wikipediaAttractions(town, options = {}) {
  const base = 'https://en.wikipedia.org/w/api.php?origin=*&format=json&action=query';
  const nearby = await fetchJson(`${base}&list=geosearch&gscoord=${town.lat}%7C${town.lon}&gsradius=5000&gslimit=20`, {}, { timeout: 7000, ...options });
  if (nearby.error || !Array.isArray(nearby.query?.geosearch)) throw new Error('Wikipedia nearby search unavailable');
  const pages = nearby.query.geosearch.filter(page => typeof page.title === 'string' && Number.isInteger(page.pageid) && Number.isFinite(page.dist) && page.dist >= 0 && page.dist <= 5000);
  if (!pages.length) return [];
  const details = await fetchJson(`${base}&prop=description%7Cextracts&exintro=1&explaintext=1&exsentences=1&exlimit=20&pageids=${pages.map(page => page.pageid).join('%7C')}`, {}, { timeout: 7000, ...options });
  if (details.error || !details.query?.pages) throw new Error('Wikipedia descriptions unavailable');
  return pages.map(page => ({ id: `wiki:${page.pageid}`, name: page.title, dist: page.dist,
    description: oneLine(details.query.pages[page.pageid]?.description || details.query.pages[page.pageid]?.extract) || 'Nearby place documented on English Wikipedia.',
    sources: [{ label: 'Wikipedia', url: `https://en.wikipedia.org/?curid=${page.pageid}` }] }));
}

export async function liveOsmAttractions(town, options = {}) {
  const around = `(around:5000,${town.lat},${town.lon})`;
  const query = `[out:json][timeout:8];(nwr[tourism][name]${around};nwr[historic][name]${around};nwr[natural~"^(beach|peak|hill|waterfall)$"][name]${around};nwr[leisure~"^(park|nature_reserve|garden)$"][name]${around};nwr[waterway=waterfall][name]${around};);out center tags 300;`;
  const data = await fetchJson(process.env.EXPO_PUBLIC_OVERPASS_URL || 'https://overpass-api.de/api/interpreter', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}`,
  }, { timeout: 10000, ...options });
  if (data.remark || !Array.isArray(data.elements)) throw new Error('OpenStreetMap attractions unavailable');
  return osmAttractions(town, normalizeVenues(data.elements));
}

const cache = new Map();
export async function getAttractions(town, options = {}) {
  const key = `${town.id}:${town.lat}:${town.lon}`;
  const cached = cache.get(key);
  if (!options.fetchImpl && cached && Date.now() - cached.at < 3600000) return cached.value;
  const saved = osmAttractions(town);
  const catalogue = catalogueAt(town);
  const results = await Promise.allSettled([
    wikipediaAttractions(town, options),
    catalogue ? Promise.resolve(saved) : liveOsmAttractions(town, options),
  ]);
  if (options.signal?.aborted) { const error = new Error('Cancelled'); error.name = 'AbortError'; throw error; }
  const [wiki, osm] = results;
  const value = { items: mergeAttractions(osm.status === 'fulfilled' ? osm.value : saved, wiki.status === 'fulfilled' ? wiki.value : []),
    wikipediaUnavailable: wiki.status === 'rejected', osmUnavailable: osm.status === 'rejected', saved: !!catalogue };
  if (!options.fetchImpl && !value.wikipediaUnavailable && !value.osmUnavailable) {
    if (cache.size >= 32) cache.delete(cache.keys().next().value);
    cache.set(key, { at: Date.now(), value });
  }
  return value;
}
