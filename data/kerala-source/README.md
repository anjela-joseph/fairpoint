# Kerala data batches

Downloaded on 2026-10-10 from the public Overpass API. © OpenStreetMap
contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
[Attribution information](https://www.openstreetmap.org/copyright).

| Saved town area | Usable named places | Attraction features |
| --- | ---: | ---: |
| Kochi | 1,695 | 223 |
| Thrissur | 531 | 98 |
| Munnar | 85 | 36 |

Attractions are included in the place totals, not additional records. Lodging
and tourist information alone are not treated as attractions. Counts are
mapped records, not independently verified businesses or complete inventories.
The earlier `../kochi-source/` catalogue remains supplemental; duplicate OSM
IDs prefer the newer regional catalogue in app searches.

These initial Kottayam and Alappuzha Overpass batches failed after rate limits
and timeouts. Both areas are now covered by the statewide Geofabrik import in
`../statewide/`; these regional files remain supplemental snapshots.

Each JSON file includes the exact bounding rectangle, query, endpoint, download
date, OSM database timestamp, and original returned elements. These are bounded
town-area extracts, not complete district or state datasets. Name selection
prefers `name:en` and falls back to `name` without fabricating translations.

```powershell
# Resume only missing default batches, spacing requests by five seconds.
npm.cmd run kerala:pull
# Or explicitly request a small named batch:
npm.cmd run kerala:pull -- kottayam alappuzha
# Build the app's normalized catalogue from successful source files:
npm.cmd run kerala:build
```

Also configured for later manual downloads: `kozhikode` and
`thiruvananthapuram`. The script stops on HTTP 429, preserves existing files on
errors, and skips saved regions unless `REFRESH=1` is set in the environment.
There is no scheduled background download. Refresh/build are separate so failed
network requests cannot remove the working bundled data. Region overlap and
older supplemental snapshots can retain outdated records; refresh is not a
guarantee that a business is open or an attraction accessible.
