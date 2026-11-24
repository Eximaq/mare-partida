"""Register original North trousers on the shared, stationary rifle pelvis."""
import gzip
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANKS = [ROOT / 'tools' / n for n in ('rework-base-hd','rework-modular-outfits-hd','rework-weapon-layers-hd')]
OUTPUT = ROOT / 'tools/rework-combat-wardrobe/north-rifle-trousers.json'
BACK = '23937c63990a9f1d47ecad3d695bb18525e9fda4a275d13899cf428f53055233'


def register():
    import numpy as np
    from PIL import Image
    def index(bank):
        path = bank / 'index.json'
        return json.loads(path.read_bytes() if path.is_file() else gzip.decompress(Path(str(path)+'.gz').read_bytes()))
    bodies, outfits, weapons = map(index, BANKS)
    locations = [json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in BANKS]

    @lru_cache(maxsize=40)
    def original(key):
        for bank, lookup in zip(BANKS, locations):
            if key in lookup:
                row = lookup[key]
                with zipfile.ZipFile(bank/'archives'/row['archive']) as z:
                    data = z.read(row['path'])
                if hashlib.sha256(data).hexdigest() != key:
                    raise ValueError('Changed original layer ' + key)
                return Image.open(io.BytesIO(data)).convert('RGBA')
        raise KeyError(key)

    def runs(mask):
        indices = np.flatnonzero(np.diff(np.r_[False,mask.reshape(-1),False])).reshape(-1,2)
        return [[int(a),int(b-a)] for a,b in indices]

    q = outfits['malePunchOwnPantsCardinal']['cardinals']['north']
    base = next(b for b in bodies['records'] if b['id'] == q['baseId'])
    d = base['pack']['directions']['north']
    if base['sourcePackSHA256'] != q['baseSHA'] or base['pack']['pivot'] != {'x':80,'y':128}:
        raise ValueError('Unexpected punch receptor')
    skin, shorts = d['layers'][:2]
    if [l['id'] for l in [skin, shorts]] != ['skin-arms-phase','shorts-phase'] or any(l['binding']['kind'] != 'fixed' for l in (skin,shorts)):
        raise ValueError('Unexpected stock lower anatomy')
    skin, shorts = (original(l['frames'][0]) for l in (skin, shorts))
    native = np.asarray(original(BACK))
    backing = np.asarray(Image.alpha_composite(skin, shorts))
    stock = np.array(shorts)[:,:,3] > 0
    if np.any(np.asarray(skin)[:,:,3][stock]) or np.any(native[370:] != backing[370:]):
        raise ValueError('The clear cut crosses recipient skin or different legs')
    delta = np.argwhere(np.any(native!=backing,2) & stock)
    if delta.tolist() != [[348,379]] or native[348,379,3]:
        raise ValueError('Different receiving waistband')
    cloth = {int(item):dict(source=q['baseId']+'/pants'+item, sha=key, replace=True) for item,key in q['items'].items()}
    # These two approved outfits draw a garment over the original shorts.
    # Phase zero has the same shorts and the same legs as the stationary rifle.
    for item, record in [(22,'male-pants22-attack-unarmed-north'),(133,'male-pants133-attack-unarmed-north-drawn8-candidate')]:
        r = next(r for r in outfits['records'] if r['id']==record)
        direction = r['pack']['directions']['north']
        if r['equipment'] != {'pants':item} or direction['layers'][:2] != d['layers'][:2]:
            raise ValueError('Moved or ambiguous trouser donor ' + record)
        owned = [l for l in direction['layers'] if l['id'].startswith('pants'+str(item)+'-')]
        if len(owned)!=1 or owned[0]['binding']!={'kind':'fixed'} or owned[0]['depth']<=d['layers'][1]['depth']:
            raise ValueError('Missing owned fixed trouser plate ' + record)
        layer = owned[0]
        cloth[item] = dict(source=record+'/'+layer['id'],sha=layer.get('frames',[layer.get('source')])[0],replace=False)
    if len(cloth)!=9 or len({v['sha'] for v in cloth.values()})!=9:
        raise ValueError('Incomplete North garments')
    extent = np.zeros(stock.shape, dtype=bool)
    for row in cloth.values():
        image = original(row['sha'])
        if image.size != (640,640) or image.getbbox()[1] < 300 or image.getbbox()[3] > 512:
            raise ValueError('Invalid owned trouser extent')
        extent |= np.asarray(image)[:,:,3]>0
    foot_box = np.zeros(stock.shape,dtype=bool)
    foot_box[380:540,235:409] = True
    if np.any(native[foot_box] != backing[foot_box]):
        raise ValueError('Receiving feet differ from the source of the boots')
    head, hair = d['layers'][2:4]
    if [head['slot'],hair['slot']] != ['headBase','hair'] or any(l['binding'] != {'kind':'rigid','a':'NECK','b':'NOSE'} for l in (head,hair)):
        raise ValueError('Unexpected rear head registration')
    if any(d['rest'][joint]!=d['poses'][0][joint] for joint in ('NECK','NOSE')):
        raise ValueError('Receiving neck differs')
    scalp, fringe = (np.asarray(original(l['source'])) for l in (head,hair))
    hair_owned = fringe[:,:,3] > 0
    clear_head = native.copy()
    clear_head[hair_owned] = scalp[hair_owned]
    exposed = (scalp[:,:,3]>0) & ~hair_owned
    if (not np.isin(fringe[:,:,3],[0,255]).all() or np.any(scalp[exposed]!=native[exposed]) or
            np.any(np.asarray(skin)[:,:,3][hair_owned]) or
            np.any(np.asarray(Image.alpha_composite(Image.fromarray(clear_head),Image.fromarray(fringe)))!=native)):
        raise ValueError('The original head does not reconstruct the receiving backing')
    head_mask = 'dbd4bd96d42aec8e29e1ff8c71e0e54f3c3805652b3aac0cb3264e46a86dd29b'
    poses = {}
    for r in weapons['records']:
        if r['body'] != 'male' or r['direction'] != 'north' or not any(l['sha256']==BACK for l in r['states'][0]['layers']):
            continue
        if r['replacementMode']!='atomic-arms-weapon-hands-body' or len(r['states'])!=3 or r['fps']!=24:
            raise ValueError('Unexpected recoil clock '+r['id'])
        for state in r['states']:
            layers=state['layers']
            if [l['role'] for l in layers]!=['arms','weapon','hands','body-occluder'] or layers[-1]['sha256']!=BACK:
                raise ValueError('Unexpected receiver order')
            if any(l['depth']!=i or l['operation']!='source-over' or l['size']!=[640,640] or l.get('offset') or l.get('mask') or l.get('mirrorX') for i,l in enumerate(layers)):
                raise ValueError('Unregistered weapon transformation')
            if layers[-1]['paletteMask']['sha256'] != head_mask:
                raise ValueError('Unexpected backing materials')
            if any(extent.flat[pixel] or stock.flat[pixel] or hair_owned.flat[pixel] for pixel,*rest in state.get('canvasRoundingPatch',[])):
                raise ValueError('Rounding correction intersects garment')
            foreign = np.logical_or.reduce([np.asarray(original(l['sha256']))[:,:,3]>0 for l in layers[:3]])
            if np.any(foreign & foot_box):
                raise ValueError('Rifle crosses the registered feet')
            if np.any(foreign & stock):
                raise ValueError('Stock shorts cut would erase another layer')
            # Protect visible fingers, arms and metal when a loose piece widens
            # the silhouette. No unrelated layer is sampled from the donor.
            key='/'.join(l['sha256'] for l in layers)
            poses[key]=runs(foreign & extent & (native[:,:,3]<255))
    if not poses:
        raise ValueError('No compatible rifle')
    return dict(receiver=BACK,baseId=q['baseId'],donor=q['baseSHA'],head=dict(skull=head['source'],hair=hair['source'],materials=head_mask),footBounds=[235,380,409,540],clear=runs(stock & (native[:,:,3]>0)),items=cloth,poses=poses)


if __name__=='__main__':
    data=json.dumps(register(),separators=(',',':'))+'\n'
    if '--verify' in sys.argv:
        if OUTPUT.read_text(encoding='utf8')!=data:
            raise ValueError('Rifle registration differs from its sources')
    else:
        OUTPUT.write_text(data,encoding='utf8')
