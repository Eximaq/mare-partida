"""Export each owned plate from the versioned female dagger checkpoint."""
import hashlib
import io
import json
from pathlib import Path
import re
import struct
import zipfile

ARCHIVE = 'adaga-12-13-71-74-camadas.zip'
DIGEST = 'afc7c746f731b2939d04692017b7a999f93884a9c7b386e9d0d0557f8ca8fa46'
DIRECTIONS = {'north', 'south', 'east', 'west'}
LAYOUT = {'pants': [('foreground', .9)], 'boots': [('pants', -1), ('pants', .7)],
          'gloves': [('foreground', 3.1), ('foreground', 6.1)]}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def materialize(checkpoint, out):
    manifest = json.loads((checkpoint / 'manifest.json').read_text(encoding='utf-8'))
    spec = next(row for row in manifest['archives'] if row['file'] == ARCHIVE)
    chunks = []
    for row in spec['parts']:
        name = Path(row['file'])
        if name.name != row['file']:
            raise ValueError('Invalid dagger checkpoint path')
        content = (checkpoint / name).read_bytes()
        if len(content) != row['bytes'] or sha(content) != row['sha256']:
            raise ValueError(f'Invalid dagger checkpoint part: {name}')
        chunks.append(content)
    raw = b''.join(chunks)
    if spec['sha256'] != DIGEST or sha(raw) != DIGEST or len(raw) != spec['bytes']:
        raise ValueError('Invalid dagger checkpoint digest')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        catalog = json.loads(archive.read('catalog.json'))
        inventory = set(json.loads(archive.read('asset-map.json')))
        if catalog['schema'] != 'staged-dagger-gear-v1' or set(catalog['directionDeltas']) != DIRECTIONS:
            raise ValueError('Invalid dagger checkpoint catalog')
        targets = {}
        for key, target in catalog['targets'].items():
            targets[key] = json.loads(target)
        rows, used = [], set()
        for direction, deltas in catalog['directionDeltas'].items():
            for key, delta in deltas.items():
                slot, item = key.split('/')
                layout = LAYOUT[slot][-1:] if slot == 'gloves' and direction == 'south' else LAYOUT[slot]
                layers = delta['append']
                if delta['replace'] or [(l['slot'], l['depth']) for l in layers] != layout:
                    raise ValueError(f'Unexpected dagger layer layout: {direction}/{key}')
                for l in layers:
                    prefix = 'adaga-stage' if slot == 'gloves' else 'adaga-overlap'
                    ident = f'{prefix}:{slot}:{item}'
                    if (l['id'] != ident and not l['id'].startswith(ident + ':') or
                            l['binding'] != {'kind': 'fixed'} or len(l['frames']) != 8 or
                            l['source'] != l['frames'][0]):
                        raise ValueError(f'Invalid phase ownership: {direction}/{key}')
                    used.update(l['frames'])
                rows.append(dict(direction=direction, slot=slot, item=int(item), layers=layers))
        if used != inventory:
            raise ValueError('Dagger catalog asset inventory mismatch')
        assets = out / 'assets'
        assets.mkdir(parents=True, exist_ok=True)
        for digest in sorted(used):
            if not re.fullmatch('[a-f0-9]{64}', digest):
                raise ValueError('Invalid dagger raster identifier')
            data = archive.read(f'assets/{digest}.png')
            if (sha(data) != digest or data[:16] != b'\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR' or
                    struct.unpack('>II', data[16:24]) != (640, 640)):
                raise ValueError(f'Invalid dagger raster: {digest}')
            (assets / f'{digest}.png').write_bytes(data)
        (out / 'index.json').write_text(json.dumps(dict(
            schema='female-dagger-owned-wardrobe-v1', sourceSHA256=DIGEST, targets=targets, records=rows),
            separators=(',', ':')) + '\n', encoding='utf-8')
        return len(rows), len(used)
