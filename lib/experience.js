import { pickWinner } from './scoring.js';
import { distanceKm, searchArea, wasVisited } from './discovery.js';
import { fetchJson } from './network.js';
import { normalizeVenues } from './osm-venues.js';
import { catalogueAt, nearbySavedVenues, savedVenues } from './catalogues.js';
import { TOWNS } from '../data/towns.js';
import { KERALA_STATEWIDE } from '../data/kerala-statewide.js';

export const CITY_CATEGORIES = ['cafe', 'restaurant', 'theatre', 'cinema', 'shopping', 'museum'];
export const NEARBY_KM = 5;
// Below these, a longer drive for one friend doesn't count as unfair: 12 vs 5 minutes is fine.
// Evenness only matters for the part of each journey beyond the comfort threshold.
export const COMFORT = { time: 20 * 60, distance: 12000, straightKm: 8 };
export const journeyMetric = preferences => preferences.experience === 'scenic' && preferences.reach >= 80 ? 'distance' : preferences.metric;

export function candidateTowns(friends, preferences) {
  const area = { ...searchArea(friends, preferences.reach), statewide: preferences.reach >= 80 };
  const scenic = preferences.experience === 'scenic';
  const outdoorKinds = new Set(['forest', 'waterfall', 'dam', 'reservoir', 'national_park', 'nature_reserve', 'viewpoint', 'peak', 'hill', 'beach']);
  const inArea = point => area.statewide || distanceKm(point, area) <= area.radiusKm;
  // Route named scenic destinations themselves, rather than incidental towns nearby.
  const source = scenic ? savedVenues().filter(place => place.categories.includes('nature') && !['private', 'no'].includes(place.access) && (!area.statewide || outdoorKinds.has(place.kind)))
    .map(place => ({ ...place, destinationKind: place.kind, vibes: [], source: 'OpenStreetMap' }))
    : [...TOWNS, ...KERALA_STATEWIDE.settlements];
  const scenicFarther = scenic && area.statewide;
  const pool = source.filter(inArea).map(town => {
    const distances = friends.map(friend => distanceKm(friend, town));
    const longest = Math.max(...distances);
    const excess = distances.map(d => Math.max(0, d - COMFORT.straightKm));
    return { town, longest, relative: (longest - Math.min(...distances)) / Math.max(1, longest), excessGap: Math.max(...excess) - Math.min(...excess) };
  });
  const candidates = [];
  const add = item => {
    if (candidates.length < 64 && candidates.every(other => distanceKm(item.town, other) >= 1)) candidates.push(item.town);
  };
  // Shortlist with several strategies; only road matrices determine final fairness.
  // Long scenic trips compare journeys proportionally; everything else ignores small differences and favours short drives.
  const evenFirst = scenicFarther ? (a, b) => a.relative - b.relative || a.longest - b.longest : (a, b) => a.excessGap - b.excessGap || a.longest - b.longest;
  [...pool].sort(evenFirst).slice(0, 120).forEach(item => { if(candidates.length < 24) add(item); });
  [...pool].sort((a,b) => a.longest - b.longest).forEach(item => { if(candidates.length < 40) add(item); });
  let remaining = pool.filter(item => candidates.every(other => distanceKm(item.town, other) >= 1));
  while(candidates.length < 64 && remaining.length) {
    const next = remaining.reduce((best,item) => {
      const spread = Math.min(...candidates.map(other => distanceKm(item.town, other)));
      return !best || spread > best.spread ? { item, spread } : best;
    }, null).item;
    add(next);
    remaining = remaining.filter(item => distanceKm(item.town, next.town) >= 1);
  }
  return { area, candidates };
}

export function fairTownRows(friends, candidates, matrix, preferences, visited = []) {
  const { rows, naive } = pickWinner(friends, candidates, matrix.durations);
  if (matrix.distances) pickWinner(friends, candidates, matrix.distances);
  const metric = journeyMetric(preferences);
  if (metric === 'distance' && !matrix.distances) throw new Error('Road distances are unavailable. Please retry.');
  const reachable = rows.map(row => {
    const index = candidates.findIndex(town => town.id === row.id);
    const distances = matrix.distances?.map(values => values[index]);
    const values = metric === 'distance' ? distances : row.times;
    if (values.some(value => value === null)) return null;
    const maxMetric = Math.max(...values), minMetric = Math.min(...values);
    const comfort = metric === 'distance' ? COMFORT.distance : COMFORT.time;
    const excess = values.map(value => Math.max(0, value - comfort));
    const excessGap = Math.max(...excess) - Math.min(...excess);
    return { ...row, distances, timeGap: row.worst - Math.min(...row.times), gap: maxMetric - minMetric,
      relativeDifference: maxMetric ? (maxMetric - minMetric) / maxMetric : 0, maxMetric, comfort, excessGap,
      evenness: 1 - excessGap / Math.max(maxMetric, comfort) };
  }).filter(row => row && (!preferences.avoidVisited || !wasVisited(row, visited)));
  if (!reachable.length) throw new Error('No candidate is reachable by everyone, or all are past outings. Check your pins or include past outings.');
  return { rows: reachable, naive, metric, bestWorst: Math.min(...reachable.map(row => row.worst)), comparedCount: candidates.length };
}

export function townEvidence(town, venues, source) {
  const places = venues.map(place => ({ ...place, title: place.name, dist: distanceKm(town, place) * 1000 }))
    .filter(place => place.dist <= NEARBY_KM * 1000).sort((a, b) => a.dist - b.dist);
  const counts = Object.fromEntries([...CITY_CATEGORIES, 'nature', 'historic'].map(id => [id, places.filter(p => p.categories.includes(id)).length]));
  return { ...town, places, counts, categories: Object.keys(counts).filter(id => counts[id]), evidenceSource: source };
}

const cache = new Map();
export async function enrichTowns(rows, options = {}) {
  const results = rows.map(row => {
    const catalogue = catalogueAt(row);
    const cached = cache.get(row.id);
    if (catalogue) return townEvidence(row, nearbySavedVenues(row, NEARBY_KM), { kind: 'saved', name: catalogue.metadata.name, fetchedAt: catalogue.metadata.fetchedAt });
    if (cached && Date.now() - cached.at < 3600000) return townEvidence(row, cached.venues, { kind: 'live' });
    return townEvidence(row, [], { kind: 'vibes', reason: 'Place data has not been downloaded for this area.' });
  });
  const missing = results.filter(row => row.evidenceSource.kind === 'vibes');
  // One bounded request per plan; other towns retain clearly labelled hints.
  const requested = missing.slice(0, 8);
  if (!requested.length) return results;
  const selectors = ['amenity~"^(cafe|restaurant|fast_food|food_court|cinema|theatre)$"', 'shop=mall', 'tourism=museum', 'tourism=viewpoint', 'leisure~"^(park|nature_reserve|garden)$"', 'natural~"^(beach|waterfall|peak|hill)$"', 'waterway=waterfall'];
  const query = `[out:json][timeout:12];(${requested.map(row => selectors.map(tag => `nwr[${tag}][name](around:5000,${row.lat},${row.lon});`).join('')).join('')});out center tags 1500;`;
  try {
    const data = await fetchJson(process.env.EXPO_PUBLIC_OVERPASS_URL || 'https://overpass-api.de/api/interpreter', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}`,
    }, { timeout: 14000, ...options });
    if (data.remark || !Array.isArray(data.elements)) throw new Error('Incomplete venue response');
    const live = normalizeVenues(data.elements);
    return results.map(row => {
      if (!requested.some(town => town.id === row.id)) return row;
      const evidence = townEvidence(row, live, { kind: 'live', sampled: true });
      cache.set(row.id, { at: Date.now(), venues: evidence.places });
      return evidence;
    });
  } catch (error) {
    if (options.signal?.aborted || error.name === 'AbortError') throw error;
    return results.map(row => row.evidenceSource.kind === 'vibes' ? { ...row, evidenceSource: { kind: 'vibes', reason: 'Overpass is unavailable or this area was outside the lookup batch.' } } : row);
  }
}

export function experienceMatch(row, preference) {
  if (row.evidenceSource.kind === 'vibes') {
    const city = row.vibes?.includes('city'), scenic = row.vibes?.includes('scenic');
    const matches = preference === 'mixed' ? city && scenic : preference === 'city' ? city : scenic;
    return { matches: !!matches, score: matches ? 0.2 : 0 };
  }
  const cityCount = CITY_CATEGORIES.reduce((sum, key) => sum + (row.counts[key] || 0), 0);
  const scenicCount = row.counts.nature || 0;
  const cityScore = CITY_CATEGORIES.reduce((sum, key) => sum + Math.min(row.counts[key] || 0, 8) / 8, 0) / CITY_CATEGORIES.length;
  const natureKinds = new Set(row.places.filter(p => p.categories.includes('nature')).map(p => p.kind || 'nature'));
  const scenicScore = row.destinationKind ? 0.8 + 0.2 * Math.min(natureKinds.size / 4, 1) : 0.7 * Math.min(scenicCount / 12, 1) + 0.3 * Math.min(natureKinds.size / 4, 1);
  if (preference === 'city') return { matches: cityCount > 0, score: cityScore };
  if (preference === 'scenic') return { matches: scenicCount > 0, score: scenicScore };
  return { matches: cityCount > 0 && scenicCount > 0, score: (cityScore + scenicScore) / 2 };
}

export function rankExperiences(fair, enriched, preferences) {
  const experience = preferences.experience || 'mixed';
  const matching = enriched.map(row => ({ row, match: experienceMatch(row, experience) }))
    .filter(({row,match}) => match.matches && (preferences.activities || []).every(id => (row.counts[id] || 0) > 0));
  const bestMetric = Math.min(...matching.map(({row}) => row.maxMetric));
  const scenicFarther = experience === 'scenic' && preferences.reach >= 80;
  const rows = matching.map(({row,match}) => {
    let fairness, evenness;
    if (scenicFarther) {
      // Deliberate long trips: compare journeys proportionally (shortest ÷ longest road distance).
      evenness = 1 - row.relativeDifference;
      fairness = 0.1 * (row.maxMetric ? bestMetric / row.maxMetric : 1) + 0.9 * evenness;
    } else {
      // Shorter is better, softened so 8 vs 12 minutes barely matters but 12 vs 60 does.
      const soften = row.comfort / 2;
      const efficiency = (bestMetric + soften) / (row.maxMetric + soften);
      evenness = row.evenness;
      fairness = preferences.strategy === 'shortest' ? 0.75 * efficiency + 0.25 * evenness : 0.4 * efficiency + 0.6 * evenness;
    }
    return { ...row, similarity: Math.round(evenness * 100), fairnessScore: fairness * 70, experienceScore: match.score * 30, score: fairness * 70 + match.score * 30 };
  }).sort((a,b) => b.score - a.score || a.excessGap - b.excessGap || a.worst - b.worst || a.id.localeCompare(b.id));
  if (!rows.length) throw new Error(`No reachable destination has mapped evidence for your ${experience} experience and selected activities. Try Go farther or remove an activity.`);
  const alternatives = [];
  for(const row of rows) if(alternatives.every(other => distanceKm(row,other) >= 2)) alternatives.push(row);
  return { ...fair, rows, alternatives: alternatives.slice(0,8), winner: alternatives[0], places: alternatives[0].places,
    preferences: { ...preferences, metric: journeyMetric(preferences) }, ranking: 'experience', nearbyKm: NEARBY_KM };
}
