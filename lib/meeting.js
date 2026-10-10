import { pickWinner } from './scoring.js';

export async function findMeeting(friends, candidates, durations, placesProvider, signal) {
  const { rows, naive } = pickWinner(friends, candidates, durations);
  if (!rows.length) throw new Error('No town is reachable by everyone. Move your pins closer to roads in Kerala and try again.');
  let winner = rows[0];
  let places = [];
  let placesUnavailable = false;
  for (const row of rows.slice(0, 5)) {
    if (signal?.aborted) { const error = new Error('Cancelled'); error.name = 'AbortError'; throw error; }
    try {
      const nearby = await placesProvider(row.lat, row.lon, { signal });
      if (row === rows[0]) places = nearby.slice(0, 5);
      if (nearby.length >= 3) { winner = row; places = nearby.slice(0, 5); break; }
    } catch (error) {
      if (error.name === 'AbortError' || signal?.aborted) throw error;
      // Routing remains useful when Wikipedia is offline. Avoid retrying the
      // same unavailable service for every candidate.
      placesUnavailable = true;
      break;
    }
  }
  return { winner, naive, places, rows, placesUnavailable, amenityTradeoff: winner !== rows[0] };
}
