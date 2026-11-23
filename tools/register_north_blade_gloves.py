"""Recover each reviewed rear-view glove on the actual male blade contacts."""
import hashlib
import io
import json
import struct
import sys
import zipfile

from export_staff_coats import ROOT
from north_blade_anatomy import ARMS, rigs, original
from register_staff_gloves import bind

OUT=ROOT/'tools/rework-combat-wardrobe/north-blade-gloves.zip'


def contacts(family,direction):
    import numpy as np
    from PIL import Image,ImageDraw
    yy,xx=np.indices((640,640))
    layers={l['id']:l for l in direction['layers']}
    pins={n:layers[n]['frames'] for n in ARMS}
    if any(layers[n]['binding']!={'kind':'fixed'} or len(pins[n])!=8 for n in ARMS):
        raise ValueError('Unregistered arm surfaces')
    phases=[]
    for f,p in enumerate(direction['poses']):
        parts={}
        for side,joint in [('near','RIGHT'),('far','LEFT')]:
            def point(s):
                v=p[joint+' '+s]
                # The restored pair contains an actual LEFT/RIGHT raster flip.
                # Its pose metadata still uses the pre-restoration local axes.
                return np.array([639-4*v['x'] if family=='restored' else 4*v['x'],4*v['y']])
            wrist=point('ARM');tip=point('HAND CENTER');axis=tip-wrist
            if np.linalg.norm(axis)<5:raise ValueError('Degenerate hand contact')
            fore=np.asarray(original(pins['forearm-hand-'+side][f]))[:,:,3]
            mask=(xx-wrist[0])*axis[0]+(yy-wrist[1])*axis[1]>=-4*np.linalg.norm(axis)
            mask&=(xx-tip[0])**2+(yy-tip[1])**2<37**2
            if family=='daggers' and f in (1,2,3,4,5):
                # In this approved rear shot both palms pass IN FRONT of the
                # actor, completely behind the back from the map camera.
                # The labelled forearm image also contains the back and upper
                # elbow pixels. Painting its projected wrist would mark skin
                # between the shoulder blades with two false gloves.
                continue
            if family=='daggers' and f==6:
                # Only the distal rim of each returning fist emerges below the
                # raised elbow. Trace this occlusion against the original frame.
                left=[(250,301),(254,304),(259,306),(265,306),(269,304),(275,299),(274,309),(267,316),(258,316),(251,312)]
                pts=left if side=='near' else [(639-x,y) for x,y in left]
                cover=Image.new('1',(640,640));ImageDraw.Draw(cover).polygon(pts,fill=1)
                mask=np.asarray(cover);axis=np.array([1,4]) if side=='near' else np.array([-1,4])
            hand=np.where(mask,fore,0).astype('uint8')
            area=np.count_nonzero(hand)
            if not (40<=area<=2200):raise ValueError(f'Invalid contact {family}/{f}/{side}: {area}')
            parts[side]=(hand,axis)
        phases.append(parts)
    return pins,phases


def generate():
    import numpy as np
    from PIL import Image
    from export_combat_wardrobe import ARCHIVES,read_archive
    rows=read_archive(ROOT/'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18','focus')
    donor=json.loads(rows['orbe-cajado-canonical-reviewed/records/31-north.json'])['baseRecord']['pack']['directions']['north']
    library={hashlib.sha256(data).hexdigest():data for n,data in rows.items() if n.endswith('.png')}
    maps=[r for r in json.loads(rows['orbe-cajado-reviewed-gloves/map.json'])['rows'] if r['direction']=='north']
    if len({r['item'] for r in maps})!=10:raise ValueError('Incomplete rear glove catalogue')
    stores={};reg={'source':ARCHIVES['focus'],'rigs':{},'sources':{}}
    patches={'0':('3c8f8deb7a24318812bbbef9c29f5e768f5a5fd164133ea4a335c4f296c4ce17',(365,336,28,30)),'7':('8416ba59f341a37ed93e81cc761ea0ea2c2ecf82b3dad627412900e4c2f5d004',(367,336,28,31))}
    reg['mirroredPatch']={i:dict(sha=sha,rect=rect,items={}) for i,(sha,rect) in patches.items()}
    for family,rig in rigs().items():
        d=rig['directions']['north'];pins,phases=contacts(family,d)
        if rig['density']!=4 or rig['frame']!={'width':160,'height':160} or rig['pivot']!={'x':80,'y':128} or d['clip']!={'frames':8,'fps':12,'loop':False,'contactFrame':4}:raise ValueError('Changed blade anatomy')
        label=pins['forearm-hand-near'][0]
        block=reg['rigs'][label]=dict(family=family,pins=pins,items={},occluded=[i for i,p in enumerate(phases) if not p])
        for row in maps:
            item=row['item'];track=block['items'][item]=[{} for _ in phases]
            if row['holds'] or len(row['layers'])!=2:raise ValueError('Invalid original glove pair')
            for layer in row['layers']:
                name=layer['id'].split(':')[-1]
                if name not in ('left','right') or layer['binding']!={'kind':'fixed'} or len(layer['frames'])!=8 or not (layer['id']==f'reviewed-gloves:{item}:{name}' or layer in donor['layers'] and row['status']=='preserved-reviewed-existing'):
                    raise ValueError('Unowned glove plate')
                reg['sources'].setdefault(item,{})[name]=dict(id=layer['id'],frames=layer['frames'])
                # The near hand is screen-left on the original rear-facing
                # poses and screen-right on the explicitly restored drawings.
                side=('near' if name=='left' else 'far') if family!='restored' else ('far' if name=='left' else 'near')
                def contact(p):
                    h=p[name.upper()+'_HANDCENTER'];w=p[name.upper()+'_WRIST']
                    return np.array([h['x']-w['x'],h['y']-w['y']])*4
                axes=[contact(p) for p in donor['poses']]
                if family=='sword' and name=='right':
                    for key,(sha,rect) in patches.items():
                        x,y,w,h=rect;coverage=np.zeros((640,640),dtype='uint8')
                        coverage[y:y+h,x:x+w]=np.asarray(original(sha))[y:y+h,x:x+w,3]
                        if not 400<np.count_nonzero(coverage)<850:raise ValueError('Invalid original open palm')
                        axis=np.array([-2,11])
                        j=max(range(8),key=lambda t:float(axis@axes[t]/np.linalg.norm(axes[t])))
                        im=Image.open(io.BytesIO(library[layer['frames'][j]])).convert('RGBA')
                        out=io.BytesIO();bind(im,coverage,axis,axes[j]).save(out,format='PNG',compress_level=6)
                        raw=out.getvalue();digest=hashlib.sha256(raw).hexdigest();stores[digest+'.png']=raw
                        reg['mirroredPatch'][key]['items'][item]=digest
                for i,parts in enumerate(phases):
                    if side not in parts:continue
                    coverage,axis=parts[side]
                    def rank(j):
                        return (round(float(axis@axes[j]/np.linalg.norm(axis)/np.linalg.norm(axes[j])),3),i==j,-abs(i-j))
                    frame=max(range(8),key=rank);src=layer['frames'][frame]
                    coverage=np.array(coverage,copy=True)
                    if family=='daggers' and i==6:
                        # Bind on its entire fist envelope, then expose only
                        # the terminal rim visible from behind the elbow.
                        coords=np.argwhere(coverage>0);cy,cx=np.mean(coords,axis=0)
                        yy,xx=np.indices((640,640));envelope=np.where(((yy-cy+7)/15)**2+((xx-cx)/12)**2<=1,255,0).astype('uint8')
                    else:envelope=coverage
                    im=Image.open(io.BytesIO(library[src])).convert('RGBA')
                    if im.size!=(640,640):raise ValueError('Unexpected native density')
                    result=np.array(bind(im,envelope,axis,axes[frame]))
                    result[:,:,3]=np.minimum(result[:,:,3],coverage);result[result[:,:,3]==0]=0
                    if np.count_nonzero(result[:,:,3])<.38*np.count_nonzero(coverage):raise ValueError(f'Invisible glove {family}/{side}/{i}/{item}')
                    out=io.BytesIO();Image.fromarray(result).save(out,format='PNG',compress_level=6);data=out.getvalue()
                    key=hashlib.sha256(data).hexdigest();stores[key+'.png']=data;track[i][side]=key
    stores['register.json']=json.dumps(reg,separators=(',',':')).encode()
    return stores


def materialize(bank):
    with zipfile.ZipFile(OUT) as z:
        reg=json.loads(z.read('register.json'))
        if len(reg['rigs'])!=3 or len(reg['sources'])!=10:raise ValueError('Incomplete blade gloves')
        checked=set()
        for p in reg['mirroredPatch'].values():
            if p['items'].keys()!=reg['sources'].keys():raise ValueError('Incomplete open grip')
            for key in p['items'].values():
                data=z.read(key+'.png')
                if hashlib.sha256(data).hexdigest()!=key:raise ValueError('Changed original grip')
                (bank/(key+'.png')).write_bytes(data)
        for rig in reg['rigs'].values():
            if set(rig['items'])!=set(reg['sources']):raise ValueError('Missing glove')
            for track in rig['items'].values():
                if len(track)!=8:raise ValueError('Missing finger phase')
                for i,row in enumerate(track):
                    if (set(row)!={'near','far'} if i not in rig['occluded'] else bool(row)):raise ValueError('Unexpected hand visibility')
                    for key in row.values():
                        if key in checked:continue
                        data=z.read(key+'.png')
                        if hashlib.sha256(data).hexdigest()!=key or struct.unpack('>II',data[16:24])!=(640,640):raise ValueError('Invalid glove')
                        (bank/(key+'.png')).write_bytes(data);checked.add(key)
    return reg


if __name__=='__main__':
    assets=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUT) as z:
            before=json.loads(z.read('register.json'));now=json.loads(assets['register.json'])
            if before['source']!=now['source'] or before['sources']!=now['sources'] or before['rigs'].keys()!=now['rigs'].keys():raise ValueError('Changed glove sources')
            for key,p in now['mirroredPatch'].items():
                old=before['mirroredPatch'][key]
                if p['sha']!=old['sha'] or p['rect']!=old['rect']:raise ValueError('Changed grip registration')
                for item,digest in p['items'].items():
                    if Image.open(io.BytesIO(assets[digest+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(old['items'][item]+'.png'))).tobytes():raise ValueError('Changed wrist material')
            for key,rig in now['rigs'].items():
                old=before['rigs'][key]
                if any(old[k]!=rig[k] for k in ('pins','family','occluded')):raise ValueError('Changed glove anatomy')
                for item,track in rig['items'].items():
                    for row,previous in zip(track,old['items'][item],strict=True):
                        if set(row)!=set(previous):raise ValueError('Changed phase visibility')
                        for side,sha in row.items():
                            if Image.open(io.BytesIO(assets[sha+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(previous[side]+'.png'))).tobytes():raise ValueError('Changed finger pixels')
    else:
        with zipfile.ZipFile(OUT,'w') as z:
            for n,data in sorted(assets.items()):z.writestr(zipfile.ZipInfo(n),data,compress_type=zipfile.ZIP_DEFLATED)
