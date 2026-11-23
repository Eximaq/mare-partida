"""Recover isolated coat passes from the editable North focus attacks."""
import gzip
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'art-approved/weapons/clothing-batch-20261112'
ATLAS = ROOT / 'tools/rework-combat-wardrobe/north-focus-coats.zip'
BANK = ROOT / 'tools/rework-weapon-layers-hd'
COATS = {151, 158, 165, 179}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def records():
    p = BANK / 'index.json'
    source = p.read_bytes() if p.exists() else gzip.decompress(Path(str(p)+'.gz').read_bytes())
    return {r['item']: r for r in json.loads(source)['records']
            if r['id'] == f"staff{r['item']}-north-native-original-source"}


def recover():
    import numpy as np
    from PIL import Image
    bank = json.loads((BANK / 'archives/archive-index.json').read_bytes())['sources']
    @lru_cache(maxsize=12)
    def original(key):
        row = bank[key]
        with zipfile.ZipFile(BANK / 'archives' / row['archive']) as archive:
            data = archive.read(row['path'])
        if digest(data) != key:
            raise ValueError('Corrupt receiving artwork ' + key)
        return Image.open(io.BytesIO(data)).convert('RGBA')

    out, garments = {}, {}
    for item, record in records().items():
        if record['density'] != 4 or record['pivot'] != [80,128] or record['fps'] != 12:
            raise ValueError('Changed focus rig')
        states = [s['approved']['sha256'] for s in record['states']]
        if len(states) != 9 or list(map(int,record['timeline'])) != list(range(9)):
            raise ValueError('Changed focus animation')
        row = garments[item] = dict(poses=states, coats={})
        for directory in sorted(SOURCES.glob(f'{item}_N_M*')):
            files = sorted(p for p in directory.iterdir() if p.is_file() and '.zip' in p.name)
            data = b''.join(p.read_bytes() for p in files)
            archive_key = digest(data)
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                recipe = json.loads(archive.read('RECIPE.json'))
                if (recipe.get('item',recipe.get('weapon')) != item or recipe['gender'] != 'male' or
                        recipe['direction'] != 'north' or recipe['fps'] != 12 or recipe['sequence'][:9] != list(range(9))):
                    raise ValueError('Changed coat registration ' + directory.name)
                for coat in recipe.get('outfits',[recipe.get('outfit')]):
                    if coat in row['coats'] or coat not in COATS:
                        raise ValueError('Ambiguous coat')
                    prefix = f'M{coat}/' if 'outfits' in recipe else ''
                    own = []
                    for i, key in enumerate(states):
                        def part(suffix):
                            return Image.open(io.BytesIO(archive.read(f'{prefix}{i}{suffix}.png')))
                        src, layer, keep, ref = part('-source'), part('-garment'), part('-protected'), part('')
                        if (src.size != (640,640) or layer.size != src.size or keep.size != src.size or
                                keep.mode != 'L' or src.convert('RGBA').tobytes() != original(key).tobytes()):
                            raise ValueError(f'Unregistered receiving pose {item}/{coat}/{i}')
                        pix = np.array(layer.convert('RGBA'))
                        protected = np.asarray(keep)
                        if not np.isin(protected,[0,255]).all():
                            raise ValueError('Ambiguous ownership')
                        pix[protected!=0] = 0
                        plate = Image.fromarray(pix)
                        if not plate.getbbox() or Image.alpha_composite(src.convert('RGBA'),plate).tobytes() != ref.convert('RGBA').tobytes():
                            raise ValueError(f'Garment does not reproduce its editable original {item}/{coat}/{i}')
                        buffer = io.BytesIO()
                        plate.save(buffer,format='PNG',compress_level=9)
                        asset = buffer.getvalue()
                        sha = digest(asset)
                        own.append(sha)
                        out[sha+'.png'] = asset
                    row['coats'][coat] = dict(archive=archive_key, path=directory.name, cloth=own)
        if set(row['coats']) != COATS:
            raise ValueError(f'Incomplete North coats for {item}')
    out['registration.json'] = json.dumps(garments,separators=(',',':')).encode()
    return out


def materialize(bank):
    with zipfile.ZipFile(ATLAS) as archive:
        rows = json.loads(archive.read('registration.json'))
        current = records()
        if set(map(int,rows)) != set(current):
            raise ValueError('Unregistered focus receiver')
        for item,row in rows.items():
            states = [s['approved']['sha256'] for s in current[int(item)]['states']]
            if states != row['poses'] or set(map(int,row['coats'])) != COATS:
                raise ValueError('Stale focus registration')
            for coat in row['coats'].values():
                if len(coat['cloth']) != len(states):
                    raise ValueError('Incomplete coat cycle')
                for key in set(coat['cloth']):
                    data = archive.read(key+'.png')
                    if digest(data) != key or data[16:26] != bytes.fromhex('00000280000002800806'):
                        raise ValueError('Invalid coat plate')
                    (bank / (key+'.png')).write_bytes(data)
    return rows


if __name__ == '__main__':
    assets = recover()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(ATLAS) as stored:
            actual, expected = json.loads(stored.read('registration.json')), json.loads(assets['registration.json'])
            if set(actual) != set(expected):
                raise ValueError('Different receivers')
            for item,row in expected.items():
                if row['poses'] != actual[item]['poses'] or set(row['coats']) != set(actual[item]['coats']):
                    raise ValueError('Different receiving poses or coats')
                for coat, entry in row['coats'].items():
                    saved = actual[item]['coats'][coat]
                    if (entry['archive'],entry['path']) != (saved['archive'],saved['path']):
                        raise ValueError('Different editable coat source')
                    for lhs,rhs in zip(entry['cloth'],saved['cloth'],strict=True):
                        a = Image.open(io.BytesIO(assets[lhs+'.png']))
                        b = Image.open(io.BytesIO(stored.read(rhs+'.png')))
                        if a.size != b.size or a.convert('RGBA').tobytes() != b.convert('RGBA').tobytes():
                            raise ValueError('Garment differs from original')
    else:
        with zipfile.ZipFile(ATLAS,'w') as archive:
            for name,data in sorted(assets.items()):
                archive.writestr(zipfile.ZipInfo(name),data,compress_type=zipfile.ZIP_DEFLATED)
