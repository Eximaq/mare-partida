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

    def runs(mask):
        edges=np.flatnonzero(np.diff(np.r_[False,mask.ravel(),False])).reshape(-1,2)
        return [[int(a),int(b-a)] for a,b in edges]

    def fused_waist(lower, actual, cut, direction):
        # The signed body supplies the open palm or the bent grip. Compare it
        # to its own unobstructed stock/legs, never to a neighboring garment.
        y,x=np.indices((640,640))
        area=(y>=302)&(y<=500)&(x>=244)&(x<=395)
        diff=np.max(np.abs(actual.astype('int16')-lower.astype('int16')),axis=2)>2
        protect=diff&area
        if np.any(protect & (y>=380)) or not 450<protect.sum()<5500:
            raise ValueError('Different lower rig below receiving hands: '+direction)
        return dict(guard=runs(protect),restore=runs(cut&~protect))

    outfits = index(OUTFITS)
    records = {r['id']:r for r in outfits['records']}
    bases = {r['id']:r for r in index(BASE)['records']}
    sources_weapons = weapons()
    staff = sources_weapons['orderedAttackProfiles']
    staff128_light = ["94b5506ea2c9d0340e16bd3269d1058eec0b3d7dabf59a061323ac73a720fca0","e0707dea2a9acc262a12d1b910cc81ce71a5c1b15b95b320b9bb3e57609707c3","9bcd8f0a8451b22598cef02ab0f9ecec54e65eb7623320bff9536b874b3f977e","6e72330d4a1ddb28f948f84a7e5fefaa46a8a89637c6fda843c36b4a76523501","37c4b332b83bb883d2e7d7e8218e0cfe18addc7a3d6784f6676c57e2d4eaf092","f2ac9d28b271ab23ca26692dbfca5d5f73e956de7b9105b516b3783f980ed1d5","dc5316ed050bbf561a8fb664c39619872e60afafc84dd5a0ffc6f2cd6f7a6870","f51cf31d9173dea1f38c10d159d0b7ded22bcf9c44b0bbbe07159274d7f63f95"]
    scepter_light=["80d4b0e44b1f34c7be8aa8be7bbd65ff2308033285b35641c09e1de5dc306742","876091f363321cdd3b9b757c808c8f736332a9cd4bf6fe4e545452cd8febbe50","c9e4d8f12eeb01826e3213ecad379ef6a77f4e95c6cc98515b13357839adc7ef","a1f30d41937abc4beec2a072442a8faddc06a38b65fa5ba7cc9827a855bda827","9859fc0d6f4436e33e0f08b9a0c38370f77624e86dfb6e883d9abf154fb33d6b","3f81242096bf40024ed5b411bcb1174f59f02c39a522938f875327c20a33c353","567a50cd3a78ffcaeec9fc80820711dff919edf8d164dfaa699ea700306ad6e9","d78738d632d06c533a72e0caecd08d1d6bd50a20f0abb9773d17ab79b247241b"]
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
        modular=next(r for r in sources_weapons['records'] if r['id']=='orb17-'+direction+'-native-layers')['basePack']['pack']['directions'][direction]
        layers_mod={l['id']:l for l in modular['layers']}
        if modular['clip']['frames']!=8 or layers_mod['shorts']['depth']!=7:
            raise ValueError('Unexpected arm/waist stack')
        orbs=[next(r for r in staff if r['id']==f'authored-orb-{n}-'+direction) for n in (17,122)]
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
            shared = {name:layers_mod[name]['frames'][f] for name in ('underbody','legs','torso','shorts','upper-arm-far','forearm-hand-far','upper-arm-near','forearm-hand-near')}
            if shared['legs']!=keys[1] or shared['underbody']!=keys[2]: raise ValueError('Different lower-body drawings')
            raw=Image.new('RGBA',(640,640))
            for name in ('underbody','torso','legs','shorts'):
                raw.alpha_composite(Image.fromarray(pixels(BANK,layers[name]['sha256'])))
            bodykeys=[next(l['sha256'] for l in r['states'][f]['layers'] if l['id']=='body') for r in orbs]
            if bodykeys[0]!=bodykeys[1]: raise ValueError('Orbs do not share a waist')
            orb=fused_waist(np.asarray(raw),pixels(BANK,bodykeys[0]),part,direction)
            full=pixels(BANK,staff128_light[f])
            bent=fused_waist(np.asarray(raw),full[:,::-1] if direction=='west' else full,part,direction)
            scepter_body=pixels(BANK,scepter_light[f])
            scepter=fused_waist(np.asarray(raw),scepter_body[:,::-1] if direction=='west' else scepter_body,part,direction)
            phases.append(dict(stock=keys[0],modular=shared,orb={**orb,'body':bodykeys[0]},bent=bent,scepter=scepter,legs=keys[1],underbody=keys[2],
                               cut=runs(part),
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
