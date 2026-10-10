# Kerala statewide OpenStreetMap import

Imported 11 October 2026 (Asia/Kolkata). © OpenStreetMap contributors,
[ODbL 1.0](https://www.openstreetmap.org/copyright).

Source: [Geofabrik Southern Zone](https://download.geofabrik.de/asia/india/southern-zone.html),
`southern-zone-latest.osm.pbf`, 558,061,016 bytes. OSM base timestamp:
2026-10-09T20:21:04Z. Source SHA256:
`842cea87cac1d3f8657466d248676b787915fe0e94a25da7a9aec137bae5d87f`.

The importer uses Kerala's actual administrative polygon, including holes, and
requires all 14 canonical districts. District polygons assign records to districts;
an incorrectly district-tagged panchayat is excluded from district selection.
Named nodes, ways and relations yield 373,642 records. 57 geometry failures were
recorded. Representative coordinates for polygons are not guaranteed entrances.

The build selects 14,531 experience venues and 7,139 settlement centres.
OSM public landmarks/places and 6,364 GeoNames settlements form 174,486 offline
search records. Named local roads, shops, transit stops, airports and public landmarks are included;
most private building addresses stay out of the mobile index.
Counts measure records, not unique real-world businesses or complete coverage.
Regional supplements yield 14,534 unique runtime venue IDs.

`kerala-osm.json` is the full named extract, saved locally and Git-ignored.
`kerala-boundary.json` is the simplified runtime boundary. Original source,
checksums and exact cached boundaries live in ignored `artifacts/datasets/`.
Generated runtime files are `../kerala-statewide.js` and `../location-index.js`.

To reproduce from the project root:

```powershell
python -m pip install --target artifacts/python-libs -r scripts/requirements-datasets.txt
npm.cmd run dataset:download
npm.cmd run locations:import
npm.cmd run dataset:import
npm.cmd run dataset:build
```

Downloads reuse cached inputs. Preserve/remove the corresponding cached source
and manifest explicitly when preparing a new snapshot; a repeated command is not
an automatic refresh. No scheduled download is installed. Source dates are preserved
in generated metadata. Prefer `name:en`, then `name`; do not invent translations.
Check access, opening status and the selected map pin before travelling.

The expanded extraction includes aeroway, subway/metro metadata, forests, dams,
reservoirs and national parks. The raw venue records include 225 forests, 233 dams,
111 reservoirs, 32 waterfalls and 5 national parks. Search contains 9 aerodrome
records (including airfields), 10 airport-terminal records, 88 metro records
(including entrances/duplicate representations), and 290 railway records.
These counts are source records, not counts of distinct public airports/stations.

Tag references: [airports](https://wiki.openstreetmap.org/wiki/Tag:aeroway%3Daerodrome),
[metro](https://wiki.openstreetmap.org/wiki/Tag:station%3Dsubway),
[dams](https://wiki.openstreetmap.org/wiki/Tag:waterway%3Ddam),
[forests](https://wiki.openstreetmap.org/wiki/Tag:landuse%3Dforest).
