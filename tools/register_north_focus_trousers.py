"""Recover original trouser material for the authenticated eight-frame rear focus pose."""
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache
from pathlib import Path

from register_south_focus_trousers import BASE, OUTFITS, ROOT, index

WEAPONS = ROOT / 'tools/rework-weapon-layers-hd'
OUTPUT = ROOT / 'tools/rework-combat-wardrobe/north-focus-trousers.json'
RESTORED_STOCK = {
    ('focus', 0): 'bb94bb7c0081fc93dd65e54133d65df76cebea83fc1b81af2ecc42c4895e82f2',
    ('sword', 3): 'cb51d1e4f7ecd753ff32fccb68f0dbc96ea467ba101bb96225d8281457c9f958',
}


def register():
    import numpy as np
    from PIL import Image, ImageDraw
    banks = {bank: json.loads((bank/'archives/archive-index.json').read_bytes())['sources']
             for bank in (BASE, OUTFITS, WEAPONS)}

    @lru_cache(maxsize=36)
    def pixels(key):
        bank = next(b for b, rows in banks.items() if key in rows)
        row = banks[bank][key]
        with zipfile.ZipFile(bank/'archives'/row['archive']) as archive:
            data = archive.read(row['path'])
        if hashlib.sha256(data).hexdigest() != key:
            raise ValueError('Unregistered image ' + key)
        image = Image.open(io.BytesIO(data)).convert('RGBA')
        if image.size != (640, 640): raise ValueError('Invalid physical size')
        return np.asarray(image)

    def stock_component(rgba):
        mask = Image.fromarray((rgba[:, :, 3] != 0).astype('uint8')).copy()
        if mask.getpixel((300, 353)) != 1: raise ValueError('Missing waist')
        ImageDraw.floodfill(mask, (300, 353), 2)
        part = np.asarray(mask) == 2
        yy, xx = np.where(part)
        if not (6500 < part.sum() < 9000 and yy.min() > 300 and yy.max() < 425 and xx.min() > 265 and xx.max() < 375):
            raise ValueError('Invalid trouser component')
        return part

    def fit(stock, foot):
        seam = int(np.nonzero(stock)[0].min())
        feet = foot[:, :, 3] != 0
        y, x = np.where(feet[495:])
        left, right = (x[x<320], x[x>=320])
        if len(left) < 100 or len(right) < 100: raise ValueError('Both feet must be present')
        return [round((left.min()+left.max())/2, 2), round((right.min()+right.max())/2, 2), seam, int(495+y.max())]

    def runs(part):
        edges = np.flatnonzero(np.diff(np.r_[False, part.ravel(), False])).reshape(-1, 2)
        return [[int(a),int(b-a)] for a,b in edges]

    outfit = index(OUTFITS)
    bodies = {r['id']: r for r in index(BASE)['records']}
    ref = outfit['malePunchOwnPantsCardinal']['cardinals']['north']
    donor = bodies[ref['baseId']]
    if donor['sourcePackSHA256'] != ref['baseSHA']: raise ValueError('Changed donor anatomy')
    def layers(body):
        pack = body['pack']
        d = pack['directions']['north']
        if pack['density'] != 4 or pack['frame'] != {'width':160,'height':160} or pack['pivot'] != {'x':80,'y':128} or d['clip']['frames'] != 8 or d['clip']['fps'] != 12:
            raise ValueError('Unexpected frame or clock')
        return {l['id']:l for l in d['layers']}

    dl = layers(donor)
    items = {n:dict(source=ref['baseId']+'/pants'+n, cloth=[key]*8) for n,key in ref['items'].items()}
    for n, record in ((21,'male-pants21-attack-unarmed-north'),(22,'male-pants22-attack-unarmed-north'),
                      (133,'male-pants133-attack-unarmed-north-drawn8-candidate')):
        row = next(r for r in outfit['records'] if r['id'] == record)
        if row['equipment'] != {'pants':n}: raise ValueError('Mixed trouser donor')
        textile, = [l for l in layers(row).values() if l['id'].startswith('pants'+str(n)+'-')]
        if textile['slot'] != 'pants' or textile['binding'] != {'kind':'fixed'}: raise ValueError('Non-owned trouser panel')
        items[str(n)] = dict(source=record+'/'+textile['id'],cloth=textile['frames'] if 'frames' in textile else [textile['source']]*8)
    if len(items)!=10 or len({v['cloth'][0] for v in items.values()})!=10: raise ValueError('Expected ten distinct garments')
    def mount(family):
        receiver = bodies['v7-' + family + '-north-modular8-north']
        rl = layers(receiver)
        phases = []
        for f in range(8):
            stock = rl['shorts']['frames'][f]
            cloth = pixels(stock)
            cut = stock_component(cloth)
            variants = [stock]
            alternate = RESTORED_STOCK.get((family, f))
            if alternate:
                restored = pixels(alternate)
                if not np.array_equal(cloth[cut],restored[cut]) or not np.array_equal(cut,stock_component(restored)):
                    raise ValueError('Palm correction intersects trousers')
                variants.append(alternate)
            src = fit(stock_component(pixels(dl['shorts-phase']['frames'][f])),pixels(dl['skin-arms-phase']['frames'][f]))
            dest = fit(cut,pixels(rl['legs']['frames'][f]))
            sx=(dest[1]-dest[0])/(src[1]-src[0]);sy=(dest[3]-dest[2])/(src[3]-src[2])
            if not (.85<sx<1.1 and .95<sy<1.1): raise ValueError('Unexpected waist/foot transform')
            phases.append(dict(stock=variants,legs=rl['legs']['frames'][f],underbody=rl['underbody']['frames'][f],cut=runs(cut),
                               transform=[sx,0,0,sy,dest[0]-sx*src[0],dest[2]-sy*src[2]],donorFit=src,receiverFit=dest))
            for item in items.values():
                fabric = pixels(item['cloth'][f])
                y,x=np.nonzero(fabric[:,:,3])
                if y.min()<295 or y.max()>520 or x.min()<220 or x.max()>420: raise ValueError('Trouser material exceeds its own garment')
        return dict(source=receiver['id'],bodySHA=receiver['sourcePackSHA256'],phases=phases)

    result = mount('focus')
    result['items'] = items
    result['bladeReceivers'] = {family:mount(family) for family in ('sword','daggers')}
    return result


if __name__ == '__main__':
    result=json.dumps(register(),separators=(',',':'))+'\n'
    if '--verify' in sys.argv:
        if OUTPUT.read_text(encoding='utf8')!=result: raise ValueError('Stale North waist registration')
    else:
        OUTPUT.write_text(result,encoding='utf8')
