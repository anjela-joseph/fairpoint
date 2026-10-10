import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';

// Deliberately bounded batches. These are town-area rectangles, not districts.
const areas = {
  kochi: [9.9, 76.2, 10.1, 76.4],
  thrissur: [10.44, 76.13, 10.61, 76.30],
  kottayam: [9.51, 76.44, 9.68, 76.61],
  alappuzha: [9.42, 76.26, 9.58, 76.42],
  munnar: [10.02, 76.98, 10.16, 77.13],
  kozhikode: [11.18, 75.70, 11.34, 75.87],
  thiruvananthapuram: [8.40, 76.87, 8.60, 77.04],
};
const requested = process.argv.slice(2);
const selected = requested.length ? requested : ['kochi', 'thrissur', 'kottayam', 'alappuzha', 'munnar'];
const endpoint = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const directory = new URL('../data/kerala-source/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const name of selected) if (!areas[name]) throw new Error(`Unknown region: ${name}`);
let failures = 0;
for (const [index, name] of selected.entries()) {
  const file = new URL(`${name}.json`, directory);
  if (!process.env.REFRESH) {
    try { await readFile(file); console.log(`${name}: already saved`); continue; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (index) await new Promise(resolve => setTimeout(resolve, 5000));
  const [south, west, north, east] = areas[name];
  const bbox = areas[name].join(',');
  const selectors = ['amenity~"^(cafe|restaurant|fast_food|food_court|cinema|theatre)$"', 'shop=mall', 'tourism', 'historic', 'leisure~"^(park|nature_reserve|garden)$"', 'natural~"^(beach|waterfall|peak|hill)$"', 'waterway=waterfall'];
  const query = `[out:json][timeout:25];(${selectors.map(tag => `nwr[${tag}][name](${bbox});`).join('')});out center tags;`;
  try {
    const response = await fetch(endpoint, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'FairpointKeralaSnapshot/1.0 (personal outing planner; regional venue export)' },
      body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(35000) });
    if (response.status === 429) { failures++; console.log(`${name}: rate limited; stopping this batch and preserving saved data. Retry remaining regions later.`); break; }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.remark || !Array.isArray(data.elements) || !data.elements.length) throw new Error('Empty or incomplete response');
    const temporary = new URL(`${name}.json.tmp`, directory);
    await writeFile(temporary, JSON.stringify({ name, bounds: { south, west, north, east }, endpoint, query, fetchedAt: new Date().toISOString(), ...data }, null, 2) + '\n');
    await rename(temporary, file);
    console.log(`${name}: saved ${data.elements.length} OSM elements`);
  } catch (error) { failures++; console.log(`${name}: ${error.message}; existing data kept`); }
}
if (failures) process.exitCode = 1;
