# GeoNames Kerala gazetteer

Source: [GeoNames country downloads](https://download.geonames.org/export/dump/),
India `IN.zip`, with admin1/admin2 reference tables. Imported 11 October 2026
(Asia/Kolkata). Licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Attribution: [GeoNames](https://www.geonames.org/).

`geonames-kerala.json` retains provenance, checksum and 6,364 populated-place
records for Kerala (India admin1 code 13), excluding abandoned, destroyed and
historical-only settlement types. Canonical names, alternate names, coordinates,
districts, population and source links are retained. Some aliases refer to older
names; the UI shows the matched alias when relevant.

Run `npm.cmd run locations:import`, then `npm.cmd run dataset:build`.
The latter combines these records with focused OSM locations and landmarks.
GeoNames supports worldwide place-name search, but settlement centres are not
precise house addresses. Coverage and spelling can vary; check the pin.
