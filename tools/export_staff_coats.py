"""Mount the editable lateral staff coats on their shared, ordered male anatomy."""
import gzip
import hashlib
import io
import json
import struct
import zipfile
from functools import lru_cache
from pathlib import Path

from export_male_dagger_coats import transparent_mask
from export_male_sword_coats import mask_png

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'art-approved/weapons/clothing-batch-20261112'
BANK = ROOT / 'tools/rework-weapon-layers-hd'
REGISTRATION = ROOT / 'tools/rework-combat-wardrobe/staff-hand-registration.json'
DIGESTS = {124: 'fb1b82efc98e5e2155195ec8e5108659d3946bbc17e767c43dad34d50f691726',
           128: '8228c8562ef396b5fcc331915c9bd50e21181e3e353c7d852d10a92b3660ef89'}
COATS = (151, 158, 165, 179)


def package(weapon):
    path = SOURCES / f'{weapon}_EW_M' / f'Cajado{weapon}_Masculino_EW_QuatroTrajes_Editavel.zip'
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != DIGESTS[weapon]:
        raise ValueError('Changed coat source ' + str(path))
    return zipfile.ZipFile(io.BytesIO(data))


def weapons():
    path = BANK / 'index.json'
    return json.loads(path.read_bytes() if path.exists() else gzip.decompress(Path(str(path) + '.gz').read_bytes()))


def ordered_parts(state):
    return [[l['id'], l['sha256']] for l in state['layers'] if l['id'] != 'gear']


def calibrate():
    # Optional regeneration. Each protected pixel in the distal contact must
    # also belong to the receiving hand; none comes from the donor's staff.
    import numpy as np
    from PIL import Image
    lookup = json.loads((BANK / 'archives/archive-index.json').read_bytes())['sources']

    @lru_cache(maxsize=64)
    def original(key):
        row = lookup[key]
        with zipfile.ZipFile(BANK / 'archives' / row['archive']) as archive:
            data = archive.read(row['path'])
        if hashlib.sha256(data).hexdigest() != key:
            raise ValueError('Changed native layer ' + key)
        return Image.open(io.BytesIO(data)).convert('RGBA')

    record = next(r for r in weapons()['orderedAttackProfiles'] if r['id'] == 'authored-ordered-124-east')
    hands = []
    with package(124) as first, package(128) as second:
        for frame, state in enumerate(record['states']):
            body = Image.new('RGBA', (640, 640))
            for layer in state['layers']:
                body.alpha_composite(original(layer['sha256']))
            ref = Image.open(io.BytesIO(first.read(f'source-{frame}.png'))).convert('RGBA')
            if not np.array_equal(np.asarray(body), np.asarray(ref)):
                raise ValueError('Staff receiver diverged from signed source')
            name = f'M151/{frame}-protected.png'
            shared = np.logical_and(*(np.asarray(Image.open(io.BytesIO(z.read(name)))) > 0 for z in (first, second)))
            grip = next(l for l in state['layers'] if l['id'] == 'grip')
            hand = shared & (np.asarray(original(grip['sha256']))[:, :, 3] > 0)
            yy, xx = np.where(hand)
            if not (len(xx) > 500 and xx.min() >= 349 and xx.max() <= 381 and yy.min() >= 299 and yy.max() <= 324):
                raise ValueError('Unbound distal hand')
            edges = np.where(np.diff(np.r_[False, hand.reshape(-1), False]))[0].reshape(-1, 2)
            hands.append([[int(a), int(b-a)] for a,b in edges])
    REGISTRATION.write_text(json.dumps(hands, separators=(',', ':')) + '\n', encoding='utf8')


def materialize(bank):
    def emit(data, mode):
        if struct.unpack('>IIBBBBB', data[16:29]) != (640, 640, 8, mode, 0, 0, 0):
            raise ValueError('Unexpected staff garment format')
        if mode == 0:
            data = transparent_mask(data)
        key = hashlib.sha256(data).hexdigest()
        (bank / (key + '.png')).write_bytes(data)
        return key

    clothing = {}
    masks = {}
    reference = {}
    for weapon in DIGESTS:
        with package(weapon) as src:
            recipe = json.loads(src.read('RECIPE.json'))
            if (recipe['item'] != weapon or tuple(recipe['outfits']) != COATS or recipe['directions'] != ['east','west']
                    or recipe['sourceTiming']['sequence'] != list(range(8)) or recipe['sourceTiming']['fps'] != 12):
                raise ValueError('Unexpected editable staff recipe')
            tracks = {c: [emit(src.read(f'M{c}/{i}-cloth.png'), 6) for i in range(8)] for c in COATS}
            if clothing and clothing != tracks:
                raise ValueError('A clothing source depends on the weapon')
            clothing = tracks
            masks[weapon] = []
            for i in range(8):
                parts = {src.read(f'M{c}/{i}-protected.png') for c in COATS}
                if len(parts) != 1:
                    raise ValueError('A weapon protection mask depends on the clothing')
                masks[weapon].append(emit(parts.pop(), 0))
            reference[weapon] = [hashlib.sha256(src.read(f'source-{i}.png')).hexdigest() for i in range(8)]
    hands = []
    for runs in json.loads(REGISTRATION.read_bytes()):
        data = mask_png(runs)
        key = hashlib.sha256(data).hexdigest()
        (bank / (key + '.png')).write_bytes(data)
        hands.append(key)
    if len(hands) != 8:
        raise ValueError('Incomplete hand track')
    index = weapons()
    poses = {}
    for direction in ('east','west'):
        base = next(r for r in index['orderedAttackProfiles'] if r['id'] == 'authored-ordered-124-' + direction)
        fused = next(r for r in index['records'] if r['id'] == 'staff128-' + direction + '-native-original-source')
        hashes = [s['approved']['sha256'] for s in fused['states']]
        if direction == 'east' and hashes != reference[128]:
            raise ValueError('Signed staff body no longer matches the garment')
        poses[direction] = dict(anatomy=[ordered_parts(s) for s in base['states']],
                                metal=[next(l['sha256'] for l in s['layers'] if l['id']=='gear') for s in base['states']],
                                fused=hashes)
    from register_side_focus_sleeves import materialize as sleeves
    return dict(coats=clothing, signedMasks=masks, hands=hands, directions=poses, archives=DIGESTS, sleeves=sleeves(bank))


if __name__ == '__main__':
    calibrate()
