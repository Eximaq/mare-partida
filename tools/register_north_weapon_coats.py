"""Register editable North coats against the exact native weapon frames."""
import gzip
import io
import json
import zipfile
from pathlib import Path

from export_north_focus_coats import BANK, COATS, ROOT, SOURCES, digest

ATLAS = ROOT / 'tools/rework-combat-wardrobe/north-weapon-coats.zip'
# Archive identities, never a clothing combination. Other members (notably
# item 0) use an adapted weapon receiver and need their own registration.
ORIGINS = {'0-67-70_N_M': ('sword67-north-native-layers','sword70-north-native-layers'),
           '2-3-110_N_M': ('gauntlet110-north-native-original-source',)}


def receivers():
    path = BANK/'index.json'
    content = path.read_bytes() if path.exists() else gzip.decompress(Path(str(path)+'.gz').read_bytes())
    ids = {record for group in ORIGINS.values() for record in group}
    result = {r['id']:r for r in json.loads(content)['records'] if r['id'] in ids}
    if result.keys() != ids:
        raise ValueError('Missing North weapon receiver')
    return result


def recover():
    from PIL import Image
    import numpy as np
    assets, rows = {}, {}
    records = receivers()
    source_index = json.loads((BANK/'archives/archive-index.json').read_bytes())['sources']
    for folder, bindings in ORIGINS.items():
        raw = b''.join(p.read_bytes() for p in sorted((SOURCES/folder).glob('*.zip*')) if p.is_file())
        archive_sha = digest(raw)
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            recipe = json.loads(archive.read('RECIPE.json'))
            if set(recipe['outfits']) != COATS or recipe.get('directions',[recipe.get('direction')]) != ['north']:
                raise ValueError('Invalid editorial scope')
            for record_id in bindings:
                r = records[record_id]
                item = r['item']
                if (item not in recipe['items'] or r['density'] != 4 or r['fps'] != 12 or r['body'] != 'male'
                        or len(r['states']) != 8 or list(map(int,r['timeline'])) != list(range(8))):
                    raise ValueError('Incompatible North pose or timing')
                poses = [s['approved']['sha256'] for s in r['states']]
                width,height = r['nativeCanvas']
                if width != height or width not in (640,768):raise ValueError('Unsupported density')
                pad = (768-width)//2
                crop = (pad,pad,pad+width,pad+height)
                row = rows[item] = dict(poses=poses,size=[width,height],pivot=r['pivot'],source=record_id,coats={})
                for phase,key in enumerate(poses):
                    location = source_index[key]
                    with zipfile.ZipFile(BANK/'archives'/location['archive']) as bank:
                        data = bank.read(location['path'])
                    if digest(data) != key:raise ValueError('Changed weapon source')
                    before = Image.open(io.BytesIO(data)).convert('RGBA')
                    for coat in sorted(COATS):
                        prefix = next(p for p in (f'frames/{item}/M{coat}/',f'frames/{item}/{coat}/')
                                      if p+'0-source.png' in archive.namelist())+str(phase)
                        def read(*suffixes):
                            name = next(prefix+s+'.png' for s in suffixes if prefix+s+'.png' in archive.namelist())
                            return Image.open(io.BytesIO(archive.read(name)))
                        source = read('-source').convert('RGBA')
                        cloth,protected = read('-garment').convert('RGBA'),read('-protected','-ownership')
                        target = read('-frame','').convert('RGBA')
                        if (source.size != (768,768) or any(im.size!=source.size for im in (cloth,protected,target)) or
                                source.crop(crop).tobytes() != before.tobytes() or protected.mode != 'L'):
                            raise ValueError(f'Incompatible receiver or mask {item}/{coat}/{phase}')
                        mask = np.asarray(protected)
                        if not np.isin(mask,[0,255]).all():raise ValueError('Ambiguous ownership')
                        pixels = np.array(cloth)
                        pixels[mask!=0]=0
                        plate = Image.fromarray(pixels)
                        bbox = plate.getbbox()
                        if (not bbox or bbox[0]<pad or bbox[1]<pad or bbox[2]>pad+width or bbox[3]>pad+height or
                                Image.alpha_composite(source,plate).tobytes()!=target.tobytes()):
                            raise ValueError(f'Garment does not reproduce the approved picture {item}/{coat}/{phase}')
                        out = io.BytesIO();plate.crop(crop).save(out,format='PNG',compress_level=9)
                        image = out.getvalue();sha = digest(image);assets[sha+'.png']=image
                        row['coats'].setdefault(coat,dict(archive=archive_sha,path=folder,cloth=[]))['cloth'].append(sha)
    assets['registration.json']=json.dumps(rows,separators=(',',':')).encode()
    return assets


def materialize(bank):
    current = receivers()
    with zipfile.ZipFile(ATLAS) as archive:
        rows = json.loads(archive.read('registration.json'))
        if {r['source'] for r in rows.values()} != set(current):raise ValueError('Missing registered coats')
        for item,row in rows.items():
            record = current[row['source']]
            if (int(item)!=record['item'] or row['size']!=record['nativeCanvas'] or row['pivot']!=record['pivot'] or row['poses']!=
                    [s['approved']['sha256'] for s in record['states']] or set(map(int,row['coats']))!=COATS):
                raise ValueError('Stale North weapon coat')
            for entry in row['coats'].values():
                if len(entry['cloth'])!=len(row['poses']):raise ValueError('Incomplete coat cycle')
                for key in set(entry['cloth']):
                    data = archive.read(key+'.png')
                    if digest(data)!=key:raise ValueError('Changed cloth plate')
                    (bank/(key+'.png')).write_bytes(data)
    return rows


if __name__ == '__main__':
    import sys
    assets = recover()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(ATLAS) as archive:
            old,new = json.loads(archive.read('registration.json')),json.loads(assets['registration.json'])
            if old.keys()!=new.keys():raise ValueError('Changed receiver set')
            for item,row in new.items():
                prior = old[item]
                if any(prior[k]!=row[k] for k in ('source','size','pivot','poses')) or prior['coats'].keys()!=row['coats'].keys():raise ValueError('Changed registration')
                for coat,entry in row['coats'].items():
                    saved = prior['coats'][coat]
                    if (saved['archive'],saved['path'])!=(entry['archive'],entry['path']):raise ValueError('Wrong garment origin')
                    for a,b in zip(entry['cloth'],saved['cloth'],strict=True):
                        lhs=Image.open(io.BytesIO(assets[a+'.png']));rhs=Image.open(io.BytesIO(archive.read(b+'.png')))
                        if lhs.size!=rhs.size or lhs.tobytes()!=rhs.tobytes():raise ValueError('North coat pixels changed')
    else:
        with zipfile.ZipFile(ATLAS,'w') as archive:
            for name,data in sorted(assets.items()):
                archive.writestr(zipfile.ZipInfo(name),data,compress_type=zipfile.ZIP_DEFLATED)
