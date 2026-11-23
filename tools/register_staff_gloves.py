"""Bind the two original focus glove materials to the ordered profile staff hands."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from pathlib import Path

from export_staff_coats import BANK, REGISTRATION, weapons

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT/'tools/rework-combat-wardrobe/staff-gloves.zip'
WRISTS = ((353,331),(363,308),(374,276),(391,276),(405,268),(395,278),(365,321),(354,335))
TIPS = ((356,362),(396,326),(381,246),(427,253),(449,260),(436,270),(397,338),(363,366))
# Cuff-to-finger directions in the original, reviewed left-hand material.
LEFT_AXIS = ((6,-24),(-13,-22),(-25,-12),(-25,-12),(-25,-12),(-25,-12),(-25,-12),(6,-24))


def bind(image, coverage, target_axis, material_axis):
    import numpy as np
    from PIL import Image

    def axes(vector):
        unit=np.asarray(vector,dtype=float)
        unit/=np.linalg.norm(unit)
        return unit,np.array([-unit[1],unit[0]])

    source=np.asarray(image)
    sy,sx=np.where(source[:,:,3]>50)
    ty,tx=np.where(coverage>0)
    if len(sx)<120 or not len(tx):
        raise ValueError('Unowned glove or empty hand')
    u,v=axes(target_axis)
    a,b=axes(material_axis)
    sm,sw=np.column_stack([sx,sy])@a,np.column_stack([sx,sy])@b
    tm,tw=np.column_stack([tx,ty])@u,np.column_stack([tx,ty])@v
    mapped=np.interp(tm,(tm.min(),tm.max()),(sm.min(),sm.max()))
    widths=np.empty(len(tm))
    # A transverse slice follows the hand silhouette. The receiving mask
    # supplies the individual finger gaps, and source alpha preserves cutouts.
    for band in np.unique(np.rint(tm).astype(int)):
        selected=np.rint(tm)==band
        in_hand=tw[abs(tm-band)<1.1]
        in_material=sw[abs(sm-np.median(mapped[selected]))<1.25]
        if not len(in_material):
            distance=abs(sm-np.median(mapped[selected]))
            in_material=sw[distance<=distance.min()+.5]
        widths[selected]=np.interp(tw[selected],(in_hand.min()-.1,in_hand.max()+.1),
                                   (in_material.min(),in_material.max()))
    at=np.rint(mapped[:,None]*a+widths[:,None]*b).astype(int)
    out=np.zeros_like(source)
    out[ty,tx]=source[at[:,1],at[:,0]]
    out[ty,tx,3]=((out[ty,tx,3].astype('uint16')*coverage[ty,tx]+127)//255).astype('uint8')
    out[out[:,:,3]==0]=0
    return Image.fromarray(out)


def calibrate(verify):
    import numpy as np
    from PIL import Image
    from export_combat_wardrobe import ARCHIVES, read_archive

    checkpoint=ROOT/'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18'
    source=read_archive(checkpoint,'focus')
    rows=json.loads(source['orbe-cajado-reviewed-gloves/map.json'])['rows']
    library={hashlib.sha256(raw).hexdigest():raw for name,raw in source.items() if name.endswith('.png')}
    bank=json.loads((BANK/'archives/archive-index.json').read_bytes())['sources']

    def native(sha):
        row=bank[sha]
        with zipfile.ZipFile(BANK/'archives'/row['archive']) as z:
            data=z.read(row['path'])
        if hashlib.sha256(data).hexdigest()!=sha:
            raise ValueError('Native hand changed')
        return np.asarray(Image.open(io.BytesIO(data)).convert('RGBA'))[:,:,3]

    profiles=weapons()['orderedAttackProfiles']
    pins={}
    for direction in ('east','west'):
        states=next(r for r in profiles if r['id']=='authored-ordered-124-'+direction)['states']
        pins[direction]=[{l['id']:l['sha256'] for l in state['layers'] if l['id'] in ('grip','forearm-hand-far')} for state in states]
    y,x=np.indices((640,640))
    near_track=json.loads(REGISTRATION.read_bytes())
    masks=[]
    for f,h in enumerate(pins['east']):
        near=native(h['grip'])
        far=native(h['forearm-hand-far'])
        arm=np.subtract(TIPS[f],WRISTS[f])
        region=(x-WRISTS[f][0])*arm[0]+(y-WRISTS[f][1])*arm[1]>=0
        owner=np.zeros((640,640),bool)
        for start,n in near_track[f]:owner.ravel()[start:start+n]=True
        if np.count_nonzero(near[owner])<500 or np.count_nonzero(far[region])<5:
            raise ValueError('Missing fingertip or staff grip')
        masks.append((np.where(region,far,0),np.where(owner,near,0)))
        for role in ('grip','forearm-hand-far'):
            if not np.array_equal(native(pins['west'][f][role]),native(h[role])[:,::-1]):
                raise ValueError('Unregistered west mirror')

    entries={}
    assets={}
    for row in rows:
        if row['direction']!='east':continue
        item=str(row['item'])
        if item in entries or row['holds'] or len(row['layers'])!=2:raise ValueError('Incomplete glove')
        hands={}
        for l in row['layers']:
            side=l['id'].split(':')[-1]
            if side not in ('left','right') or l['id']!='reviewed-gloves:'+item+':'+side or l['binding']!={'kind':'fixed'}:
                raise ValueError('Foreign hand material')
            track=[]
            for f,sha in enumerate(l['frames']):
                image=Image.open(io.BytesIO(library[sha])).convert('RGBA')
                if image.size!=(640,640):raise ValueError('Glove density changed')
                target=masks[f][0 if side=='left' else 1]
                axis=np.subtract(TIPS[f],WRISTS[f]) if side=='left' else (33,1)
                bound=bind(image,target,axis,LEFT_AXIS[f] if side=='left' else (2,-29))
                # In the opening pose the far hand is almost completely hidden
                # behind the body. Reuse the neighbouring downward hand's
                # mapping at its actual wrist, then clip to this frame's owner.
                if side=='left' and f==0:
                    ref=bind(image,masks[7][0],np.subtract(TIPS[7],WRISTS[7]),LEFT_AXIS[7])
                    dx,dy=np.subtract(WRISTS[0],WRISTS[7])
                    visible=np.roll(np.array(ref),(dy,dx),(0,1))
                    visible[:,:,3]=np.minimum(visible[:,:,3],target)
                    visible[visible[:,:,3]==0]=0
                    bound=Image.fromarray(visible)
                alpha=np.asarray(bound)[:,:,3]
                if np.count_nonzero(alpha)<(.04 if side=='left' and f==0 else .63)*np.count_nonzero(target):
                    raise ValueError('Insufficient owned palm '+str((item,side,f)))
                if np.any(alpha>target):raise ValueError('Foreign pixels outside the native hand')
                buf=io.BytesIO();bound.save(buf,format='PNG',optimize=True);data=buf.getvalue()
                key=hashlib.sha256(data).hexdigest();assets[key+'.png']=data
                track.append(dict(art=key,source=sha,pixels=int(np.count_nonzero(alpha))))
            hands[side]=track
        if set(hands)!={'left','right'}:raise ValueError('Missing one glove')
        entries[item]=hands
    if len(entries)!=10:raise ValueError('Incomplete catalogue')
    manifest=dict(sourceArchive=ARCHIVES['focus'],receiver='authored-ordered-124',pins=pins,items=entries)
    if verify:
        with zipfile.ZipFile(ARCHIVE) as saved:
            original=json.loads(saved.read('registration.json'))
            if original['sourceArchive']!=manifest['sourceArchive'] or original['pins']!=pins or original['items'].keys()!=entries.keys():
                raise ValueError('Changed glove registration')
            for item,hands in entries.items():
                for side,track in hands.items():
                    old=original['items'][item][side]
                    for a,b in zip(track,old,strict=True):
                        left=Image.open(io.BytesIO(assets[a['art']+'.png']))
                        right=Image.open(io.BytesIO(saved.read(b['art']+'.png')))
                        if a['source']!=b['source'] or a['pixels']!=b['pixels'] or left.tobytes()!=right.tobytes():
                            raise ValueError('Changed original wrist binding '+item)
        return
    assets['registration.json']=json.dumps(manifest,separators=(',',':')).encode()
    with zipfile.ZipFile(ARCHIVE,'w') as z:
        for name,data in sorted(assets.items()):z.writestr(zipfile.ZipInfo(name),data,compress_type=zipfile.ZIP_DEFLATED)


def materialize(bank):
    with zipfile.ZipFile(ARCHIVE) as z:
        registration=json.loads(z.read('registration.json'))
        if len(registration['items'])!=10:raise ValueError('Incomplete staff glove atlas')
        for hands in registration['items'].values():
            if set(hands)!={'left','right'}:raise ValueError('Missing hand')
            for track in hands.values():
                if len(track)!=8:raise ValueError('Missing phase')
                for row in track:
                    name=row['art']+'.png';data=z.read(name)
                    if hashlib.sha256(data).hexdigest()!=row['art'] or struct.unpack('>II',data[16:24])!=(640,640):
                        raise ValueError('Invalid garment panel')
                    (bank/name).write_bytes(data)
    return registration


if __name__=='__main__':
    calibrate('--verify' in sys.argv)
