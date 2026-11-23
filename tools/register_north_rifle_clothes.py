"""Fit the original North rifle clothing to its three signed recoil drawings."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache

from export_north_firearm_wardrobe import ARCHIVE as DONOR, DIGEST
from export_staff_coats import BANK, ROOT, weapons
from register_staff_gloves import bind
from register_north_rifle_trousers import BACK

OUTPUT = ROOT/'tools/rework-combat-wardrobe/north-rifle-clothes.zip'
CHECKPOINT = ROOT/'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18'
# The support palm is above the trigger palm. They share one native tile;
# the seam is measured on the three original transparent drawings.
SEAMS = (245,244,243)
PALMS = (((25,-14),(-13,-21)),((22,-13),(9,-20)),((20,-10),(7,-20)))


def register_coats(native, save):
    import numpy as np
    from PIL import Image
    from register_south_focus_trousers import OUTFITS, BASE, index
    from north_rifle_clothing_panels import split_front

    size=(640,640)
    y,x=np.indices(size)
    original={r['id']:r for r in index(OUTFITS)['records']}
    sources={bank:json.loads((bank/'archives/archive-index.json').read_bytes())['sources'] for bank in (OUTFITS,BASE)}
    @lru_cache(maxsize=32)
    def panel(key,bank=OUTFITS):
        entry=sources[bank][key]
        with zipfile.ZipFile(bank/'archives'/entry['archive']) as z: raw=z.read(entry['path'])
        if hashlib.sha256(raw).hexdigest()!=key:raise ValueError('Changed original garment/head '+key)
        im=Image.open(io.BytesIO(raw)).convert('RGBA')
        if bank==BASE:
            if im.size!=size:raise ValueError('Incompatible original head')
            return im
        if im.size!=(512,512):raise ValueError('Unexpected rest panel dimensions')
        out=Image.new('RGBA',size);out.paste(im,(64,64))
        return out
    def clip(im,opacity):
        a=np.array(im)
        a[:,:,3]=((a[:,:,3].astype('uint32')*opacity+127)//255).astype('uint8')
        a[a[:,:,3]==0]=0
        return Image.fromarray(a)
    def bend(im,rest,tip):
        from PIL import ImageDraw
        shoulder,elbow,wrist=rest
        start,pivot,end=tip
        def axis(a,b,c,d):
            u=b-a;v=d-c
            def basis(k):return np.column_stack((k,np.array([-k[1],k[0]])/np.linalg.norm(k)))
            return (basis(v)@np.linalg.inv(basis(u)))[:,0]
        axes=(axis(shoulder,elbow,start,pivot),axis(elbow,wrist,pivot,end))
        def project(x,y):
            lower=y>=elbow[1]
            a,b=(elbow,wrist) if lower else (shoulder,elbow)
            c,d=(pivot,end) if lower else (start,pivot)
            frac=(y-a[1])/(b[1]-a[1]);origin=a+frac*(b-a)
            blend=np.clip((y-elbow[1]+12)/24,0.,1.)
            across=(1-blend)*axes[0]+blend*axes[1]
            across/=max(np.linalg.norm(across),.001)
            return c+frac*(d-c)+(x-origin[0])*across
        bounds=im.getbbox()
        tile=Image.new('RGBA',size)
        if not bounds:return tile
        l,t,r,b=bounds;t-=1;b+=1;l-=1;r+=1
        lines=sorted(set([t,b,*[int(elbow[1])+s for s in (-16,-12,-8,-4,0,4,8,12,16) if t<int(elbow[1])+s<b]]))
        for y0,y1 in reversed(list(zip(lines,lines[1:]))):
            source=np.array([(l,y0),(r,y0),(r,y1),(l,y1)])
            dest=np.array([project(*v) for v in source])
            for ids in ([0,1,2],[0,2,3]):
                dst=dest[ids];orig=source[ids]
                x0,y0t=dst.min(axis=0).astype(int)-1
                x1,y1t=np.ceil(dst.max(axis=0)).astype(int)+1
                if min(x1-x0,y1t-y0t)<1:continue
                local=dst-np.array((x0,y0t))
                coords=np.column_stack((local,np.ones(3)))
                if abs(np.linalg.det(coords))<.01:continue
                inv=np.linalg.solve(coords,orig).T
                shape=(x1-x0,y1t-y0t)
                warped=im.transform(shape,Image.Transform.AFFINE,tuple(inv.ravel()),Image.Resampling.NEAREST)
                mask=Image.new('1',shape)
                ImageDraw.Draw(mask).polygon(list(map(tuple,local.round().astype(int).tolist())),fill=1)
                warped.paste((0,0,0,0),mask=mask.point(lambda k:0 if k else 255))
                tile.alpha_composite(warped,(x0,y0t))
        return tile

    # Physical anchors on the three native, unmirrored North recoil drawings.
    # The rendered skin shoulders and pelvis are stationary. Only the flexed
    # elbow and the cut between the original bare arm and palm travel.
    joints=(
        {'LEFT':((266,296),(329,236)),'RIGHT':((357,297),(327,255))},
        {'LEFT':((265,286),(334,238)),'RIGHT':((361,278),(334,254))},
        {'LEFT':((265,290),(327,237)),'RIGHT':((360,282),(329,254))},
    )
    back=np.asarray(native(BACK))[:,:,3]
    head=json.loads((ROOT/'tools/rework-combat-wardrobe/north-rifle-trousers.json').read_bytes())['head']
    hair=np.asarray(panel(head['hair'],BASE))[:,:,3]
    skull=np.asarray(panel(head['skull'],BASE))[:,:,3]
    results={}
    for item in (6,7,130,137,144,151,158,165,172,179):
        name=f'male-torso{item}-north-frozen-idle-native' if item!=151 else 'male-pants133-idle-north-isolated-r2-coat151-native'
        r=original[name];p=r['pack'];d=p['directions']['north'];rest=d['rest']
        if r['equipment'].get('torso')!=item or r['body']!='male' or r['direction']!='north' or p['density']!=4 or p['pivot']!={'x':64,'y':112} or p['frame']!={'width':128,'height':128}:
            raise ValueError('Incompatible donor rig '+name)
        layers=[];provenance=[]
        for l in sorted(d['layers'],key=lambda v:v['depth']):
            k=l['id']
            if not k.startswith((f'coat{item}-','coat-front-','sleeve-aperture-','original-neck-coverage')):continue
            own=l['source'];bind=l['binding']
            if own not in r['sourceRefs'] or bind['kind'] not in ('bone','rigid') or 'mask' in l:
                raise ValueError('Unregistered coat part '+k)
            layers.append((k,bind['a'],bind['b'],panel(own)))
            provenance.append(dict(id=k,sha256=own,anchors=[bind['a'],bind['b']]))
        if not any('core' in l[0] for l in layers) or not any('hem' in l[0] for l in layers):
            raise ValueError('Incomplete costume '+name)
        # Long closed mantles 144 and 179 have no independent sleeve in the
        # four-view master. Their continuous drape belongs on the static back.
        if item not in (144,179):layers=split_front(item,layers,rifle=True)
        def anchor(k):
            return np.array([rest[k]['x']*4+64,rest[k]['y']*4+64])
        record=results[str(item)]=dict(source=name,materials=provenance,frames=[])
        for fi,pose in enumerate(joints):
            core=Image.new('RGBA',size);sleeves=Image.new('RGBA',size);caps=Image.new('RGBA',size)
            sides={}
            for label,a,b,im in layers:
                if (a,b)==('NECK','HIP'):
                    core.alpha_composite(im)
                    continue
                side,bone=a.split(' ',1)
                if side not in pose or bone not in ('SHOULDER','ELBOW'):raise ValueError('Unbound sleeve '+label)
                sides.setdefault(side,Image.new('RGBA',size)).alpha_composite(im)
            for side,im in sides.items():
                arm=[anchor(side+' '+joint) for joint in ('SHOULDER','ELBOW','ARM')]
                shoulder=arm[0];elbow,wrist=map(np.array,pose[side])
                sleeve=bend(im,arm,(shoulder,elbow,wrist))
                sleeves.alpha_composite(sleeve)
                # Draw the shoulder cap over the receiving back; raised
                # forearms, gloved fingers and the barrel keep native depth.
                proximal=clip(im,np.where(y<arm[1][1]-5,255,0))
                caps.alpha_composite(clip(bend(proximal,arm,(shoulder,elbow,wrist)),back))
            caps.alpha_composite(core)
            group=dict()
            if sleeves.getbbox():group['sleeves']=save(sleeves)
            group['front']=save(clip(caps,255-hair))
            group['frontBare']=save(clip(caps,255-np.minimum(skull,hair)))
            record['frames'].append(group)
    return results


def generate():
    import numpy as np
    from PIL import Image
    raw = (CHECKPOINT/DONOR).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=DIGEST: raise ValueError('Changed approved rifle materials')
    atlas = {}
    def save(im):
        stream=io.BytesIO()
        im.save(stream,format='PNG',compress_level=9)
        raw=stream.getvalue()
        key=hashlib.sha256(raw).hexdigest()
        atlas[key+'.png']=raw
        return key
    original=json.loads((BANK/'archives/archive-index.json').read_bytes())['sources']
    @lru_cache(maxsize=24)
    def native(key):
        row=original[key]
        with zipfile.ZipFile(BANK/'archives'/row['archive']) as archive:
            raw=archive.read(row['path'])
        if hashlib.sha256(raw).hexdigest()!=key: raise ValueError('Changed native receiver')
        im=Image.open(io.BytesIO(raw)).convert('RGBA')
        if im.size!=(640,640):raise ValueError('Invalid physical frame')
        return im

    receiver=next(r for r in weapons()['records'] if r['id']=='mosquete4-north-native-layers')
    if receiver['replacementMode']!='atomic-arms-weapon-hands-body' or receiver['density']!=4 or receiver['pivot']!=[80,128] or receiver['fps']!=24 or len(receiver['states'])!=3:
        raise ValueError('Invalid original rifle anatomy or recoil')
    pins=[]
    parts=[]
    for f,state in enumerate(receiver['states']):
        arms,weapon,hands,body=state['layers']
        if [l['role'] for l in state['layers']]!=['arms','weapon','hands','body-occluder'] or body['sha256']!=BACK:
            raise ValueError('Rifle depth order changed')
        hand=np.asarray(native(hands['sha256']))[:,:,3]
        back=np.asarray(native(BACK))[:,:,3]
        upper=hand.copy();upper[SEAMS[f]:]=0
        trigger=hand.copy();trigger[:SEAMS[f]]=0
        if np.any((trigger>0)&(back<255)) or not 120<=np.count_nonzero((upper>0)&(back==0))<=370:
            raise ValueError('Signed grip/shoulder occlusion changed')
        parts.append((upper,trigger))
        pins.append(dict(arms=arms['sha256'],hands=hands['sha256'],back=BACK))
    gloves={}
    with zipfile.ZipFile(io.BytesIO(raw)) as donor:
        def read(k):
            data=donor.read('fuzil113-ns/assets/'+k+'.png')
            if hashlib.sha256(data).hexdigest()!=k:raise ValueError('Changed glove material')
            im=Image.open(io.BytesIO(data)).convert('RGBA')
            if im.size!=(640,640):raise ValueError('Unexpected original glove dimensions')
            return im
        catalog=json.loads(donor.read('fuzil113-ns/catalog.json'))
        first={};d=catalog['originals']['north']['pack']['directions']['north']
        for r in catalog['northGloves']:
            if r['phase']==0:first.setdefault(r['item'],{})[r['side']]=r['sha']
        for side in ('left','right'):
            l=next(l for l in d['layers'] if l['id']=='candidate-glove166-'+side)
            first.setdefault(166,{})[side]=l['frames'][0]
        for i,source in sorted(first.items()):
            if set(source)!={'left','right'}:raise ValueError('Incomplete source pair')
            own=[read(source[side]) for side in ('left','right')]
            phases=[]
            for f,(support,trigger) in enumerate(parts):
                # Cuffs in the source drawing are above the fingertips. Fit the
                # fabric along each receiving palm and keep the real finger gaps.
                fitted=bind(own[0],support,PALMS[f][0],(0,1))
                fitted.alpha_composite(bind(own[1],trigger,PALMS[f][1],(0,1)))
                rgba=np.asarray(fitted)[:,:,3]
                if np.any(rgba>np.maximum(support,trigger)) or np.count_nonzero(rgba*(np.asarray(native(BACK))[:,:,3]==0))<65:
                    raise ValueError('Unregistered or hidden rifle glove '+str((i,f)))
                phases.append(save(fitted))
            gloves[str(i)]=dict(materials=source,frames=phases)
    if len(gloves)!=10 or len({v['frames'][0] for v in gloves.values()})!=10:
        raise ValueError('Expected ten distinct gloves')
    coats=register_coats(native,save)
    atlas['registration.json']=json.dumps(dict(source=DIGEST,pins=pins,gloves=gloves,coats=coats),separators=(',',':')).encode()
    return atlas


def materialize(bank):
    with zipfile.ZipFile(OUTPUT) as z:
        row=json.loads(z.read('registration.json'))
        if row['source']!=DIGEST or len(row['gloves'])!=10 or len(row['pins'])!=3:raise ValueError('Incomplete North rifle clothes')
        if len(row['coats'])!=10:raise ValueError('Incomplete North rifle wardrobe')
        for item in [*row['gloves'].values(),*row['coats'].values()]:
            if len(item['frames'])!=3:raise ValueError('Incomplete recoil')
            keys={v for frame in item['frames'] for v in (frame.values() if isinstance(frame,dict) else [frame])}
            for key in keys:
                raw=z.read(key+'.png')
                if hashlib.sha256(raw).hexdigest()!=key or struct.unpack('>II',raw[16:24])!=(640,640):
                    raise ValueError('Invalid rifle garment')
                (bank/(key+'.png')).write_bytes(raw)
        return row


if __name__=='__main__':
    result=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUTPUT) as z:
            old=json.loads(z.read('registration.json'));new=json.loads(result['registration.json'])
            if old['pins']!=new['pins'] or old['source']!=new['source'] or old['gloves'].keys()!=new['gloves'].keys():
                raise ValueError('Changed source anatomy or material')
            for group in ('gloves','coats'):
              if old[group].keys()!=new[group].keys():raise ValueError('Changed catalog')
              for i,item in new[group].items():
                prev=old[group][i]
                if prev['materials']!=item['materials'] or len(prev['frames'])!=3:raise ValueError('Missing original material')
                for before,after in zip(prev['frames'],item['frames']):
                  if isinstance(after,dict) and after.keys()!=before.keys(): raise ValueError('Changed depths')
                  for a,b in ([(before[k],v) for k,v in after.items()] if isinstance(after,dict) else [(before,after)]):
                    if Image.open(io.BytesIO(z.read(a+'.png'))).tobytes()!=Image.open(io.BytesIO(result[b+'.png'])).tobytes():
                        raise ValueError('Changed fitted material')
    else:
        with zipfile.ZipFile(OUTPUT,'w') as z:
            for key,data in sorted(result.items()):z.writestr(zipfile.ZipInfo(key),data,compress_type=zipfile.ZIP_DEFLATED)
