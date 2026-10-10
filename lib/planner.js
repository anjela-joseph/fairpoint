import { pickWinner } from './scoring.js';
import { matchesPreferences, wasVisited, distanceKm } from './discovery.js';

export function planOuting(friends, candidates, matrix, preferences, visited = []) {
  const { rows, naive } = pickWinner(friends, candidates, matrix.durations);
  if (!rows.length) throw new Error('No discovered spot is reachable by everyone. Try different pins or a wider exploration area.');
  if (preferences.metric === 'distance' && !matrix.distances) throw new Error('Road distances are unavailable. Try balancing travel time instead.');
  if (matrix.distances) pickWinner(friends, candidates, matrix.distances);
  const ranked = rows.map(row => {
    const index = candidates.findIndex(c => c.id === row.id);
    const distances = matrix.distances?.map(values => values[index]);
    const values = preferences.metric === 'distance' ? distances : row.times;
    if (values.some(v => v === null)) return null;
    return { ...row, distances, gap: Math.max(...values) - Math.min(...values), timeGap: row.worst - Math.min(...row.times), maxMetric: Math.max(...values), totalMetric: values.reduce((a, b) => a + b, 0) };
  }).filter(row => row && matchesPreferences(row, preferences) &&
    (!preferences.avoidVisited || !wasVisited(row, visited)));
  ranked.sort((a, b) => (preferences.strategy === 'equal' ? a.gap - b.gap : a.maxMetric - b.maxMetric) || a.maxMetric - b.maxMetric || a.totalMetric - b.totalMetric || a.id.localeCompare(b.id));
  if (!ranked.length) throw new Error('No discovered spot matches all your choices. Remove an activity, change the setting, or include past outings.');
  const alternatives = [];
  for (const row of ranked) if (alternatives.every(other => distanceKm(row, other) >= 2)) alternatives.push(row);
  return { winner: alternatives[0], naive, places: alternatives[0].places, rows: ranked, alternatives: alternatives.slice(0, 8), preferences: { ...preferences }, comparedCount: candidates.length };
}

export function selectAlternative(result, id) {
  const winner = result.alternatives.find(row => row.id === id);
  return winner ? { ...result, winner, places: winner.places } : result;
}
