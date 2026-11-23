"""Register owned trouser plates on the eight-frame lateral focus waist."""
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache

from export_staff_coats import BANK, weapons
from register_south_focus_trousers import BASE, OUTFITS, ROOT, index

OUTPUT = ROOT / 'tools/rework-combat-wardrobe/side-focus-trousers.json'


def register():
    import numpy as np
    from PIL import Image, ImageDraw

    sources = {bank: json.loads((bank/'archives/archive-index.json').read_bytes())['sources']
               for bank in (BANK, BASE, OUTFITS)}

    @lru_cache(maxsize=48)
    def pixels(bank, key):
        row = sources[bank][key]
        with zipfile.ZipFile(bank/'archives'/row['archive']) as archive:
            raw = archive.read(row['path'])
        if hashlib.sha256(raw).hexdigest() != key:
            raise ValueError('Changed source ' + key)
        im = Image.open(io.BytesIO(raw)).convert('RGBA')
        if im.size != (640, 640):
            raise ValueError('Unexpected physical frame')
        return np.asarray(im)

    def waist(im, seed):
        m = Image.fromarray((im[:, :, 3] > 0).astype('uint8')).copy()
        if m.getpixel(seed) != 1:
            raise ValueError('Hip is outside the cloth')
        ImageDraw.floodfill(m, seed, 2)
        part = np.asarray(m) == 2
        yy, xx = np.where(part)
        if not (3000 < xx.size < 5100 and np.ptp(xx) < 73 and yy.min() >= 300 and yy.max() <= 412):
            raise ValueError('Waist intersects other anatomy')
        return part

    def fit(im, part, foot):
        # The near wrist cuts a hole in the original punch shorts at rest.
        # Measure the waist on both sides and the sole below the hand.
        x = np.flatnonzero(part[335])
        center = (x.min()+x.max())/2
        inner = np.arange(round(center)-8, round(center)+9)
        navy = (im[:,:,2].astype(int)>im[:,:,0].astype(int)) & part
        y = np.median([np.flatnonzero(navy[:,i])[0] for i in inner if navy[:,i].any()])
        y_foot,x_foot = np.nonzero(foot[494:,:,3])
        if x_foot.size < 160 or len(x)<35:
            raise ValueError('Incomplete waist or foot')
        return [int(x.min()),int(x.max()),float(y),float((x_foot.max()+x_foot.min())/2),int(y_foot.max()+494)]

    outfits = index(OUTFITS)
    records = {r['id']:r for r in outfits['records']}
    bases = {r['id']:r for r in index(BASE)['records']}
    staff = weapons()['orderedAttackProfiles']
    output = {}
    for direction in ('east','west'):
        ref = outfits['maleSidePunchOwnPants']['directions'][direction]
        base = bases[ref['baseId']]
        native = base['pack']['directions'][direction]
        if base['sourcePackSHA256'] != ref['baseSHA'] or native['clip']['frames'] != 8:
            raise ValueError('Changed original trouser donor')
        items = {k:dict(source=ref['baseId']+'/pants'+k,cloth=[v]*8,replace=True) for k,v in ref['items'].items()}
        for n in (21,22,133):
            name = f'male-pants{n}-attack-unarmed-{direction}' + ('-drawn8-candidate' if n==133 else '')
            row = records[name]
            layer, = [l for l in row['pack']['directions'][direction]['layers'] if l['id'].startswith('pants'+str(n)+'-')]
            if row['equipment']!={'pants':n} or layer['slot']!='pants' or layer['binding']!={'kind':'fixed'}:
                raise ValueError('Unowned material '+name)
            # Items 21/22 extend the stock shorts. Their punch contact frames
            # also contain a hand-shaped patch on the hip. Use the registered
            # standing-leg frames with the hand raised for those two states.
            panels = [layer['source']]*8 if n==133 else [layer['frames'][min(6,max(1,f))] for f in range(8)]
            items[str(n)] = dict(source=name+'/'+layer['id'],cloth=panels,replace=False)
        if len(items)!=10 or len({i['cloth'][0] for i in items.values()})!=10:
            raise ValueError('Expected ten independent originals')
        phases=[]
        signed=next(r for r in staff if r['id']=='authored-ordered-31-'+direction)
        if signed['nativeCanvas']!=[640,640] or signed['pivot']!=[80,128] or signed['fps']!=12:
            raise ValueError('Unexpected receiving frame or clock')
        lower={l['id']:l for l in native['layers']}
        for f,state in enumerate(signed['states']):
            layers={l['id']:l for l in state['layers']}
            keys=[layers[k]['sha256'] for k in ('shorts','legs','underbody')]
            im=pixels(BANK,keys[0])
            part=waist(im,(320,365))
            donor_phase=min(6,max(1,f))
            original=pixels(BASE,lower['shorts-phase']['frames'][donor_phase])
            sx=345 if direction=='east' else 294
            donor=fit(original,waist(original,(sx,365)),pixels(BASE,lower['skin-arms-phase']['frames'][donor_phase]))
            target=fit(im,part,pixels(BANK,keys[1]))
            left,right,y,foot,bottom=donor
            a=(target[1]-target[0])/(right-left)
            d=(target[4]-target[2])/(bottom-y)
            shear=(target[3]-a*foot-(target[0]-a*left))/(bottom-335)
            if not (.89<a<1.22 and .94<d<1.06 and abs(shear)<.1):
                raise ValueError('Unregistered waist/sole displacement')
            runs=np.flatnonzero(np.diff(np.r_[False,part.ravel(),False])).reshape(-1,2)
            phases.append(dict(stock=keys[0],legs=keys[1],underbody=keys[2],
                               cut=[[int(start),int(stop-start)] for start,stop in runs],
                               donor=donor,receiver=target,
                               transform=[a,0,shear,d,target[0]-a*left-shear*335,target[2]-d*y]))
            for n,cloth in items.items():
                yy,xx=np.where(pixels(OUTFITS,cloth['cloth'][f])[:,:,3]>0)
                if yy.min() < (394 if n in ('21','22') else 305) or yy.max()>493 or xx.min()<246 or xx.max()>392:
                    raise ValueError('Panel contains foreign anatomy '+n)
        output[direction]=dict(source=signed['id'],items=items,phases=phases)
    return output


if __name__ == '__main__':
    content=json.dumps(register(),separators=(',',':'))+'\n'
    if '--verify' in sys.argv:
        if OUTPUT.read_text(encoding='utf8')!=content: raise ValueError('Stale lateral trouser registration')
    else:
        OUTPUT.write_text(content,encoding='utf8')
