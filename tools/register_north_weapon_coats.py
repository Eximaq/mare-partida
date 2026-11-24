"""Register editable North coats against the exact native weapon frames."""
import gzip
import io
import json
import zipfile
from functools import lru_cache
from pathlib import Path

from export_north_focus_coats import BANK, COATS, ROOT, SOURCES, digest

ATLAS = ROOT / 'tools/rework-combat-wardrobe/north-weapon-coats.zip'
# Archive identities, never a clothing combination. Other members (notably
# item 0) use an adapted weapon receiver and need their own registration.
ORIGINS = {'0-67-70_N_M': ('sword67-north-native-layers','sword70-north-native-layers'),
           '2-3-110_N_M': ('gauntlet110-north-native-original-source',),
           '16_N_M': ('daggers16-north-native-original-source',),
           'male17-122-north-four-torsos': ('orb17-north-native-layers','orb122-north-native-layers')}


def receivers():
    path = BANK/'index.json'
    content = path.read_bytes() if path.exists() else gzip.decompress(Path(str(path)+'.gz').read_bytes())
    ids = {record for group in ORIGINS.values() for record in group}
    result = {r['id']:r for r in json.loads(content)['records'] if r['id'] in ids}
    if result.keys() != ids:
        raise ValueError('Missing North weapon receiver')
    return result



def moved_head(record, phase, original, editorial, runtime):
    """Recover the one-pixel difference between the original editorial and game rigs."""
    from PIL import Image
    import numpy as np

    direction = record['basePack']['pack']['directions']['north']
    state = record['states'][phase]
    if (state['sourceComposite']['sha256'] == state['approved']['sha256'] or
            original(state['sourceComposite']['sha256']).tobytes() != editorial.tobytes()):
        raise ValueError('The alternate source is not the signed editorial body')
    body = Image.new('RGBA', runtime.size)
    head = body.copy()
    for layer in direction['layers']:
        is_head = layer['slot'] in ('headBase','hair')
        if is_head:
            binding = layer['binding']
            if (binding != {'kind':'rigid','a':'NECK','b':'NOSE'} or
                    any(direction['rest'][j] != direction['poses'][phase][j] for j in ('NECK','NOSE'))):
                raise ValueError('Unexpected receiving head transform')
        elif layer['binding'] != {'kind':'fixed'}:
            raise ValueError('Unexpected body transform')
        key = layer['frames'][phase] if layer.get('frames') else layer['source']
        (head if is_head else body).alpha_composite(original(key))
    # The original base in the game holds the neck still in this phase.
    old_head = Image.new('RGBA', runtime.size)
    old_head.alpha_composite(head,(0,-1))
    source_mask = np.asarray(old_head)[:,:,3] > 0
    dest_mask = np.asarray(head)[:,:,3] > 0
    region = source_mask | dest_mask
    for parts,ref in ((old_head,editorial),(head,runtime)):
        composed = Image.alpha_composite(body,parts)
        if not np.array_equal(np.asarray(composed)[region],np.asarray(ref)[region]):
            raise ValueError('Head transform does not reproduce the original pixels')
    if not np.array_equal(np.asarray(editorial)[~region],np.asarray(runtime)[~region]):
        raise ValueError('Other differences in the receiving pose')
    for layer in state['layers']:
        if layer.get('operation') != 'replace-rgba-under-mask' or np.any(np.asarray(original(layer['mask']['sha256']))[:,:,0][region]):
            raise ValueError('Head registration intersects the weapon')
    return source_mask,dest_mask



def release_editorial_hardware(samples, records, original, rows, assets):
    """Recover fabric hidden by the editorial weapon before fitting the live attachment."""
    from PIL import Image
    import numpy as np

    rig = records['orb17-north-native-layers']['basePack']['pack']['directions']['north']
    for phase in range(8):
        body = Image.new('RGBA', (640, 640))
        for layer in rig['layers']:
            key = layer['frames'][phase] if layer.get('frames') else layer['source']
            offset = (0, 0)
            if layer['slot'] in ('headBase', 'hair'):
                if any(rig['rest'][j] != rig['poses'][phase][j] for j in ('NECK', 'NOSE')):
                    raise ValueError('Unexpected North head pose')
                if phase == 1: offset = (0, -1)
            elif layer['binding']['kind'] != 'fixed':
                raise ValueError('Unregistered North body transform')
            body.alpha_composite(original(key), offset)
        bare = np.asarray(body)
        for coat in sorted(COATS):
            parts = {i: samples[i, coat, phase] for i in (16, 17, 122)}
            changed = {i: np.any(np.asarray(source) != bare, axis=2)
                       for i, (source, _, _, _) in parts.items()}
            for item, (_, fabric, ownership, head_shift) in parts.items():
                raw = np.asarray(fabric)
                keep = np.asarray(ownership) != 0
                pending = keep & changed[item] & (raw[:, :, 3] != 0)
                keep = keep.copy()
                # Prefer the alternate orb on the same editorial rig. The compass
                # contributes ownership only on identical, unobstructed textile.
                for other in (17, 122, 16):
                    if other == item: continue
                    _, donor, mask, _ = parts[other]
                    available = pending & ~changed[other] & np.all(raw == np.asarray(donor), axis=2)
                    keep[available] = np.asarray(mask)[available] != 0
                    pending[available] = False
                # Outside the entire bare silhouette only the historical weapon
                # could hide this signed fabric. Retain its own cut over anatomy.
                keep[pending & (bare[:, :, 3] == 0)] = False
                if head_shift is not None:
                    old_head, head = head_shift
                    under_head = keep & old_head
                    keep[old_head & ~head] = False
                    keep[head] = np.roll(under_head, 1, axis=0)[head]
                rgba = raw.copy()
                rgba[keep] = 0
                out = io.BytesIO()
                Image.fromarray(rgba).save(out, format='PNG', compress_level=9)
                data = out.getvalue()
                key = digest(data)
                assets[key+'.png'] = data
                rows[item]['coats'][coat]['cloth'][phase] = key


def recover():
    from PIL import Image
    import numpy as np
    assets, rows, focus_samples = {}, {}, {}
    records = receivers()
    source_index = json.loads((BANK/'archives/archive-index.json').read_bytes())['sources']
    @lru_cache(maxsize=32)
    def original(key):
        location = source_index[key]
        with zipfile.ZipFile(BANK/'archives'/location['archive']) as bank:
            data = bank.read(location['path'])
        if digest(data) != key: raise ValueError('Changed weapon source')
        return Image.open(io.BytesIO(data)).convert('RGBA')

    for folder, bindings in ORIGINS.items():
        if folder == 'male17-122-north-four-torsos':
            from export_male_dagger_coats import open_package
            archive = open_package(ROOT/'art-approved/weapons'/folder/'parts',
                                   '227ae9eb407bf5189ed71876c25428247d631cf922f9691c31dd746f8721cd43')
            archive_sha = '227ae9eb407bf5189ed71876c25428247d631cf922f9691c31dd746f8721cd43'
        else:
            raw = b''.join(p.read_bytes() for p in sorted((SOURCES/folder).glob('*.zip*')) if p.is_file())
            archive_sha = digest(raw)
            archive = zipfile.ZipFile(io.BytesIO(raw))
        with archive:
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
                    before = original(key)
                    head_shift = None
                    editorial_pose = original(r['states'][phase].get('sourceComposite',{}).get('sha256',key))
                    for coat in sorted(COATS):
                        prefix = next(p for p in (f'frames/{item}/M{coat}/',f'frames/{item}/{coat}/',f'frames/north/M{coat}/')
                                      if p+'0-source.png' in archive.namelist())+str(phase)
                        def read(*suffixes):
                            name = next(prefix+s+'.png' for s in suffixes if prefix+s+'.png' in archive.namelist())
                            return Image.open(io.BytesIO(archive.read(name)))
                        source = read('-source').convert('RGBA')
                        cloth,protected = read('-garment').convert('RGBA'),read('-protected','-ownership')
                        target = read('-frame','').convert('RGBA')
                        if (source.size != (768,768) or any(im.size!=source.size for im in (cloth,protected,target)) or
                                protected.mode != 'L'):
                            raise ValueError(f'Incompatible receiver or mask {item}/{coat}/{phase}')
                        editorial = source.crop(crop)
                        if editorial.tobytes() != before.tobytes():
                            if editorial.tobytes() != editorial_pose.tobytes():
                                raise ValueError('Unregistered editorial frame for this coat')
                            if head_shift is None:
                                head_shift = moved_head(r,phase,original,editorial,before)
                        elif head_shift is not None:
                            raise ValueError('Editorial body differs between coats')
                        mask = np.asarray(protected)
                        if not np.isin(mask,[0,255]).all():raise ValueError('Ambiguous ownership')
                        pixels = np.array(cloth)
                        pixels[mask!=0]=0
                        plate = Image.fromarray(pixels)
                        bbox = plate.getbbox()
                        if (not bbox or bbox[0]<pad or bbox[1]<pad or bbox[2]>pad+width or bbox[3]>pad+height or
                                Image.alpha_composite(source,plate).tobytes()!=target.tobytes()):
                            raise ValueError(f'Garment does not reproduce the approved picture {item}/{coat}/{phase}')
                        plate = plate.crop(crop)
                        if item in (16,17,122):
                            focus_samples[item,coat,phase] = (editorial,cloth.crop(crop),protected.crop(crop),head_shift)
                            row['coats'].setdefault(coat,dict(archive=archive_sha,path=folder,cloth=[]))['cloth'].append(None)
                            continue
                        out = io.BytesIO();plate.save(out,format='PNG',compress_level=9)
                        image = out.getvalue();sha = digest(image);assets[sha+'.png']=image
                        row['coats'].setdefault(coat,dict(archive=archive_sha,path=folder,cloth=[]))['cloth'].append(sha)
    release_editorial_hardware(focus_samples, records, original, rows, assets)
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
