export function validatePoints(points, label = 'Locations') {
  if (!Array.isArray(points) || !points.length || points.some(p =>
    !p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) ||
    Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180)) {
    throw new Error(`${label} must contain valid latitude and longitude coordinates.`);
  }
}

export function pickWinner(friends, candidates, durations) {
  validatePoints(friends, 'Friends');
  validatePoints(candidates, 'Towns');
  if (friends.length < 2 || friends.length > 4) throw new Error('Add 2–4 friends to find a meeting point.');
  if (!Array.isArray(durations) || durations.length !== friends.length ||
      durations.some(row => !Array.isArray(row) || row.length !== candidates.length ||
        row.some(t => t !== null && (!Number.isFinite(t) || t < 0)))) {
    throw new Error('The routing service returned an invalid travel-time matrix. Please try again.');
  }
  const rows = candidates.map((candidate, j) => {
    const times = friends.map((_, i) => durations[i][j]);
    if (times.some(t => t === null)) return null;
    return { ...candidate, times, worst: Math.max(...times), total: times.reduce((a, b) => a + b, 0) };
  }).filter(Boolean).sort((a, b) => a.worst - b.worst || a.total - b.total || a.name.localeCompare(b.name));
  const midLat = friends.reduce((sum, friend) => sum + friend.lat, 0) / friends.length;
  const midLon = friends.reduce((sum, friend) => sum + friend.lon, 0) / friends.length;
  const naive = rows.reduce((best, row) => {
    const distance = (row.lat - midLat) ** 2 + (row.lon - midLon) ** 2;
    return !best || distance < best.distance ? { ...row, distance } : best;
  }, null);
  return { rows, naive };
}
