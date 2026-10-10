# Fairpoint — fair journeys, worthwhile days out

An Expo SDK 54 / React Native app for 2–4 friends in Kerala. Runs in Expo Go and on the web.

## Run

```powershell
npm.cmd install
npm.cmd run web
# For Expo Go:
npm.cmd start
```

Copy `.env.example` to `.env`, set `EXPO_PUBLIC_ORS_KEY`, and restart Expo.
The key enables OpenRouteService address search and driving matrices. It is ignored
by Git, but Expo public environment variables are embedded in client bundles.
A production secret requires a server proxy.

The app opens with an empty real trip. Search **174,486 saved Kerala locations**
as you type: local areas, hamlets, named roads, shops, schools, landmarks, metro
stations, railway stations and airports. Names and aliases support English and
Malayalam where provided by the sources; airport codes such as COK are searchable.
There are no sample or worldwide modes. Online address search and dropped pins
are restricted to Kerala. Verify the selected pin: roads, settlements and large
features have representative coordinates, not guaranteed entrances.

## Experience-based suggestions

Choose **City**, **Scenic**, or **Mixed**. Optional must-haves need mapped evidence
within 5 km of the destination. City covers food, entertainment, malls and museums;
Mixed needs both city and nature evidence. Scenic directly considers named nature
features. With **Go farther**, it considers forests, waterfalls, dams, reservoirs,
national parks, nature reserves, viewpoints, hills and beaches across Kerala.
Gardens and ordinary parks remain available to Scenic with Stay closer.

There are **no maximum drive, maximum time difference or near-minimum-longest-trip
cutoffs**. Longer trips remain eligible. Stay closer searches around the group,
30 km beyond its farthest starting point; Go farther considers all Kerala, including
places outside friends' local areas. No shared-radius intersection is required.

1. Shortlist up to 64 candidates using approximate relative balance, proximity and
   geographic diversity. City/Mixed use towns and neighbourhoods; Scenic uses actual
   nature features. Mapped private/no-access scenic features are excluded.
2. Get road distances and times; exclude unreachable or previously visited places.
3. Match the selected experience and activities using nearby saved OSM evidence.
   An unavailable lookup can use handwritten town vibes, never fabricated counts.
4. Rank **70% journey fairness + 30% experience**. Journey similarity is the shortest
   journey divided by the longest (both zero means 100%). Similar journeys weights
   similarity 90% and efficiency 10%; Less travel weights them 30% and 70%.
   Efficiency compares each longest journey with the shortest longest journey among
   matching candidates. Scenic + Go farther always uses road distance and the
   Similar journeys weighting. Other choices can balance time or distance.

Scenic destination evidence gets a base score plus nearby nature diversity, so a
single waterfall need not compete by restaurant/park density. Scores indicate
mapped experience fit, not quality or public accessibility. Unknown opening/access
details must be checked. The shortlist is not a proven optimum over every location.

Cards show individual distances/times, longest drive, journey similarity and the
score breakdown. There is no time-gap control or time-gap statistic. Up to eight
alternatives are separated by 2 km. **We went here** saves an outing on this device;
later trips can exclude its surrounding 2 km. Old sample-history entries are ignored.

## Attractions at the selected town

Selecting a live result loads nearby English Wikipedia GeoSearch articles with
one-line descriptions/extracts, and named OpenStreetMap tourism, historic and nature
features within 5 km. Saved OSM features appear while Wikipedia loads. Unsaved
areas use a bounded Overpass attraction lookup.

Names prefer OSM `name:en`, then `name`. Normalized matching names are merged
across sources, source links are retained, and the list sorts by straight-line
distance from the town centre. Up to 20 entries are displayed. Wikipedia may
include nearby notable buildings or neighbourhood articles, not only tourist
attractions. Lodging alone is not treated as an attraction.

Source failures are reported independently; saved attractions remain visible.
Changing towns or editing the trip cancels/suppresses stale responses. OSM
attribution/licence and Wikipedia attribution links appear in the UI.

## Saved Kerala data

The statewide import covers all **14 districts**, using Kerala's mapped boundary.
It contains **14,531 experience venues**; regional supplements bring the runtime
catalogue to **14,534** unique venues. The separate offline location index combines
OSM places and public landmarks with **6,364 GeoNames settlements**, totalling
**174,486 searchable records**. These are mapped records, not complete inventories.

Imported on **11 October 2026 (India time)** from Geofabrik's Southern Zone extract
(OSM base 9 October 2026) and GeoNames India. Provenance, licences and reproducible
steps are in [data/statewide/README.md](data/statewide/README.md) and
[data/location-source/README.md](data/location-source/README.md).

```powershell
python -m pip install --target artifacts/python-libs -r scripts/requirements-datasets.txt
npm.cmd run dataset:download
npm.cmd run locations:import
npm.cmd run dataset:import
npm.cmd run dataset:build
```

The 532 MiB source and full 373,642-feature named extract stay on disk and are
Git-ignored. The app bundles focused search and venue catalogues. Downloads are
cached, builds are separate, and no recurring/background download is enabled.
Regional Overpass tools remain available for small supplemental refreshes.

## Kerala scope

The project currently focuses on Kerala. All 14 districts use the same extraction
rules. OSM coverage varies by locality; this is not a complete address directory.
The larger saved index increases app download size and memory use; performance on
low-memory physical phones has not yet been measured.

## Data flow and limitations

Starting/destination coordinates and address queries go to OpenRouteService.
Uncached town-area searches go to Overpass; selecting a live result sends that
town centre to English Wikipedia. Friends' starting locations are not persisted.
Only explicitly saved outing destinations are stored in AsyncStorage, up to 100.

Saved venue search works without a venue API request. Road routing, online address
search, Wikipedia enrichment, and map tiles still need internet. Road estimates
exclude live traffic. The map shows pins without misleading straight connector
lines. Open Maps for directions. Area-centre routes may differ from routes to a
visitor entrance, especially at forests, reservoirs and airports. OSM coverage, opening
hours, access and venue status are not independently verified. Older supplemental
snapshots can retain records missing from a newer extract.

The web basemap uses [OpenFreeMap](https://openfreemap.org/quick_start/) vector
tiles through MapLibre/Leaflet. `data/map-style.json` is a saved Liberty style
with ferry transport excluded: raster OSM tiles previously showed dashed ferry
routes across the sea, independently of the app's straight pin connectors.
Both sources of misleading journey lines are removed on web. Native Expo Go uses
the device map provider without app connector lines; its basemap styling can differ.

## Validation

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run export:web
npx.cmd expo export --platform android --platform ios --output-dir dist-native
```

60 Node checks cover relative fairness without hard caps, long-distance scenic
trips, all-14-district local search, airport/metro ranking and aliases, Kerala-only
geocoding, coverage, spatial indexing, attractions, cancellation and history.
Historical sample records remain test fixtures; they are not imported by the app.
Live browser checks verified Thiruvananthapuram–Kozhikode Scenic + Go farther,
airport search, mobile layout, no runtime errors and no connector lines on the map.
Native exports verify compilation, not physical-device rendering.

The existing SDK 54 dependency audit reports transitive findings; no forced
incompatible framework upgrade was applied.

## Main files

- `App.js`: trip flow, cancellation and history.
- `data/towns.js`: candidate centres and handwritten fallback vibes.
- `lib/experience.js`: fairness filtering, experience evidence and weighted ranking.
- `lib/attractions.js`, `components/Attractions.js`: merged nearby attractions.
- `lib/osm-venues.js`: OSM classification and English-name preference.
- `lib/catalogues.js`, `data/kerala-regions.js`: saved regional data.
- `scripts/pull-kerala.mjs`, `scripts/build-kerala.mjs`: resumable imports/builds.
- `components/OutingPreferences.js`, `OutingResults.js`: choices and explanations.
- Earlier `planner.js`, `discovery.js`, `meeting.js` and `places.js` retain tested
  helper/legacy paths; the main live flow uses the town experience planner.
- `lib/location-index.js`, `data/location-index.js`: typed local place search.
- `lib/coverage.js`, `data/kerala-statewide.js`: statewide coverage and venues.
- `scripts/import-kerala-osm.py`, `scripts/build-statewide.mjs`: statewide imports.
