# Kochi venue snapshot

Real OpenStreetMap data retrieved on 2026-10-10 through the Overpass APIs.
Copyright © OpenStreetMap contributors. This database is made available under
[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
See [OpenStreetMap attribution](https://www.openstreetmap.org/copyright).

Each JSON source preserves the endpoint, exact query, download timestamp,
geographic bounds, OSM database timestamp, and original returned elements.
The main regional export is `kochi-regional.json`: latitude 9.9–10.1,
longitude 76.2–76.4. This is a rectangle around Kochi and nearby areas,
not an administrative boundary. Smaller earlier snapshots supplement it.

`../kochi.js` is the app's deduplicated, normalized catalogue. The initial
snapshot contains 1,325 named places: 294 cafés, 858 restaurants/fast-food
venues, 30 cinemas, 9 theatres, 108 nature spots, and 26 shopping malls.
Source database dates range from 2026-05-31 to 2026-10-10. The downloaded
date is not a claim that every business was verified that day.

Only mapped, named venues in the requested categories are included. Nature
coverage primarily consists of parks and beaches. Failed queries and empty
responses are not evidence that an area has no venues. No opening hours,
business status, exact entrances, accessibility, or scenic quality are verified.

Refresh manually from the project root:

```powershell
npm.cmd run catalogue:pull
npm.cmd run catalogue:build
```

The pull makes one request and preserves the existing regional source if the
response fails, times out, is empty, or includes an Overpass error remark.
Build validates saved sources, prefers the newest OSM base timestamp for
duplicate IDs, and replaces the generated file only after successful processing.
No background refresh, paid service, or automated recurring download is enabled.
The smaller source snapshots remain supplemental; remove or refresh them
deliberately when maintaining the dataset, since deleted businesses may remain
in older snapshots.
