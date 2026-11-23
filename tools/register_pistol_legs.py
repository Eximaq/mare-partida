"""Bind the existing punch leg plates to the signed pistol's three stationary lower rigs."""
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache

from register_south_focus_trousers import BASE, OUTFITS, ROOT, index
from export_staff_coats import BANK

DIR=ROOT/'tools/rework-combat-wardrobe'
OUT=DIR/'pistol-legs.zip'


def generate():
    import numpy as np
    from PIL import Image
    rows={b:json.loads((b/'archives/archive-index.json').read_bytes()) for b in (BASE,OUTFITS,BANK)}
    native={r['id']:r for r in index(BASE)['records']}
    outfits={r['id']:r for r in index(OUTFITS)['records']}
    source=(ROOT/'player-rework-native-hd.js').read_text(encoding='utf8')
    def table(name):
        return json.JSONDecoder().raw_decode(source.split('const '+name+'=',1)[1])[0]
    lateral=table('maleLateralPunchBootOwn')
    back=table('maleExtraNorthPunchOwn')
    north=json.loads((DIR/'north-rifle-trousers.json').read_bytes())['items']
    sides=json.loads((DIR/'side-focus-trousers.json').read_bytes())
    pistol=rows[BANK]['pistolWardrobe']
    @lru_cache(maxsize=120)
    def image(h):
        for b,archive in rows.items():
            if h in archive['sources']:
                row=archive['sources'][h]
                with zipfile.ZipFile(b/'archives'/row['archive']) as z:
                    raw=z.read(row['path'])
                if hashlib.sha256(raw).hexdigest()!=h:raise ValueError('Changed garment '+h)
                im=Image.open(io.BytesIO(raw)).convert('RGBA')
                if im.size!=(640,640):raise ValueError('Wrong native leg coordinates')
                return im
        raise KeyError(h)
    files={}
    def emit(data):
        tile=Image.fromarray(data) if isinstance(data,np.ndarray) else data
        box=tile.getbbox()
        if not box:return None
        stream=io.BytesIO()
        tile.crop(box).save(stream,format='PNG')
        raw=stream.getvalue();h=hashlib.sha256(raw).hexdigest()
        files[h+'.png']=raw
        return [h,*box[:2]]
    def runs(mask):
        spans=np.flatnonzero(np.diff(np.r_[False,mask.ravel(),False])).reshape(-1,2)
        return [[int(a),int(b-a)] for a,b in spans]
    y,x=np.indices((640,640))
    fitted={}
    for direction in ('north','east','west'):
        proof=pistol['directions'][direction]
        rig=native[f'v7-punch-{direction}-drawn8-{direction}']
        anatomy=rig['pack']['directions'][direction]['layers'][:2]
        skin,shorts=[image(l['frames'][0]) for l in anatomy]
        bare=np.asarray(Image.alpha_composite(skin,shorts))
        if proof['fps']!=12 or list(map(int,proof['timeline']))!=list(range(8)):raise ValueError('Changed pistol clock')
        sources=proof['poseSourceSHA256']
        base=np.asarray(image(sources[7]))
        if np.any(np.abs(base[442:].astype(int)-bare[442:].astype(int))>2):raise ValueError('Different punch sole '+direction)
        template=proof['slots']['pants']['21']
        def sample(f):
            panel=template[f]['front']
            if len(panel)!=1:raise ValueError('Unknown fitted waist')
            return np.asarray(image(panel[0]))
        clean21=sample(7)
        items={}
        if direction=='north':clothes={k:(v['source'],v['sha'],v['replace']) for k,v in north.items()}
        else:clothes={k:(v['source'],v['cloth'][3],v['replace']) for k,v in sides[direction]['items'].items() if k!='21'}
        for k,(origin,h,replace) in clothes.items():
            items['pants'+k]=dict(origin=origin,sources=[h],replace=replace,phases=[])
        for k in (8,134,141,148,155,162,169,176,183):
            key=str(k)
            if direction!='north':
                boot=lateral[key][direction];origin=boot['donor'];parts=boot['fit']
                for layer,digest in boot['pins']:
                    original=next(l for l in outfits[origin]['pack']['directions'][direction]['layers'] if l['id']==layer)
                    if (original.get('frames') or [original['source']]*16)[boot['frame']]!=digest:raise ValueError('Changed original boot')
            elif key in back:
                parts=[];origins=[]
                for layer,record,f,h,fit in back[key]:
                    model=outfits[record]
                    own=next(l for l in model['pack']['directions'][direction]['layers'] if l['id']==layer)
                    if (own.get('frames') or [own.get('source')]*16)[f]!=h:raise ValueError('Changed rear boot')
                    parts.append((layer,fit,-1 if '-rear' in layer else 2.5));origins.append(record)
                origin='+'.join(dict.fromkeys(origins))
            else:
                origin='male-pants133-attack-unarmed-north-drawn8-candidate-boots148-isolated-candidate'
                parts=[(l['id'],(l.get('frames') or [l.get('source')])[0],l['depth']) for l in outfits[origin]['pack']['directions']['north']['layers'] if l['id'].startswith('boot148-')]
            rear,front=Image.new('RGBA',(640,640)),Image.new('RGBA',(640,640))
            for layer,h,depth in sorted(parts,key=lambda p:p[2]):
                (rear if depth<0 else front).alpha_composite(image(h))
            ink=(np.asarray(rear)[:,:,3]>0)|(np.asarray(front)[:,:,3]>0)
            if ink[:365].any() or ink.sum()<200:raise ValueError('Invalid sole ownership')
            trim=np.zeros_like(ink)
            for start,stop in ([(0,320),(320,640)] if direction=='north' else [(0,640)]):
                for j in range(478,519):
                    span=np.flatnonzero(ink[j,start:stop])
                    if len(span):
                        foot=bare[j,start:stop,3]>0;foot[span[0]:span[-1]+1]=False
                        trim[j,start:stop]=foot
            row=dict(front=emit(front),rear=emit(rear),cut=runs(trim))
            items['boots'+key]=dict(origin=origin,sources=[p[1] for p in parts],phases=[row]*8)

        phases=[]
        def waist_offset(actual):
            # Match the belt and both upper trouser fields of the signed pistol 21.
            # Missing foreground fragments must not bias the fit toward the moving guns.
            cy,cx=np.where((clean21[:,:,3]>225)&(y>=315)&(y<=373))
            cy,cx=cy[::4],cx[::4];original=clean21[cy,cx,:3].astype(int)
            best=None
            for dy in range(-5,6):
                for dx in range(-7,8):
                    probe=actual[cy+dy,cx+dx];ok=probe[:,3]>225
                    if ok.sum()<100:continue
                    err=np.abs(probe[ok,:3].astype(int)-original[ok]).max(axis=1)
                    score=(float(np.mean(np.minimum(err,40))),abs(dx)+abs(dy))
                    if best is None or score<best[0]:best=(score,dx,dy)
            if best is None:raise ValueError('No signed trouser match')
            return best[1:]
        for f,approved in enumerate(sources):
            body=np.asarray(image(approved));ref21=sample(f);dx,dy=waist_offset(ref21)
            # The feet and shins are identical. Only the upper cloth follows the recoil.
            weight=np.clip((435-y)/55,0,1)
            ix=np.rint(x-dx*weight).astype(int).clip(0,639)
            iy=np.rint(y-dy*weight).astype(int).clip(0,639)
            if np.any(np.abs(body[442:].astype(int)-bare[442:].astype(int))>2):raise ValueError('Unrelated leg '+direction)
            clean=base[iy,ix];rgba=body.astype(int)
            region=(y>=301)&(y<442)&(x>=232)&(x<409)
            # The pinned 21 plate is a native occlusion witness for the hand,
            # barrel and trigger. Its transparent cuts remain in front of other
            # fabrics. Outside its silhouette compare against the unclothed
            # released pose; the navy pigment of the stock is under the garment.
            navy=(rgba[:,:,2]>rgba[:,:,0]+3)&(rgba[:,:,2]>rgba[:,:,1])&(rgba[:,:,3]>0)
            foreign=np.abs(rgba-clean.astype(int)).max(axis=2)>3
            guard=region&(rgba[:,:,3]>0)&foreign&~navy&(ref21[:,:,3]<160)
            stock=region&navy&((clean21[iy,ix,3]>0)|(ref21[:,:,3]>0))&(y<415)
            for k,(_,h,replace) in clothes.items():
                fabric=np.asarray(image(h))[iy,ix]
                items['pants'+k]['phases'].append(dict(front=emit(fabric),cut=runs(stock&(fabric[:,:,3]>0)&replace)))
            phases.append(dict(approval=approved,guard=runs(guard),fit=[dx,dy],phase=f))
        if len(items)!=18:raise ValueError('Missing unregistered lower items')
        fitted[direction]=dict(origin=proof['id'],base=rig['id'],baseSHA256=rig['sourcePackSHA256'],source=pistol['sourceSHA256'],items=items,phases=phases)
    files['register.json']=json.dumps(fitted,separators=(',',':')).encode()
    return files


def pistol_legs(folder):
    with zipfile.ZipFile(OUT) as z:
        meta=json.loads(z.read('register.json'))
        for n in z.namelist():
            if n.endswith('.png'):
                raw=z.read(n)
                if hashlib.sha256(raw).hexdigest()+'.png'!=n:raise ValueError('Changed pistol cloth '+n)
                (folder/n).write_bytes(raw)
        return meta


if __name__=='__main__':
    files=generate()
    if '--verify' in sys.argv:
        with zipfile.ZipFile(OUT) as z:
            if set(z.namelist())!=files.keys() or any(z.read(n)!=v for n,v in files.items()):raise ValueError('Changed pistol legs')
    else:
        with zipfile.ZipFile(OUT,'w') as z:
            for n,b in sorted(files.items()):z.writestr(zipfile.ZipInfo(n),b,compress_type=zipfile.ZIP_DEFLATED)
