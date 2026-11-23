"""Register the original North pistol garments in the 640px receiving space.

Building the published game only needs the standard library. Regeneration also
checks the complete editable frames against the archived native receiver.
"""
import gzip
import hashlib
import io
import json
import struct
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-approved/weapons/clothing-batch-20261112/114_N_M/Pistolas114_Masculino_NORTH_QuatroTrajes_Editavel.zip'
SOURCE_SHA = '3688ea866c5c225dbdcd80fd7f6d1ff8783c7da4f75f33e763e6f4edbc6d037f'
BANK = ROOT / 'tools/rework-weapon-layers-hd'
ATLAS = ROOT / 'tools/rework-combat-wardrobe/north-pistol-coats.zip'
RECEIVER = 'pistolas114-north-native-original-source'
COATS = (151, 158, 165, 179)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def registered_states():
    p = BANK / 'index.json'
    idx = json.loads(p.read_bytes() if p.exists() else gzip.decompress(Path(str(p) + '.gz').read_bytes()))
    r = next(r for r in idx['records'] if r['id'] == RECEIVER)
    if r['body'] != 'male' or r['direction'] != 'north' or r['pivot'] != [80, 128] or r['density'] != 4:
        raise ValueError('Pistol receiver registration changed')
    return [state['approved']['sha256'] for state in r['states']]


def recover():
    import numpy as np
    from PIL import Image
    data = SOURCE.read_bytes()
    if digest(data) != SOURCE_SHA:
        raise ValueError('Changed editable pistol package')
    lookup = json.loads((BANK / 'archives/archive-index.json').read_bytes())['sources']
    states = registered_states()
    entry = dict(source=SOURCE_SHA, receiver=RECEIVER, poses=states, coats={k: [] for k in COATS})
    files = {}
    with zipfile.ZipFile(io.BytesIO(data)) as src:
        recipe = json.loads(src.read('RECIPE.json'))
        if recipe['items'] != [114] or recipe['outfits'] != list(COATS) or recipe['directions'] != ['north']:
            raise ValueError('Unexpected pistol source family')
        for i, key in enumerate(states):
            location = lookup[key]
            with zipfile.ZipFile(BANK / 'archives' / location['archive']) as origin:
                raw = origin.read(location['path'])
                if digest(raw) != key:
                    raise ValueError('Corrupt pistol receiver')
                native = Image.open(io.BytesIO(raw)).convert('RGBA')
            for item in COATS:
                def read(part):
                    return Image.open(io.BytesIO(src.read(f'frames/114/M{item}/{i}-{part}.png')))
                body, cloth, protected, target = (read(p) for p in ('source','garment','protected','frame'))
                if {im.size for im in (body, cloth, protected, target)} != {(768,768)} or protected.mode != 'L':
                    raise ValueError('Changed donor canvas')
                def crop(image):
                    return image.crop((64,64,704,704))
                if crop(body).tobytes() != native.tobytes():
                    raise ValueError('Pistol source or phase no longer matches')
                # Protect the original weapon, hair and hands on the garment
                # layer only. A fitted coat never copies a donor body pixel.
                keep = np.array(protected)
                if not np.isin(keep, [0,255]).all():
                    raise ValueError('Unexpected feathering of ownership mask')
                pixels = np.array(cloth.convert('RGBA'))
                pixels[keep != 0] = 0
                garment = Image.fromarray(pixels)
                if Image.alpha_composite(body.convert('RGBA'), garment).tobytes() != target.convert('RGBA').tobytes():
                    raise ValueError(f'Garment did not reconstruct its source {item}/{i}')
                texture = crop(garment)
                if texture.getbbox() is None or np.count_nonzero(pixels[:, :, 3]) < 2000:
                    raise ValueError('Empty garment')
                out = io.BytesIO()
                texture.save(out, format='PNG', compress_level=9)
                name = digest(out.getvalue())
                files[name+'.png'] = out.getvalue()
                entry['coats'][item].append(name)
    files['registration.json'] = json.dumps(entry,separators=(',', ':')).encode()
    return files


def materialize(bank):
    with zipfile.ZipFile(ATLAS) as archive:
        row = json.loads(archive.read('registration.json'))
        if (row['source'] != SOURCE_SHA or row['receiver'] != RECEIVER or row['poses'] != registered_states()
                or set(map(int, row['coats'])) != set(COATS) or any(len(v) != 8 for v in row['coats'].values())):
            raise ValueError('Incomplete pistol coat registration')
        for key in {key for track in row['coats'].values() for key in track}:
            data = archive.read(key + '.png')
            if digest(data) != key or struct.unpack('>IIBB', data[16:26]) != (640,640,8,6):
                raise ValueError('Invalid registered garment raster')
            (bank / (key + '.png')).write_bytes(data)
    return row


if __name__ == '__main__':
    import sys
    assets = recover()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(ATLAS) as original:
            expected = json.loads(assets['registration.json'])
            saved = json.loads(original.read('registration.json'))
            if any(expected[k] != saved[k] for k in ('source', 'receiver', 'poses')) or set(saved['coats']) != set(expected['coats']):
                raise ValueError('Pistol atlas belongs to another receiver')
            for item, track in expected['coats'].items():
                for a, b in zip(track, saved['coats'][item], strict=True):
                    left = Image.open(io.BytesIO(assets[a+'.png'])).convert('RGBA')
                    right = Image.open(io.BytesIO(original.read(b+'.png'))).convert('RGBA')
                    if left.size != right.size or left.tobytes() != right.tobytes():
                        raise ValueError('Pistol atlas differs from its editable source ' + item)
    else:
        with zipfile.ZipFile(ATLAS,'w') as output:
            for key, data in sorted(assets.items()):
                output.writestr(zipfile.ZipInfo(key), data, compress_type=zipfile.ZIP_DEFLATED)
