"""Bind individual rifle and pistol passes to the native firearm rigs."""
from collections import Counter
import hashlib
import io
import json
from pathlib import Path
import struct
import zipfile

DIGESTS = {
    'fuzil113-ns': 'cdd9889e5d96f92f826536779298fa86b9af0e0b52f2af2af41ac382a0087377',
    'pistolas114-laterais': 'c21e95336154c31508dffbebdff65c5703cff1b8499b9da8cfbb9310acf86fc0',
}


def materialize(checkpoint, bank, native):
    fits = json.loads((Path(__file__).parent / 'rework-combat-wardrobe/firearm-hand-registration.json').read_bytes())
    rows, rigs, assets = [], {}, set()
    for direction in ('south', 'east', 'west'):
        south = direction == 'south'
        name = 'fuzil113-ns' if south else 'pistolas114-laterais'
        data = (checkpoint / (name + '.zip')).read_bytes()
        if hashlib.sha256(data).hexdigest() != DIGESTS[name]:
            raise ValueError('Changed approved firearm source ' + name)
        rig = next(r for r in native if r['id'] == f'v7-female-firearm-{direction}-ownership-candidate-{direction}')
        pack = rig['pack']
        d = pack['directions'][direction]
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            def read(key):
                return json.loads(z.read(name + '/' + key + '.json'))

            catalog = read('catalog')
            if south:
                donor = catalog['originals']['south']
                if (donor['nativeCanvas'] != [640,640] or donor['pivot'] != [pack['pivot'][k] for k in ('x','y')]
                        or donor['density'] != pack['density'] or donor['fps'] != d['clip']['fps']
                        or donor['timeline'] != [str(i) for i in range(d['clip']['frames'])]):
                    raise ValueError('South rifle clock or registration changed')
                canonical = donor['states']
            else:
                donor = read('canonical-' + direction)['pack']
                q = donor['directions'][direction]
                if (not read('VERIFIED')['allMirrorsRGBAExact'] or q['rest'] != d['rest'] or q['clip'] != d['clip']
                        or any(pack[k] != donor[k] for k in ('density','frame','pivot'))):
                    raise ValueError('Lateral rifle rig changed')
                for a,b in zip(q['poses'], d['poses'], strict=True):
                    if a.keys() != b.keys():
                        raise ValueError('Lateral rifle joint set changed')
                    for key,p in a.items():
                        if p == b[key]:
                            continue
                        if (direction != 'east' or key.split('_')[0] not in ('RIGHT','LEFT') or
                                abs(p['x'] + b[key]['x'] - 2 * pack['pivot']['x']) > 1e-6 or p['y'] != b[key]['y']):
                            raise ValueError('Lateral rifle joint registration changed')
                canonical = q['layers']

            calibration = fits[direction]
            for i, pair in enumerate(calibration):
                for j, registration in enumerate(pair):
                    donor_hash = (next(l['sha256'] for l in canonical[i]['layers'] if l['id']=='hands') if south
                                  else canonical[(15,17)[j]]['frames'][i])
                    target = next(l for l in d['layers'] if l['id'] == registration['side']+'-hand')
                    if donor_hash != registration['source'] or target['frames'][i] != registration['target']:
                        raise ValueError('Firearm hand fit belongs to another source')
            rigs['attack-firearm/'+direction] = dict(id=rig['id'],digest=rig['sourcePackSHA256'])
            def add(slot,item,parts):
                layers=[]
                for order,(role,depth,frames,hand) in enumerate(parts):
                    if len(frames)!=8:
                        raise ValueError('Incomplete firearm phase track')
                    for h in set(frames)-assets:
                        pixels=z.read(name+'/assets/'+h+'.png')
                        if (hashlib.sha256(pixels).hexdigest()!=h or pixels[:8]!=bytes.fromhex('89504e470d0a1a0a')
                                or struct.unpack('>II',pixels[16:24])!=(640,640)):
                            raise ValueError('Changed firearm raster '+h)
                        (bank/(h+'.png')).write_bytes(pixels)
                        assets.add(h)
                    layer=dict(id=f'firearm-{direction}-{slot}-{item}-{role}',depth=depth,slot='foreground',
                               source=frames[0],frames=frames,binding={'kind':'fixed'},sourceStackIndex=order)
                    if hand is not None:
                        layer['firearmHands']=[[{'box':s['box'],'offset':s['offset']} for j,s in enumerate(pair)
                                                if hand=='both' or hand==j] for pair in calibration]
                    layers.append(layer)
                rows.append(dict(action='attack-firearm',direction=direction,slot=slot,item=item,layers=layers))

            if south:
                for row in catalog['southVariants']:
                    slot=row['slot']
                    add(slot,row['item'],[(p['part'],.75 if slot=='pants' else .55 if 'front' in p['part'] else -.1,
                                           [p['sha256']]*8,None) for p in row['parts']])
                for row in catalog['southGloves']:
                    add('gloves',row['item'],[('hands',6.1,[p['sha256'] for p in row['frames']],'both')])
                def frames(layer):
                    return [next(l['sha256'] for l in state['layers'] if l['id']==layer) for state in canonical]
                add('gloves',166,[('hands',6.1,frames('glove166'),'both')])
                add('torso',151,[('rear',-.2,frames('coat-rear'),None),('front',.9,frames('garment151'),None)])
            else:
                for key,parts in catalog.items():
                    di,slot,index=key.split('/')
                    if di!=direction:
                        continue
                    if slot=='gloves':
                        if parts['16']!=parts['22'] or parts['18']!=parts['24']:
                            raise ValueError('Editable duplicate hand pass changed')
                        own=[(str(j),3.1 if calibration[0][j]['side']=='left' else 6.1,parts[n],j)
                             for j,n in enumerate(('16','18'))]
                    elif slot=='boots' and set(parts)=={'2','4'}:
                        own=[('rear',-.1,parts['2'],None),('front',.55,parts['4'],None)]
                    elif slot=='pants' and set(parts)=={'5'}:
                        own=[('legs',.75,parts['5'],None)]
                    else:
                        raise ValueError('Unknown lateral pass '+key)
                    add(slot,int(index),own)
    for di in ('south','east','west'):
        if Counter(r['slot'] for r in rows if r['direction']==di)!=dict(pants=10,boots=10,gloves=10,**({'torso':1} if di=='south' else {})):
            raise ValueError('Incomplete firearm wardrobe '+di)
    return rows,rigs,assets
