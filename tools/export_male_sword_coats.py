"""Recover four native coat tracks and register them to the articulated sword anatomy."""
import gzip
import hashlib
import io
import json
import struct
import zlib
import zipfile
from pathlib import Path

from export_male_dagger_coats import open_package

ROOT = Path(__file__).resolve().parents[1]
PARTS = ROOT / 'art-approved/weapons/male1-68-four-torsos-ew/parts'
BANK = ROOT / 'tools/rework-weapon-layers-hd'
REGISTRATION = ROOT / 'tools/rework-combat-wardrobe/sword-hand-registration.json'
ARCHIVE = '3b3ff09ef98716f5d4b0faff6c9b90c3d3b366a7822c33a137ecb5981056ad84'
ITEMS = (151, 158, 165, 179)


def receptors():
    index = BANK / 'index.json'
    data = index.read_bytes() if index.exists() else gzip.decompress(Path(str(index) + '.gz').read_bytes())
    records = json.loads(data)['records']
    return {r['direction']: r['basePack'] for r in records if r['item'] == 1 and r['body'] == 'male'
            and r['direction'] in ('east', 'west') and r.get('basePack')}


def source_key(pack):
    return hashlib.sha256(json.dumps(pack, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def calibrate():
    # Only the optional offline regeneration needs NumPy and Pillow.
    import numpy as np
    from PIL import Image

    def rgba(data):
        return np.array(Image.open(io.BytesIO(data)).convert('RGBA'))

    rigs = receptors()
    east = rigs['east']['pack']['directions']['east']
    sources = json.loads((BANK / 'archives/archive-index.json').read_bytes())['sources']

    def original(key):
        entry = sources[key]
        with zipfile.ZipFile(BANK / 'archives' / entry['archive']) as package:
            pixels = package.read(entry['path'])
        if hashlib.sha256(pixels).hexdigest() != key:
            raise ValueError('Native receiver source mismatch')
        return rgba(pixels)

    def limb(layer, phase):
        key = next(l['frames'][phase] for l in east['layers'] if l['id'] == layer)
        return np.pad(original(key)[:, :, 3] > 0, 64)

    rows = []
    with open_package(PARTS, ARCHIVE) as package:
        for phase in range(8):
            own = []
            metal = []
            for weapon in (1, 68):
                mmap = [package.read(f'frames/{weapon}/{coat}/{phase}-ownership.png') for coat in ITEMS]
                if len(set(mmap)) != 1:
                    raise ValueError('Hand ownership depends on a coat')
                own.append(np.array(Image.open(io.BytesIO(mmap[0])).convert('L')) > 0)
                metal.append(rgba(package.read(f'source/{weapon}/equipment-east/{phase}.png'))[:, :, 3] > 0)
            shared = (own[0] & ~metal[0]) | (own[1] & ~metal[1])
            if any(not np.array_equal(shared | m, o) for m, o in zip(metal, own)):
                raise ValueError('Unresolved source ownership')
            near, far = limb('forearm-hand-near', phase), limb('forearm-hand-far', phase)
            hands = shared & (near | far)
            # The two terminal donor palms have a different silhouette. In the
            # measured distal contact rectangle only the actual near hand covers cloth.
            cut = {0: (360, 411, 398, 454), 7: (350, 404, 389, 447)}.get(phase)
            if cut:
                x, y, right, bottom = cut
                region = np.s_[y:bottom, x:right]
                hands[region] = (near | (far & shared))[region]
            flat = hands[64:-64, 64:-64].reshape(-1)
            edges = np.where(np.diff(np.r_[False, flat, False]))[0].reshape(-1, 2)
            rows.append([[int(start), int(stop - start)] for start, stop in edges])
    spec = dict(rigs={d: source_key(p['pack']['directions'][d]) for d, p in rigs.items()}, hands=rows)
    REGISTRATION.write_text(json.dumps(spec, separators=(',', ':')) + '\n', encoding='utf-8')


def mask_png(runs):
    scan = bytearray(641 * 640)
    for start, length in runs:
        if start < 0 or length <= 0 or start + length > 640 * 640:
            raise ValueError('Invalid hand matte')
        for i in range(start, start + length):
            y, x = divmod(i, 640)
            scan[y * 641 + 1 + x] = 255
    def chunk(kind, data):
        payload = kind + data
        return struct.pack('>I', len(data)) + payload + struct.pack('>I', zlib.crc32(payload))
    return (bytes.fromhex('89504e470d0a1a0a') + chunk(b'IHDR', struct.pack('>IIBBBBB', 640, 640, 8, 0, 0, 0, 0))
            + chunk(b'tRNS', bytes(2)) + chunk(b'IDAT', zlib.compress(scan, 9)) + chunk(b'IEND', b''))


def materialize(bank):
    registration = json.loads(REGISTRATION.read_bytes())
    rigs = receptors()
    directions = {d: p['pack']['directions'][d] for d, p in rigs.items()}
    if (set(directions) != {'east', 'west'} or len(registration['hands']) != 8 or
            {d: source_key(p) for d, p in directions.items()} != registration['rigs']):
        raise ValueError('Changed articulated sword anatomy')
    def emit(data):
        key = hashlib.sha256(data).hexdigest()
        (bank / (key + '.png')).write_bytes(data)
        return key
    coats = {}
    with open_package(PARTS, ARCHIVE) as src:
        recipe = json.loads(src.read('RECIPE.json'))
        checklist = json.loads(src.read('HASH_MANIFEST.json'))
        if (tuple(recipe['outfits']) != ITEMS or recipe['weapons'] != [1, 68] or
                recipe['frames'] != 8 or recipe['fps'] != 12 or not recipe['westLiteralMirror']):
            raise ValueError('Unexpected sword coat recipe')
        for item in ITEMS:
            phases = []
            for phase in range(8):
                name = f'clothing/{item}/{phase}-cloth.png'
                data = src.read(name)
                if (hashlib.sha256(data).hexdigest() != checklist[name] or
                        struct.unpack('>IIBBBBB', data[16:29]) != (768, 768, 8, 6, 0, 0, 0)):
                    raise ValueError('Invalid isolated coat ' + name)
                phases.append(emit(data))
            coats[item] = phases
    return dict(archive=ARCHIVE, coats=coats, hands=[emit(mask_png(row)) for row in registration['hands']],
                directions=directions)


if __name__ == '__main__':
    calibrate()
