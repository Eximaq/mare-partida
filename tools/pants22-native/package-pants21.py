"""Register the generated pants21 clips and archive without rewriting original assets."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import sys
import zipfile

root = Path(__file__).resolve().parents[2]
folder = Path(sys.argv[1])
base = root / 'tools/rework-modular-outfits-hd'
transport_path = root / 'tools/native-index-transport.json'
source = base / 'index.json.gz'
materialized = base / 'index.json'
archive_path = base / 'archives/pants21-male-independent-v1.zip'
archives_path = base / 'archives/archive-index.json'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()

rows = json.loads((folder / 'records.json').read_bytes())
assert len(rows) == 12 and all(r['equipment'] == {'pants': 21} for r in rows)
index = json.loads(gzip.decompress(source.read_bytes()))
archives = json.loads(archives_path.read_bytes())
archive = io.BytesIO()
names = {}
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_STORED) as output:
    for ref in sorted({s for r in rows for s in r['sourceRefs']}):
        png = folder / 'assets' / (ref + '.png')
        if not png.is_file():
            assert ref in archives['sources']
            continue
        data = png.read_bytes()
        assert sha(data) == ref
        output.writestr(zipfile.ZipInfo(png.name, (2026, 1, 1, 0, 0, 0)), data)
        names[ref] = {'archive': archive_path.name, 'path': png.name, 'bytes': len(data)}
encoded = archive.getvalue()
archives['sources'].update(names)
archives['archives'] = [a for a in archives['archives'] if a['file'] != archive_path.name]
archives['archives'].append({'file': archive_path.name, 'sha256': sha(encoded),
                             'bytes': len(encoded), 'pngCount': len(names), 'compression': 'stored'})
ids = {r['id'] for r in rows}
index['records'] = [r for r in index['records'] if r['id'] not in ids] + rows
data = compact(index)
packed = gzip.compress(data, compresslevel=9, mtime=0)
transport = json.loads(transport_path.read_bytes())
entry = next(e for e in transport['indexes'] if e['target'].endswith('rework-modular-outfits-hd/index.json'))
entry.update(bytes=len(data), sha256=sha(data), compressedBytes=len(packed), compressedSha256=sha(packed))
archive_path.write_bytes(encoded)
archives_path.write_bytes(compact(archives))
source.write_bytes(packed)
materialized.write_bytes(data)
transport_path.write_text(json.dumps(transport, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(rows)} clips, {len(names)} original-sized candidate PNGs')
