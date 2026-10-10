import { readdir, readFile, writeFile, rename } from 'node:fs/promises';
import { normalizeVenues } from '../lib/osm-venues.js';
const directory = new URL('../data/kerala-source/', import.meta.url);
const files = (await readdir(directory)).filter(file => file.endsWith('.json')).sort();
const regions = [];
for (const file of files) {
  const data = JSON.parse(await readFile(new URL(file, directory), 'utf8'));
  if (data.remark || !Array.isArray(data.elements) || !data.bounds || !data.fetchedAt) throw new Error(`Invalid source ${file}; previous catalogue kept`);
  regions.push({ metadata: { id: data.name, name: data.name, bounds: [data.bounds], fetchedAt: data.fetchedAt, osmBase: data.osm3s?.timestamp_osm_base,
    attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', attributionUrl: 'https://www.openstreetmap.org/copyright',
    sourceFile: file, endpoint: data.endpoint, query: data.query }, venues: normalizeVenues(data.elements) });
}
if (!regions.length) throw new Error('No saved regions; previous catalogue kept');
const temporary = new URL('../data/kerala-regions.js.tmp', import.meta.url);
await writeFile(temporary, '// Generated from saved Overpass data. © OpenStreetMap contributors, ODbL 1.0.\nexport const KERALA_REGIONS = ' + JSON.stringify(regions, null, 2) + ';\n');
await rename(temporary, new URL('../data/kerala-regions.js', import.meta.url));
console.log(JSON.stringify(regions.map(r => ({ region: r.metadata.name, places: r.venues.length, attractions: r.venues.filter(v => v.attraction).length }))));
