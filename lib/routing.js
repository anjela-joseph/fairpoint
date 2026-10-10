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
