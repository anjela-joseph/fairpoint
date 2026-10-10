"""Save Kerala's populated-place gazetteer, with aliases and source attribution."""
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile

root = Path(__file__).resolve().parents[1]
cache = root / 'artifacts' / 'datasets'
cache.mkdir(parents=True, exist_ok=True)
def download(name):
    target = cache / name
    url = 'https://download.geonames.org/export/dump/' + name
    if not target.exists():
        request = urllib.request.Request(url, headers={'User-Agent': 'FairpointDatasetImport/1.0'})
        with urllib.request.urlopen(request, timeout=60) as response:
            data = response.read()
        temporary = target.with_suffix(target.suffix + '.part')
        temporary.write_bytes(data)
        temporary.replace(target)
    return target

admin1 = [line.split('\t') for line in download('admin1CodesASCII.txt').read_text(encoding='utf8').splitlines()]
code = next(row[0].split('.')[1] for row in admin1 if row[0].startswith('IN.') and row[1] == 'Kerala')
admin2 = {row[0]: row[2] or row[1] for row in (line.split('\t') for line in download('admin2Codes.txt').read_text(encoding='utf8').splitlines()) if len(row) >= 3}
source = download('IN.zip')
places = []
with zipfile.ZipFile(source) as archive:
    for line in io.TextIOWrapper(archive.open('IN.txt'), encoding='utf8'):
        row = line.rstrip('\n').split('\t')
        if len(row) < 19 or row[6] != 'P' or row[8] != 'IN' or row[10] != code:
            continue
        # Exclude abandoned, destroyed and historical settlements.
        if row[7] in ['PPLH', 'PPLQ', 'PPLW']:
            continue
        district = admin2.get(f'IN.{code}.{row[11]}', '')
        places.append({'id': 'geonames:' + row[0], 'name': row[2] or row[1],
            'alternateNames': list(dict.fromkeys([row[1], row[2]] + row[3].split(','))),
            'lat': float(row[4]), 'lon': float(row[5]), 'kind': 'settlement', 'featureCode': row[7],
            'address': ', '.join(part for part in [district, 'Kerala', 'India'] if part),
            'district': district, 'population': int(row[14] or 0), 'source': 'GeoNames',
            'url': 'https://www.geonames.org/' + row[0] + '/', 'modifiedAt': row[18]})
if not places:
    raise RuntimeError('No Kerala locations found; existing data kept')
directory = root / 'data' / 'location-source'
directory.mkdir(parents=True, exist_ok=True)
value = {'metadata': {'provider': 'GeoNames', 'url': 'https://download.geonames.org/export/dump/IN.zip',
    'license': 'CC BY 4.0', 'attributionUrl': 'https://www.geonames.org/', 'admin1Code': code,
    'fetchedAt': datetime.now(timezone.utc).isoformat(), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()}, 'places': places}
temporary = directory / 'geonames-kerala.json.tmp'
temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
temporary.replace(directory / 'geonames-kerala.json')
print(json.dumps({'keralaCode': code, 'savedLocations': len(places), 'districts': sorted(set(p['district'] for p in places))}), flush=True)
