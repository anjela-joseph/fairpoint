import { mkdir, writeFile, rename } from 'node:fs/promises';

// One regional export; app searches use the saved catalogue, never this script.
const bounds = { south: 9.9, west: 76.2, north: 10.1, east: 76.4 };
const endpoint = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const query = '[out:json][timeout:25];(nwr[amenity~"cafe|restaurant|cinema|theatre"](9.9,76.2,10.1,76.4);nwr[leisure=park](9.9,76.2,10.1,76.4);nwr[shop=mall](9.9,76.2,10.1,76.4);nwr[natural=beach](9.9,76.2,10.1,76.4););out center tags;';
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'FairpointKochiSnapshot/1.0 (personal outing planner; one-time Kochi venue export)' },
  body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(35000),
});
if (!response.ok) throw new Error('Overpass HTTP ' + response.status + '; saved catalogue kept');
const data = await response.json();
if (data.remark || !Array.isArray(data.elements) || !data.elements.length) throw new Error('Incomplete or empty response; saved catalogue kept');
const directory = new URL('../data/kochi-source/', import.meta.url);
await mkdir(directory, { recursive: true });
const snapshot = { endpoint, query, fetchedAt: new Date().toISOString(), bounds, ...data };
const temporary = new URL('kochi-regional.json.tmp', directory);
await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n');
await rename(temporary, new URL('kochi-regional.json', directory));
console.log('Saved ' + data.elements.length + ' OSM elements. Run npm run catalogue:build to update the app catalogue.');
