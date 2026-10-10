import { CANDIDATES } from './candidates.js';
import { searchSavedLocations, normalizeSearch } from '../lib/location-index.js';

// Offline shortcuts are approximate neighbourhood centers. Search online or
// drop a map pin for a particular address/entrance.
export const LOCATIONS = [
  { name: 'Edappally', address: 'Edappally, Kochi, Kerala', lat: 10.0261, lon: 76.3125 },
  { name: 'Kaloor', address: 'Kaloor, Kochi, Kerala', lat: 9.9971, lon: 76.3028 },
  { name: 'Fort Kochi', address: 'Fort Kochi, Kochi, Kerala', lat: 9.9656, lon: 76.2421 },
  { name: 'Kakkanad', address: 'Kakkanad, Kochi, Kerala', lat: 10.0159, lon: 76.3419 },
  { name: 'Vyttila', address: 'Vyttila, Kochi, Kerala', lat: 9.9679, lon: 76.3203 },
  { name: 'Panampilly Nagar', address: 'Panampilly Nagar, Kochi, Kerala', lat: 9.9554, lon: 76.2980 },
  { name: 'Mattancherry', address: 'Mattancherry, Kochi, Kerala', lat: 9.9570, lon: 76.2594 },
  { name: 'Marine Drive', address: 'Marine Drive, Ernakulam, Kochi, Kerala', lat: 9.9815, lon: 76.2740 },
  { name: 'Palarivattom', address: 'Palarivattom, Kochi, Kerala', lat: 10.0058, lon: 76.3057 },
  ...CANDIDATES.map(town => ({ ...town, address: `${town.name}, Kerala` })),
];

export function localLocations(query) {
  const words = query.toLowerCase().trim().split(/[\s,]+/).filter(Boolean);
  const shortcuts = LOCATIONS.filter(place => words.every(word => `${place.name} ${place.address}`.toLowerCase().includes(word)))
    .map(place => ({ ...place, kind: 'neighbourhood', source: 'Local shortcut' }));
  if (!words.length) return [];
  const results = [...shortcuts];
  for (const place of searchSavedLocations(query, 30)) {
    if (results.some(other => normalizeSearch(other.name) === normalizeSearch(place.name) && Math.abs(other.lat - place.lat) < 0.004 && Math.abs(other.lon - place.lon) < 0.004)) continue;
    results.push(place);
    if (results.length >= 20) break;
  }
  return results.slice(0, 20);
}
