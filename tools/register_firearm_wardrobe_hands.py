"""Measure the approved hand layers in physical pixels. Run when the source archives change."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import zipfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHECKPOINT = ROOT / 'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18'
STORE = ROOT / 'tools/rework-base-hd'
INDEX = STORE / 'index.json'
BASES = json.loads(INDEX.read_bytes() if INDEX.exists() else gzip.decompress(Path(str(INDEX) + '.gz').read_bytes()))['records']
ASSETS = json.loads((STORE / 'archives/archive-index.json').read_bytes())['sources']


def png(archive, member, digest):
    data = archive.read(member)
    assert hashlib.sha256(data).hexdigest() == digest
    return Image.open(io.BytesIO(data)).convert('RGBA').getchannel('A')


def native_mask(digest):
    row = ASSETS[digest]
    with zipfile.ZipFile(STORE / 'archives' / row['archive']) as z:
        return png(z, row['path'], digest)


def center(mask, box=None):
    # Keep original size and orientation. Only the point of attachment moves.
    x, y, _, _ = box or (0, 0, *mask.size)
    bounds = (mask.crop(box) if box else mask).getbbox()
    assert bounds
    return x + (bounds[0] + bounds[2]) / 2, y + (bounds[1] + bounds[3]) / 2


def registration(direction):
    name = 'fuzil113-ns' if direction == 'south' else 'pistolas114-laterais'
    base = next(r for r in BASES if r['id'] == f'v7-female-firearm-{direction}-ownership-candidate-{direction}')
    layers = base['pack']['directions'][direction]['layers']
    with zipfile.ZipFile(CHECKPOINT / (name + '.zip')) as z:
        def read(key):
            return json.loads(z.read(name + '/' + key + '.json'))
        reference = (read('catalog')['originals']['south']['states'] if direction == 'south'
                     else read('canonical-' + direction)['pack']['directions'][direction]['layers'])
        samples = []
        for frame in range(8):
            if direction == 'south':
                h = next(l['sha256'] for l in reference[frame]['layers'] if l['id'] == 'hands')
                mask = png(z, name + '/assets/' + h + '.png', h)
                occupied = mask.getprojection()[0]
                runs = [i for i in range(1, mask.width) if bool(occupied[i]) != bool(occupied[i-1])]
                assert len(runs) == 4
                split = (runs[1] + runs[2]) // 2
                boxes = [(0, 0, split, 640), (split, 0, 640, 640)]
                src = [(h, center(mask, box), box) for box in boxes]
            else:
                src = []
                for index in (15, 17):
                    h = reference[index]['frames'][frame]
                    mask = png(z, name + '/assets/' + h + '.png', h)
                    src.append((h, center(mask), None))
            dst = []
            for side in ('left', 'right'):
                h = next(l['frames'][frame] for l in layers if l['id'] == side + '-hand')
                dst.append((h, center(native_mask(h))))
            samples.append((src, dst))
        def displacement(order):
            return sum(sum((a-b)**2 for a,b in zip(src[i][1], dst[j][1]))
                       for src, dst in samples for i,j in enumerate(order))
        order = min([(0, 1), (1, 0)], key=displacement)
        return [[dict(source=src[i][0], target=dst[j][0], side=('left','right')[j], box=src[i][2],
                      offset=[round(b-a) for a,b in zip(src[i][1], dst[j][1])])
                 for i,j in enumerate(order)] for src,dst in samples]


if __name__ == '__main__':
    result = {di: registration(di) for di in ('south', 'west', 'east')}
    (ROOT / 'tools/rework-combat-wardrobe/firearm-hand-registration.json').write_text(
        json.dumps(result, indent=2) + '\n', encoding='utf-8')
