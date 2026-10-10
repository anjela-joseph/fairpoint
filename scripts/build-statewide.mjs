import { readFile, writeFile, rename } from 'node:fs/promises';
import { normalizeVenues } from '../lib/osm-venues.js';
import { tidyLocationRow, tidyName } from '../lib/place-names.js';
const root = new URL('../', import.meta.url);
const geo = JSON.parse(await readFile(new URL('data/location-source/geonames-kerala.json', root), 'utf8'));
let source = null;
try { source = JSON.parse(await readFile(new URL('data/statewide/kerala-osm.json', root), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const rows = [], settlements = [];
const publicLandmarks = new Set(['hospital', 'clinic', 'school', 'college', 'university', 'bus_station', 'library', 'police', 'post_office', 'community_centre', 'townhall']);
for (const element of source?.elements || []) {
  const tags = element.tags;
  // Keep the full extract on disk; ship a focused place/landmark index on mobile.
  // Specific street/house-number lookup remains available through online search.
  if (!element.venue && !tags.place && !tags.shop && !publicLandmarks.has(tags.amenity) && !['station', 'halt', 'tram_stop', 'subway_entrance'].includes(tags.railway) && !tags.public_transport && !['aerodrome', 'terminal'].includes(tags.aeroway) && !['bus_stop', 'residential', 'unclassified', 'living_street', 'pedestrian', 'tertiary', 'secondary', 'primary'].includes(tags.highway)) continue;
  const name = tags['name:en'] || tags.name;
  const aliases = [...new Set([tags.name, tags['name:ml'], tags.short_name, tags.official_name, tags.iata, tags.icao, ...((tags.alt_name || '') + ';' + (tags.old_name || '')).split(';')].filter(value => value && value !== name))];
  const kind = tags.aeroway === 'aerodrome' ? 'airport' : tags.aeroway === 'terminal' ? 'airport terminal' : tags.station === 'subway' || tags.subway === 'yes' || tags.railway === 'subway_entrance' ? 'metro station' : tags.place || (tags.highway === 'bus_stop' ? 'bus stop' : tags.highway ? 'road' : tags.railway ? 'railway station' : tags.public_transport ? 'transit stop' : tags.amenity || tags.tourism || tags.shop || 'landmark');
  const address = [...new Set([tags['addr:suburb'], tags['addr:city'], tags['addr:street'], element.district, 'Kerala', 'India'].filter(Boolean))].join(', ');
  const id = `osm:${element.type}:${element.id}`;
  rows.push([id, name, element.lat, element.lon, address, [...aliases, kind], kind, 'OpenStreetMap']);
  if (['city', 'town', 'village', 'suburb', 'neighbourhood'].includes(tags.place)) {
    settlements.push({ id, name: tidyName(name), lat: element.lat, lon: element.lon, kind: 'town', vibes: [], district: element.district, population: Number((tags.population || '0').replace(/,/g, '')) || 0, source: 'OpenStreetMap' });
  }
}
for (const place of geo.places) {
  rows.push([place.id, place.name, place.lat, place.lon, place.address, place.alternateNames.filter(name => name !== place.name), 'settlement', 'GeoNames']);
}
// Tidy punctuation and capitalisation for display (see lib/place-names.js).
for (let i = 0; i < rows.length; i++) rows[i] = tidyLocationRow(rows[i]);
const metadata = { generatedAt: new Date().toISOString(), count: rows.length, sources: [geo.metadata, ...(source ? [source.metadata] : [])] };
const locationTemp = new URL('data/location-index.js.tmp', root);
await writeFile(locationTemp, '// Generated searchable Kerala locations. Row: id,name,lat,lon,address,aliases,kind,source.\n// OSM: ODbL 1.0; GeoNames: CC BY 4.0. See data/statewide/README.md.\nexport const LOCATION_METADATA = ' + JSON.stringify(metadata) + ';\nexport const LOCATION_ROWS = JSON.parse(' + JSON.stringify(JSON.stringify(rows)) + ');\n');
await rename(locationTemp, new URL('data/location-index.js', root));
if (source) {
  const boundary = JSON.parse(await readFile(new URL('data/statewide/kerala-boundary.json', root), 'utf8'));
  const venues = normalizeVenues(source.elements.filter(element => element.venue));
  const catalogue = { metadata: { ...source.metadata, fetchedAt: source.metadata.downloadedAt,
    bounds: [{ south: 8, west: 74.5, north: 13, east: 77.6 }], geometry: boundary }, venues, settlements };
  const temp = new URL('data/kerala-statewide.js.tmp', root);
  await writeFile(temp, '// Generated Kerala OSM extract. © OpenStreetMap contributors, ODbL 1.0.\nexport const KERALA_STATEWIDE = JSON.parse(' + JSON.stringify(JSON.stringify(catalogue)) + ');\n');
  await rename(temp, new URL('data/kerala-statewide.js', root));
  console.log(JSON.stringify({ indexedLocations: rows.length, venues: venues.length, settlementCandidates: settlements.length, districts: source.metadata.districtCounts }));
} else console.log(JSON.stringify({ indexedLocations: rows.length, source: 'GeoNames; OSM extraction pending' }));
