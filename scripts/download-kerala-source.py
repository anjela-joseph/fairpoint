"""Download the published Southern India OSM extract, preserving a prior file on failure."""
import hashlib
import json
from pathlib import Path
import urllib.request
from datetime import datetime, timezone

directory = Path(__file__).resolve().parents[1] / 'artifacts' / 'datasets'
directory.mkdir(parents=True, exist_ok=True)
url = 'https://download.geofabrik.de/asia/india/southern-zone-latest.osm.pbf'
target = directory / 'southern-zone.osm.pbf'
manifest = directory / 'source.json'
if target.exists() and manifest.exists():
    print('Source extract already saved; remove it deliberately to download a new release.', flush=True)
    raise SystemExit(0)
request = urllib.request.Request(url, headers={'User-Agent': 'FairpointDatasetImport/1.0 (Kerala map extract)'})
temporary = target.with_suffix('.pbf.part')
digest = hashlib.sha256()
with urllib.request.urlopen(request, timeout=60) as response, temporary.open('wb') as output:
    length = int(response.headers.get('Content-Length', 0))
    downloaded, checkpoint = 0, 0
    modified = response.headers.get('Last-Modified')
    while block := response.read(1024 * 1024):
        output.write(block)
        digest.update(block)
        downloaded += len(block)
        if downloaded - checkpoint >= 32 * 1024 * 1024:
            print(f'Downloaded {downloaded // 1048576} MiB' + (f' / {length // 1048576} MiB' if length else ''), flush=True)
            checkpoint = downloaded
    if length and downloaded != length:
        raise RuntimeError('Incomplete download; previous data kept')
temporary.replace(target)
manifest.write_text(json.dumps({'url': url, 'downloadedAt': datetime.now(timezone.utc).isoformat(), 'lastModified': modified, 'bytes': downloaded, 'sha256': digest.hexdigest()}, indent=2), encoding='utf8')
print(f'Saved {downloaded} bytes; SHA-256 {digest.hexdigest()}', flush=True)
