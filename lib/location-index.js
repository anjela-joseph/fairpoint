import { LOCATION_ROWS } from '../data/location-index.js';

// Build normalized text once. Only the best bounded results reach the UI.
export const normalizeSearch = text => text.normalize('NFKC').toLocaleLowerCase().replace(/[,\s]+/g, ' ').trim();
const entries = LOCATION_ROWS.map(row => ({ row, name: normalizeSearch(row[1]),
  aliases: row[5].map(normalizeSearch), text: normalizeSearch([row[1], row[4], ...row[5]].join(' ')) }));
export function searchSavedLocations(query, limit = 20) {
  const normalized = normalizeSearch(query);
  if (normalized.length < 2) return [];
  const words = normalized.split(' ');
  const matches = [];
  for (const entry of entries) {
    if (!words.every(word => entry.text.includes(word))) continue;
    const names = [entry.name, ...entry.aliases];
    const score = (names.includes(normalized) ? 100 : names.some(name => name.startsWith(normalized)) ? 60 : 0) +
      words.filter(word => names.some(name => name.split(' ').includes(word))).length * 10 +
      (['city', 'town', 'village', 'suburb', 'neighbourhood', 'settlement'].includes(entry.row[6]) ? 3 : 0) +
      (entry.row[6] === 'airport' && words.some(word => word === 'airport' || word === 'airports') ? 80 : 0) +
      (entry.row[6] === 'airport' && entry.aliases.includes(normalized) ? 20 : 0) +
      (entry.row[6] === 'metro station' && words.some(word => ['metro', 'station'].includes(word)) ? 80 : 0) +
      (entry.row[6] === 'railway station' && words.some(word => ['railway', 'station'].includes(word)) ? 50 : 0);
    matches.push({ row: entry.row, score });
  }
  matches.sort((a, b) => b.score - a.score || a.row[1].localeCompare(b.row[1]) || a.row[0].localeCompare(b.row[0]));
  const selected = [];
  for (const { row } of matches) {
    if (row[6] === 'road' && selected.some(p => p.kind === 'road' && normalizeSearch(p.name) === normalizeSearch(row[1]) && p.address === row[4])) continue;
    if (['metro station', 'railway station', 'airport'].includes(row[6]) && selected.some(p => p.kind === row[6] && normalizeSearch(p.name) === normalizeSearch(row[1]) && Math.abs(p.lat-row[2]) < 0.005 && Math.abs(p.lon-row[3]) < 0.005)) continue;
    // Consolidate duplicate representations of the same named settlement only.
    if (['city', 'town', 'village', 'suburb', 'neighbourhood', 'settlement'].includes(row[6]) && selected.some(p =>
      normalizeSearch(p.name) === normalizeSearch(row[1]) && Math.abs(p.lat - row[2]) < 0.004 && Math.abs(p.lon - row[3]) < 0.004)) continue;
    const matchedAlias = normalizeSearch(row[1]) !== normalized ? row[5].find(alias => normalizeSearch(alias) === normalized) : undefined;
    selected.push({ id: row[0], name: row[1], lat: row[2], lon: row[3], address: row[4], kind: row[6], source: row[7], ...(matchedAlias ? { matchedAlias } : {}) });
    if (selected.length >= limit) break;
  }
  return selected;
}
