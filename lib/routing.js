import { fetchJson } from './network.js';
import { pickWinner, validatePoints } from './scoring.js';

export const hasRoutingKey = () => Boolean(process.env.EXPO_PUBLIC_ORS_KEY?.trim());

export async function getTimes(friends, candidates, options = {}) {
  return (await getTravelMatrix(friends, candidates, { ...options, durationOnly: true })).durations;
}

export async function getTravelMatrix(friends, candidates, options = {}) {
  const key = options.key ?? process.env.EXPO_PUBLIC_ORS_KEY;
  if (!key?.trim()) throw new Error('Live routing needs an openrouteservice key. Add EXPO_PUBLIC_ORS_KEY to .env and restart Expo.');
  validatePoints(friends, 'Friends');
  validatePoints(candidates, 'Towns');
  if (friends.length < 2 || friends.length > 4) throw new Error('Add 2–4 friends to find a meeting point.');
  try {
    const data = await fetchJson('https://api.openrouteservice.org/v2/matrix/driving-car', {
      method: 'POST',
      headers: { Authorization: key.trim(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: [...friends, ...candidates].map(p => [p.lon, p.lat]),
        sources: friends.map((_, i) => i),
        destinations: candidates.map((_, j) => friends.length + j),
        metrics: options.durationOnly ? ['duration'] : ['duration', 'distance'],
      }),
    }, options);
    pickWinner(friends, candidates, data.durations);
    if (!options.durationOnly) pickWinner(friends, candidates, data.distances);
    return { durations: data.durations, distances: data.distances };
  } catch (error) {
    if (error.status === 401 || error.status === 403) throw new Error('The routing key was not accepted. Check your openrouteservice token, then restart Expo.');
    if (error.status === 429) throw new Error('The routing limit has been reached. Try again later.');
    if (error.status) throw new Error(`Routing is unavailable (${error.status}). Try moving pins closer to roads and retry.`);
    throw error;
  }
}

// Backup route service: OSRM's free public server (same OpenStreetMap roads, no key, browser-friendly).
// It's a demo server meant for light use, so it's only a fallback. Point EXPO_PUBLIC_OSRM_URL at your
// own OSRM server to use a different one.
const OSRM_URL = (process.env.EXPO_PUBLIC_OSRM_URL || 'https://router.project-osrm.org').replace(/\/$/, '');

export async function getOsrmMatrix(friends, candidates, options = {}) {
  validatePoints(friends, 'Friends');
  validatePoints(candidates, 'Towns');
  if (friends.length < 2 || friends.length > 4) throw new Error('Add 2–4 friends to find a meeting point.');
  const points = [...friends, ...candidates].map(p => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const sources = friends.map((_, i) => i).join(';');
  const destinations = candidates.map((_, j) => friends.length + j).join(';');
  const url = `${OSRM_URL}/table/v1/driving/${points}?sources=${sources}&destinations=${destinations}&annotations=duration,distance`;
  let data;
  try {
    data = await fetchJson(url, {}, { timeout: 20000, ...options });
  } catch (error) {
    if (error.status === 429) throw new Error('The backup route service is busy. Try again in a minute.');
    if (error.status) throw new Error(`Backup routing is unavailable (${error.status}).`);
    throw error;
  }
  if (data?.code !== 'Ok' || !Array.isArray(data.durations)) throw new Error('Backup routing is unavailable (invalid response).');
  pickWinner(friends, candidates, data.durations);
  if (data.distances) pickWinner(friends, candidates, data.distances);
  return { durations: data.durations, distances: data.distances, source: 'osrm' };
}

// What the app uses: openrouteservice when there's a key, OSRM if that fails or there's no key.
export async function getDriveMatrix(friends, candidates, options = {}) {
  const key = options.key ?? process.env.EXPO_PUBLIC_ORS_KEY;
  if (!key?.trim()) return getOsrmMatrix(friends, candidates, options);
  try {
    return { ...(await getTravelMatrix(friends, candidates, options)), source: 'openrouteservice' };
  } catch (error) {
    const cancelled = error.name === 'AbortError' || options.signal?.aborted;
    if (cancelled || /Add 2–4 friends|valid latitude/.test(error.message)) throw error;
    try {
      return await getOsrmMatrix(friends, candidates, options);
    } catch (backupError) {
      if (backupError.name === 'AbortError' || options.signal?.aborted) throw backupError;
      throw error; // both failed: report the main service's reason
    }
  }
}
