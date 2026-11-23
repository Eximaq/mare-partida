"""Fit the two signed dagger glove panels to the original eight male grips."""
import hashlib
import io
import json
import sys
import tempfile
import zipfile
from functools import lru_cache
from pathlib import Path

from export_female_dagger_wardrobe import DIGEST, materialize
from register_staff_gloves import bind
from export_staff_coats import BANK, ROOT, weapons
from register_south_focus_trousers import index

BASE=ROOT/'tools/rework-base-hd'
ART=ROOT/'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18'
ARCHIVE=ROOT/'tools/rework-combat-wardrobe/dagger-gloves.zip'
# Bound the far fist against the near arm in native pixels, relative to
# the authored palm joint. Only the signed visible anatomy inside survives.
FAR_EDGES=(
    [(-11,-23),(1,-23),(8,-9),(5,6),(-9,14)],
    [(-15,-5),(-8,-14),(5,-14),(18,-4),(17,15),(5,25),(-5,23),(-12,15)],
    [(-15,-6),(-8,-14),(5,-14),(17,-5),(16,16),(4,25),(-8,23),(-12,13)],
    [(-12,-6),(-6,-12),(6,-11),(18,0),(20,17),(4,30),(-7,24),(-14,18)],
    [(-15,-8),(-7,-16),(6,-16),(15,-8),(15,12),(0,23),(-8,17),(-10,6)],
    [(-16,-9),(-9,-13),(5,-13),(14,-3),(14,12),(2,23),(-12,24),(-16,15)],
    [(-16,-8),(-8,-13),(5,-13),(14,-4),(15,15),(3,24),(-11,23),(-16,15)],
    [(-12,-33),(3,-34),(14,-19),(14,-7),(2,-1),(-12,2)],
)
# The source folds its near fingers in the opening and recovery drawings.
# The six intervening drawings have the same distal skin as the modular rig.
NEAR_GRIP=[(-15,-24),(-3,-24),(6,-17),(20,-8),(20,6),(14,15),(2,15),(-12,10),(-17,2)]
def generate(verify=False):
    import numpy as np
    from PIL import Image, ImageDraw
    base=index(BASE)
    rigs={d:next(r for r in base['records'] if r['id']=='v7-daggers-'+d+'-modular8-'+d) for d in ('east','west')}
    d=rigs['east']['pack']['directions']['east']
    archives=[(b,json.loads((b/'archives/archive-index.json').read_bytes())['sources']) for b in (BASE,BANK)]
    @lru_cache(maxsize=80)
    def read(key):
        b,row=next((b,rows[key]) for b,rows in archives if key in rows)
        with zipfile.ZipFile(b/'archives'/row['archive']) as z:data=z.read(row['path'])
        if hashlib.sha256(data).hexdigest()!=key:raise ValueError('Original hand changed')
        return Image.open(io.BytesIO(data)).convert('RGBA')
    receivers=[r for r in weapons()['orderedAttackProfiles'] if r['action']=='attack-daggers' and r['body']=='male'
               and r['direction'] in ('east','west')]
    if len(receivers)!=12:raise ValueError('Incomplete original daggers')
    east=next(r for r in receivers if r['id']=='authored-ordered-12-east')
    ordered={}
    for r in receivers:
        frames=[]
        for f,s in enumerate(r['states']):
            far,body,near,restore=s['layers']
            if [a['id'] for a in s['layers']]!=['far-gear','authored-body','near-gear','original-hand-and-outside-gear-restoration'] or restore['sha256']!=body['sha256']:
                raise ValueError('Unregistered original layering')
            im=np.array(read(body['sha256']))
            if r['direction']=='west':im=im[:,::-1]
            if not np.array_equal(im,np.array(read(east['states'][f]['layers'][1]['sha256']))):
                raise ValueError('Different receiving body')
            frames.append([far['sha256'],body['sha256'],near['sha256'],restore['mask']['sha256']])
        ordered[r['id']]=frames
    Y,X=np.indices((640,640));masks=[]
    def coordinates(p,role,joint):
        return np.array([p[role+' '+joint][k] for k in ('x','y')])*4
    def from_edges(center,edges):
        canvas=Image.new('L',(640,640));pen=ImageDraw.Draw(canvas)
        pen.polygon([tuple(np.rint(center+v).astype(int)) for v in edges],fill=255)
        return np.asarray(canvas)>0
    for f,p in enumerate(d['poses']):
        body=np.array(read(east['states'][f]['layers'][1]['sha256']))
        # The blue shorts lie in front of a mostly hidden far hand in 0/7.
        # Sample their own signed plane at the same pixel, including its ink.
        shorts=np.array(read(next(l['frames'][f] for l in d['layers'] if l['id']=='shorts')))
        hands=[]
        for side,role,layer in [('left','LEFT','far'),('right','RIGHT','near')]:
            start=coordinates(p,role,'ARM');center=coordinates(p,role,'HAND CENTER');axis=center-start
            raw=np.array(read(next(l['frames'][f] for l in d['layers'] if l['id']=='forearm-hand-'+layer)))
            if side=='right' and f not in (0,7):
                seam=start-.52*axis
                coverage=np.where((X-seam[0])*axis[0]+(Y-seam[1])*axis[1]>=0,raw[:,:,3],0)
                if np.abs(body.astype(int)-raw.astype(int))[coverage>40].max()>4:raise ValueError('Different native grip')
            else:
                bounds=from_edges(center,FAR_EDGES[f] if side=='left' else NEAR_GRIP)
                in_front=(shorts[:,:,3]>0)&(np.abs(body.astype(int)-shorts.astype(int)).max(axis=2)<4)
                # Shorts can retain isolated skin from the authored grip in
                # their export. The original indigo pigment identifies cloth.
                cloth=(body[:,:,2].astype(int)>body[:,:,0].astype(int))&in_front
                # Keep the garment on its own side of the native hand/shorts
                # boundary, including the dark denim directly below the fingers.
                if f in (0,7):
                    cloth|=(body[:,:,2].astype(int)>body[:,:,0].astype(int))&bounds
                    palm=(body[:,:,0].astype(int)>body[:,:,2].astype(int)+10)&bounds
                    from PIL import ImageFilter
                    rim=np.asarray(Image.fromarray(palm.astype('uint8')*255).filter(ImageFilter.MaxFilter(3)))>0
                    bounds&=rim
                coverage=np.where(bounds&~cloth,body[:,:,3],0)
                if side=='left' and f not in (0,7):axis=np.array([3.,-15.])
                if f in (0,7):axis=np.array([2.,18.])
            if np.count_nonzero(coverage)<30:raise ValueError('Empty visible fist '+str((side,f)))
            hands.append((coverage,axis,center))
        masks.append(hands)
    result={};assets={}
    with tempfile.TemporaryDirectory() as tmp:
        folder=Path(tmp);materialize(ART,folder)
        src=json.loads((folder/'index.json').read_bytes())
        records=[r for r in src['records'] if r['direction']=='east' and r['slot']=='gloves']
        if len(records)!=10 or len({r['item'] for r in records})!=10:raise ValueError('Incomplete dagger materials')
        # Both hands extend fully in phase four of the editable donor. Other
        # phases can contain only the small part of the glove behind a blade.
        source_phase=4;pose=src['targets']['12/east'][5][source_phase]
        for hand,side in enumerate(('left','right')):
            parts=[next(l for l in r['layers'] if l['id']=='adaga-stage:gloves:'+str(r['item'])+':'+side) for r in records]
            images=[read_material(folder,l['frames'][source_phase]) for l in parts]
            envelope=np.maximum.reduce([np.asarray(im)[:,:,3] for im in images])
            origin=next(p for p in pose['parts'] if p['side']==side)
            source_axis=np.subtract(origin['targetHandCenter'], origin['targetForearmCenter'])
            for r,part,image in zip(records,parts,images):
                if r['item']!=part['equipmentItem'] or part['equipmentSlot']!='gloves' or part['binding']!={'kind':'fixed'}:
                    raise ValueError('Unowned material')
                item=str(r['item']);track=[]
                for f in range(8):
                    coverage,axis,center=masks[f][hand]
                    if side=='left' and f in (0,7):
                        # Fit the complete downward fist first, then expose
                        # only the sliver extending beyond the near leg.
                        full,axis0,anchor=masks[0][1]
                        ref=bind(image,full,axis0,source_axis,envelope)
                        delta=np.rint(center-anchor).astype(int)
                        if f==7:delta[1]-=15
                        rgba=np.roll(np.array(ref),(delta[1],delta[0]),(0,1))
                        rgba[:,:,3]=np.minimum(rgba[:,:,3],coverage);rgba[rgba[:,:,3]==0]=0
                        art=Image.fromarray(rgba)
                    else:art=bind(image,coverage,axis,source_axis,envelope)
                    alpha=np.asarray(art)[:,:,3];n=int(np.count_nonzero(alpha))
                    if np.any(alpha>coverage) or n<max(5,.18*np.count_nonzero(coverage)):raise ValueError('Unfitted glove '+str((item,side,f,n)))
                    buff=io.BytesIO();art.save(buff,format='PNG',optimize=True);data=buff.getvalue()
                    key=hashlib.sha256(data).hexdigest();assets[key+'.png']=data
                    track.append(dict(art=key,source=part['frames'][source_phase],pixels=n))
                result.setdefault(item,{})[side]=track
    record=dict(sourceArchive=DIGEST,sourcePhase=source_phase,ordered=ordered,items=result)
    if verify:
        with zipfile.ZipFile(ARCHIVE) as z:
            prior=json.loads(z.read('registration.json'))
            if prior['sourceArchive']!=DIGEST or prior['ordered']!=ordered or set(prior['items'])!=set(result):
                raise ValueError('Different dagger garment registration')
            for item,hands in result.items():
                for side,track in hands.items():
                    for v,p in zip(track,prior['items'][item][side],strict=True):
                        decoded=lambda data:Image.open(io.BytesIO(data)).tobytes()
                        if v['source']!=p['source'] or v['pixels']!=p['pixels'] or decoded(assets[v['art']+'.png'])!=decoded(z.read(p['art']+'.png')):
                            raise ValueError('Dagger glove differs')
        return
    assets['registration.json']=json.dumps(record,separators=(',',':')).encode()
    with zipfile.ZipFile(ARCHIVE,'w') as z:
        for name,data in sorted(assets.items()):z.writestr(zipfile.ZipInfo(name),data,compress_type=zipfile.ZIP_DEFLATED)

def read_material(folder,key):
    from PIL import Image
    raw=(folder/'assets'/(key+'.png')).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=key:raise ValueError('Changed donor glove')
    return Image.open(io.BytesIO(raw)).convert('RGBA')

if __name__=='__main__':
    generate('--verify' in sys.argv)
