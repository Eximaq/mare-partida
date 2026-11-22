"""Export independent coat pixels and original dagger/hand occlusions for lateral attacks."""
import gzip
import hashlib
import io
import json
import struct
import zlib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / 'art-approved/weapons/male-daggers12-13-71-74-four-torsos-ew-v2/parts'
DIGEST = '67134527f6c1793484ac303b9624f17ea0212ce231e10adafa193d75289e3461'
SIZES = {'cloth': 6, 'ownership': 0}


def open_package():
    manifest = json.loads((PACKAGE / 'MANIFEST.json').read_bytes())
    stream = io.BytesIO()
    for part in manifest['parts']:
        data = (PACKAGE / part['path']).read_bytes()
        if len(data) != part['bytes'] or hashlib.sha256(data).hexdigest() != part['sha256']:
            raise ValueError('Invalid dagger wardrobe archive segment ' + part['path'])
        stream.write(data)
    if hashlib.sha256(stream.getbuffer()).hexdigest() != DIGEST:
        raise ValueError('Unexpected approved dagger wardrobe archive')
    return zipfile.ZipFile(stream)


def transparent_mask(data):
    # The source is a binary grayscale ownership image. PNG transparency for
    # sample zero makes it a canvas matte without decoding or repainting pixels.
    chunk = b'tRNS' + b'\x00\x00'
    trns = struct.pack('>I', 2) + chunk + struct.pack('>I', zlib.crc32(chunk))
    return data[:33] + trns + data[33:]


def materialize(bank):
    weapon_file = ROOT / 'tools/rework-weapon-layers-hd/index.json'
    index = json.loads(weapon_file.read_bytes() if weapon_file.exists() else
                       gzip.decompress(Path(str(weapon_file) + '.gz').read_bytes()))
    profiles = {(r['item'], r['direction']): r for r in index['orderedAttackProfiles']
                if r['body'] == 'male' and r['action'] == 'attack-daggers'}
    assets = set()
    with open_package() as archive:
        hashes = json.loads(archive.read('HASH_MANIFEST.json'))
        recipe = json.loads(archive.read('RECIPE.json'))
        items, coats = recipe['items'], recipe['coats']
        if len(set(items)) != 6 or len(set(coats)) != 4 or recipe['statesPerSide'] != 8:
            raise ValueError('Incomplete dagger wardrobe recipe')

        def emit(names, material):
            names = list(names)
            if len({hashes[name] for name in names}) != 1:
                raise ValueError('Unexpected clothing dependency in ' + names[0])
            data = archive.read(names[0])
            if hashlib.sha256(data).hexdigest() != hashes[names[0]] or struct.unpack(
                    '>IIBBBBB', data[16:29]) != (640, 640, 8, SIZES[material], 0, 0, 0):
                raise ValueError('Invalid native pass ' + names[0])
            if material == 'ownership':
                data = transparent_mask(data)
            h = hashlib.sha256(data).hexdigest()
            if h not in assets:
                (bank / (h + '.png')).write_bytes(data)
                assets.add(h)
            return h

        clothes = {c: [emit((f'candidate/{w}/{c}/{i}-cloth.png' for w in items), 'cloth')
                       for i in range(8)] for c in coats}
        occluders = {w: [emit((f'candidate/{w}/{c}/{i}-ownership.png' for c in coats), 'ownership')
                         for i in range(8)] for w in items}
    poses = {}
    for w in items:
        for direction in ('east', 'west'):
            r = profiles[w, direction]
            if (not r['strictSourceIdentity'] or r['nativeCanvas'] != [640, 640] or
                    r['pivot'] != [80, 128] or len(r['states']) != 8 or r['fps'] != recipe['fps']):
                raise ValueError('Unexpected native dagger receiver ' + r['id'])
            parts = []
            for state in r['states']:
                layers = state['layers']
                if [l['id'] for l in layers] != ['far-gear', 'authored-body', 'near-gear',
                                                'original-hand-and-outside-gear-restoration']:
                    raise ValueError('Unexpected dagger ownership ' + r['id'])
                parts.append([layers[0]['sha256'], layers[2]['sha256'], layers[3]['mask']['sha256']])
            poses[f'{w}/{direction}'] = parts
    return dict(archive=DIGEST, coats=clothes, handMasks=occluders, poses=poses)
