"""Measure wrist registration from the archived hand and forearm alpha, at native density."""
from functools import lru_cache
from pathlib import Path
import hashlib
import io
import json
import math
import zipfile

from PIL import Image

from export_combat_wardrobe import read_archive

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18'
source = read_archive(FOLDER, 'focus')
base_dir = ROOT / 'tools/rework-base-hd'
native = json.loads((base_dir / 'index.json').read_bytes())['records']
archive = json.loads((base_dir / 'archives/archive-index.json').read_bytes())['sources']
own = {hashlib.sha256(data).hexdigest(): data for name, data in source.items() if name.endswith('.png')}


@lru_cache(maxsize=None)
def center(digest):
    data = own.get(digest)
    if data is None:
        ref = archive[digest]
        with zipfile.ZipFile(base_dir / 'archives' / ref['archive']) as z:
            data = z.read(ref['path'])
    assert hashlib.sha256(data).hexdigest() == digest
    plane = Image.open(io.BytesIO(data)).convert('RGBA').getchannel('A')
    box = plane.getbbox()
    if not box:
        return None
    crop = plane.crop(box)
    samples = [(x + .5 + box[0], y + .5 + box[1], value)
               for y in range(crop.height) for x in range(crop.width)
               if (value := crop.getpixel((x, y)))]
    weight = sum(p[2] for p in samples)
    return tuple(sum(p[i] * p[2] for p in samples) / weight for i in (0, 1))


def rigid(hand, arm, target, forearm):
    a, b = math.atan2(hand[1]-arm[1], hand[0]-arm[0]), math.atan2(target[1]-forearm[1], target[0]-forearm[0])
    c, s = math.cos(b-a), math.sin(b-a)
    return [round(v, 6) for v in (c, s, -s, c, target[0]-c*hand[0]+s*hand[1], target[1]-s*hand[0]-c*hand[1])]


def measure():
    result = {}
    for direction in ('north','south','east','west'):
        ref = json.loads(source[f'orbe-cajado-canonical-reviewed/records/17-{direction}.json'])
        live = next(r for r in native if r['id'] == f'v7-female-focus-{direction}-ownership-candidate-{direction}')
        rigs = [r['pack']['directions'][direction]['layers'] for r in (ref, live)]
        for side in ('left','right'):
            tracks = [next(l['frames'] for l in layers if l['id'] == side+'-'+part)
                      for layers in rigs for part in ('hand','forearm')]
            result[direction+'/'+side] = []
            for i in range(8):
                hashes = [t[i] for t in tracks]
                points = [center(h) for h in hashes]
                if any(p is None for p in points):
                    raise ValueError(f'Empty hand landmark at {direction}/{side}/{i}')
                result[direction+'/'+side].append(dict(hashes=hashes,matrix=rigid(*points)))
    return result


if __name__ == '__main__':
    target = ROOT / 'tools/rework-combat-wardrobe/focus-hand-registration.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(measure(), separators=(',', ':')) + '\n', encoding='utf-8')
