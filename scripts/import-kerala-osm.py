"""Extract searchable locations and experience POIs inside Kerala's OSM boundary.

Install scripts/requirements-datasets.txt into artifacts/python-libs first.
Large source files and parser dependencies stay outside the app bundle.
"""
from pathlib import Path
import sys
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'artifacts' / 'python-libs'))
import osmium
import shapely
from shapely import wkb
from shapely.geometry import Point, Polygon, LineString, shape, mapping
import json
from datetime import datetime, timezone

source = root / 'artifacts' / 'datasets' / 'southern-zone.osm.pbf'
source_manifest = json.loads(source.with_name('source.json').read_text(encoding='utf8'))
directory = root / 'data' / 'statewide'
directory.mkdir(parents=True, exist_ok=True)
factory = osmium.geom.WKBFactory()
district_names = {'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'}
boundary_cache = root / 'artifacts' / 'datasets' / 'kerala-boundaries.json'
if boundary_cache.exists():
    cached = json.loads(boundary_cache.read_text(encoding='utf8'))
    if cached['sourceHash'] != source_manifest['sha256']:
        raise RuntimeError('Boundary cache is from another extract; remove the cache deliberately before rebuilding')
    state = shape(cached['state'])
    districts = [{**d, 'geometry': shape(d['geometry'])} for d in cached['districts'] if d['name'] in district_names]
else:
    print('Resolving state and district boundaries from the OSM extract...', flush=True)
    state, possible = None, []
    processor = osmium.FileProcessor(str(source)).with_locations().with_areas(osmium.filter.TagFilter(('boundary', 'administrative')))
    processor.with_filter(osmium.filter.EntityFilter(osmium.osm.AREA)).with_filter(osmium.filter.TagFilter(('boundary', 'administrative')))
    for area in processor:
        tags = dict(area.tags)
        is_state = tags.get('ISO3166-2') == 'IN-KL' or (tags.get('admin_level') == '4' and tags.get('name:en', tags.get('name')) == 'Kerala')
        if not is_state and tags.get('admin_level') != '5':
            continue
        try:
            geometry = shapely.make_valid(wkb.loads(factory.create_multipolygon(area), hex=True))
        except Exception:
            continue
        if is_state:
            state = geometry
        else:
            possible.append({'id': area.orig_id(), 'name': tags.get('name:en') or tags.get('name', ''), 'geometry': geometry})
    if state is None or state.is_empty:
        raise RuntimeError('Kerala boundary not found; refusing to label a rectangle statewide coverage')
    districts = [d for d in possible if d['name'] in district_names and state.covers(d['geometry'].representative_point())]
    boundary_cache.write_text(json.dumps({'sourceHash': source_manifest['sha256'], 'state': mapping(state), 'districts': [{**d, 'geometry': mapping(d['geometry'])} for d in districts]}, ensure_ascii=False), encoding='utf8')
    print(f'Resolved Kerala and {len(districts)} district boundaries', flush=True)
if {d['name'] for d in districts} != district_names:
    raise RuntimeError('Not all 14 Kerala district boundaries were resolved; inspect the source before continuing')
shapely.prepare(state)
for district in districts:
    shapely.prepare(district['geometry'])

def wanted(tags):
    return bool((tags.get('name') or tags.get('name:en') or (tags.get('addr:housenumber') and tags.get('addr:street'))) and
        any(key in tags for key in ['place', 'amenity', 'shop', 'tourism', 'historic', 'natural', 'leisure', 'waterway', 'highway', 'railway', 'aeroway', 'public_transport', 'landuse', 'water', 'boundary', 'addr:street', 'building']))

def is_venue(tags):
    return (tags.get('amenity') in ['cafe', 'restaurant', 'fast_food', 'food_court', 'cinema', 'theatre'] or tags.get('shop') == 'mall' or
        tags.get('tourism') in ['museum', 'attraction', 'viewpoint', 'gallery', 'zoo', 'aquarium', 'theme_park', 'artwork', 'picnic_site'] or
        bool(tags.get('historic')) or tags.get('natural') in ['beach', 'peak', 'hill', 'waterfall', 'wood'] or
        tags.get('leisure') in ['park', 'nature_reserve', 'garden'] or tags.get('waterway') in ['waterfall', 'dam'] or
        tags.get('landuse') in ['forest', 'reservoir'] or tags.get('water') == 'reservoir' or tags.get('boundary') == 'national_park')

def kept_tags(tags):
    keep = {'name', 'name:en', 'name:ml', 'alt_name', 'old_name', 'short_name', 'official_name', 'ref', 'iata', 'icao', 'place', 'amenity', 'shop', 'tourism', 'historic', 'natural', 'leisure', 'waterway', 'highway', 'railway', 'station', 'subway', 'aeroway', 'public_transport', 'landuse', 'water', 'boundary', 'access', 'building', 'population', 'wikipedia', 'wikidata'}
    return {key: value for key, value in tags.items() if key in keep or key.startswith('addr:')}

records, invalid = {}, 0
def save(kind, identity, tags, point):
    if not state.covers(point):
        return
    district = next((d['name'] for d in districts if d['geometry'].covers(point)), 'Kerala')
    if not tags.get('name') and not tags.get('name:en'):
        tags['name'] = tags['addr:housenumber'] + ', ' + tags['addr:street']
    records[f'{kind}:{identity}'] = {'type': kind, 'id': identity, 'lat': round(point.y, 7), 'lon': round(point.x, 7),
        'tags': kept_tags(tags), 'district': district, 'venue': is_venue(tags)}

print('Extracting named places, neighbourhoods, roads, addresses and attractions...', flush=True)
processor = osmium.FileProcessor(str(source)).with_locations().with_areas(osmium.filter.KeyFilter('amenity', 'shop', 'tourism', 'historic', 'natural', 'leisure', 'place', 'aeroway', 'railway', 'landuse', 'water', 'waterway', 'boundary'))
processor.with_filter(osmium.filter.KeyFilter('name', 'name:en', 'addr:housenumber'))
seen = 0
for obj in processor:
    tags = dict(obj.tags)
    if not wanted(tags):
        continue
    try:
        if obj.is_node():
            if obj.location.valid():
                save('node', obj.id, tags, Point(obj.location.lon, obj.location.lat))
        elif obj.is_way():
            coordinates = [(n.lon, n.lat) for n in obj.nodes if n.location.valid()]
            if len(coordinates) >= 2:
                save('way', obj.id, tags, LineString(coordinates).interpolate(0.5, normalized=True))
        elif obj.is_area():
            geometry = wkb.loads(factory.create_multipolygon(obj), hex=True)
            save('way' if obj.from_way() else 'relation', obj.orig_id(), tags, geometry.representative_point())
    except (RuntimeError, ValueError, shapely.errors.GEOSException):
        invalid += 1
    seen += 1
    if seen % 100000 == 0:
        print(f'Checked {seen} named features; retained {len(records)} Kerala locations', flush=True)

if not records:
    raise RuntimeError('No locations extracted; existing catalogue kept')
reader = osmium.io.Reader(str(source))
header = reader.header()
timestamp = header.get('osmosis_replication_timestamp')
reader.close()
counts = {d['name']: sum(1 for p in records.values() if p['district'] == d['name']) for d in districts}
metadata = {**source_manifest, 'id': 'kerala-statewide', 'name': 'Kerala', 'generatedAt': datetime.now(timezone.utc).isoformat(),
    'osmBase': timestamp, 'license': 'ODbL 1.0', 'attribution': 'OpenStreetMap contributors / Geofabrik',
    'attributionUrl': 'https://www.openstreetmap.org/copyright', 'districtCounts': counts,
    'geometryFailures': invalid, 'locations': len(records), 'venues': sum(p['venue'] for p in records.values()),
    'coverage': 'Named OSM features with representative points inside the Kerala administrative boundary; mapped data is incomplete.'}
temporary = directory / 'kerala-osm.json.tmp'
temporary.write_text(json.dumps({'metadata': metadata, 'elements': list(records.values())}, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
temporary.replace(directory / 'kerala-osm.json')
boundary_file = directory / 'kerala-boundary.json'
boundary_file.write_text(json.dumps(mapping(state.simplify(0.0001, preserve_topology=True)), separators=(',', ':')), encoding='utf8')
print(json.dumps(metadata, ensure_ascii=False), flush=True)
