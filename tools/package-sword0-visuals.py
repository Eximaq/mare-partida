"""Publish the derived Sword 0 layers as deterministic native HD archives."""
import gzip
import hashlib
import io
import json
import sys
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent
generated = Path(sys.argv[1])
weapon_dir = root / 'rework-weapon-layers-hd'
outfit_dir = root / 'rework-modular-outfits-hd'

def compact(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode()

def sha(data):
    return hashlib.sha256(data).hexdigest()

def archive(folder, files, name):
    index_path = folder / 'archives/archive-index.json'
    index = json.loads(index_path.read_bytes())
    index['archives'] = [entry for entry in index['archives'] if entry['file'] != name]
    index['sources'] = {k: v for k, v in index['sources'].items() if v['archive'] != name}
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_STORED) as z:
        for p in sorted(files.glob('*.png')):
            data = p.read_bytes()
            assert sha(data) == p.stem
            z.writestr(zipfile.ZipInfo(p.name, (2026, 1, 1, 0, 0, 0)), data)
            index['sources'][p.stem] = {'archive': name, 'path': p.name, 'bytes': len(data)}
    data = buf.getvalue()
    index['archives'].append({'file': name, 'sha256': sha(data), 'bytes': len(data),
                              'pngCount': len(list(files.glob('*.png'))), 'compression': 'stored'})
    (index_path.parent / name).write_bytes(data)
    index_path.write_bytes(compact(index))

sword = json.loads((generated / 'sword.json').read_bytes())
pants = json.loads((generated / 'pants.json').read_bytes())
assert len(pants) == 72 and len(sword['states']) == 9
archive(weapon_dir, generated / 'weapon', 'sword0-south-modular-nine.zip')
archive(outfit_dir, generated / 'outfit', 'sword0-female-pants-v1.zip')
weapon_path = weapon_dir / 'index.json'
index = json.loads(weapon_path.read_bytes())
index['modularSwordSouth'] = sword
weapon_path.write_bytes(compact(index))
outfit_path = outfit_dir / 'index.json.gz'
index = json.loads(gzip.decompress(outfit_path.read_bytes()))
ids = {r['id'] for r in pants}
index['records'] = [r for r in index['records'] if r['id'] not in ids] + pants
raw = compact(index)
packed = gzip.compress(raw, compresslevel=9, mtime=0)
outfit_path.write_bytes(packed)
outfit_path.with_suffix('').write_bytes(raw)
manifest_path = root / 'native-index-transport.json'
manifest = json.loads(manifest_path.read_bytes())
entry = next(e for e in manifest['indexes'] if e['target'].endswith('rework-modular-outfits-hd/index.json'))
entry.update(bytes=len(raw), sha256=sha(raw), compressedBytes=len(packed), compressedSha256=sha(packed))
manifest_path.write_bytes((json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode())
