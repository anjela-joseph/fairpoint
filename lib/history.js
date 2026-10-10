export const HISTORY_KEY = 'fairpoint.outings.v1';
export function parseHistory(raw) {
  try {
    const value = JSON.parse(raw || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && ['demo', 'live'].includes(p.kind) &&
      Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180).slice(-100);
  } catch { return []; }
}
