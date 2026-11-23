"""Fit the two existing North focus glove panels to the native receiving hands."""
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache
from pathlib import Path

from export_staff_coats import BANK, ROOT, weapons
from register_staff_gloves import bind

CHECKPOINT=ROOT/'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18'
OUTPUT=ROOT/'tools/rework-combat-wardrobe/north-focus-gloves.zip'
OPEN_HAND={0:'8a04e32cc28b9a80ea73b47268bf6c9acd8d48d3d82659d869bbc3c9bb50674d',
           7:'a862cc9edc9b9dba03580edf28d115ab06863cbb7b3b4523ef6eb5af07d772eb'}
GRIP='152e48d2429016680d1fcff03fa5e64cfddda3ff69bdccc2e3fd2ddb85f5f085'


def generate():
    from export_combat_wardrobe import ARCHIVES, read_archive
    import numpy as np
    from PIL import Image

    index=weapons()
    master=next(r for r in index['records'] if r['id']=='orb17-north-native-layers')
    staff=next(r for r in index['records'] if r['id']=='relicary121-north-original-base17-native-item-candidate')
    if master['basePack']!=staff['basePack']: raise ValueError('Different focus body')
    rig=master['basePack']['pack']['directions']['north']
    layers={l['id']:l for l in rig['layers']}
    if any(layers[k]['binding']!={'kind':'fixed'} for k in ('forearm-hand-near','forearm-hand-far','upper-arm-far')):
        raise ValueError('Unexpected moving raster origin')
    raw=read_archive(CHECKPOINT,'focus')
    donor=json.loads(raw['orbe-cajado-canonical-reviewed/records/31-north.json'])['baseRecord']['pack']['directions']['north']
    rows=[r for r in json.loads(raw['orbe-cajado-reviewed-gloves/map.json'])['rows'] if r['direction']=='north']
    library={hashlib.sha256(v).hexdigest():v for k,v in raw.items() if k.endswith('.png')}
    native=json.loads((BANK/'archives/archive-index.json').read_bytes())['sources']

    @lru_cache(maxsize=60)
    def alpha(key):
        info=native[key]
        with zipfile.ZipFile(BANK/'archives'/info['archive']) as z: data=z.read(info['path'])
        if hashlib.sha256(data).hexdigest()!=key: raise ValueError('Changed native hand')
        im=Image.open(io.BytesIO(data)).convert('RGBA')
        if im.size!=(640,640): raise ValueError('Wrong native hand size')
        return np.asarray(im)[:,:,3]

    def point(p,key): return np.array([p[key]['x'],p[key]['y']])*4
    y,x=np.indices((640,640))
    pins=[];cases={}
    for f,pose in enumerate(rig['poses']):
        refs={k:layers[k]['frames'][f] for k in ('forearm-hand-far','upper-arm-far','forearm-hand-near')}
        at=staff['states'][f]['attachment']
        if at['matrix'][:4]!=[1,0,0,1] or at['depth']!=3: raise ValueError('Unknown staff contact')
        pins.append(dict(refs,open=OPEN_HAND.get(f),gripMatrix=at['matrix']))
        for side,joint in (('near','RIGHT'),('far','LEFT')):
            wrist=point(pose,joint+' ARM')
            axis=point(pose,joint+' HAND CENTER')-wrist
            fore=alpha(refs['forearm-hand-'+side])
            free=(x-wrist[0])*axis[0]+(y-wrist[1])*axis[1]>=-2*np.linalg.norm(axis)
            hands={'hand':np.where(free,fore,0)}
            if side=='far' and f in (2,6):
                # In the authored flex the fingers are on the upper-arm raster.
                # The elbow shares that raster and stays on the body.
                wrist=np.array([381,286]);axis=np.array([-3,-17])
                seam=np.interp(y,[263,268,273,277,282,288,291],[376,373,371,372,376,378,381])
                fingers=(x>=seam)&(x<397)&(y>=263)&(y<=290)
                hands={'hand':np.where(fingers,fore,0),'behind':np.where(fingers,alpha(refs['upper-arm-far']),0)}
                if not 50<np.count_nonzero(hands['behind'])<600: raise ValueError('Missing fingers in the upper arm')
            cases[side,f,'normal']=(axis,hands)
            if side=='near': continue
            if f in OPEN_HAND:
                # The open palm carries the editorial blue/gold orb rim. Its
                # upper edge is protected; cloth only follows the supporting hand.
                wrist0=np.array([379,342]);axis0=np.array([31,5])
                hand=(x-wrist0[0])*31+(y-wrist0[1])*5>=-2*np.linalg.norm(axis0)
                border=np.interp(x,[380,383,386,389,392,395,398,400,402,405,408,411,414,417],
                                   [332,335,338,340,341,343,346,347,346,343,342,339,337,336])
                hand&=~((x>=381)&(x<=416)&(y<border))
                cases[side,f,'open']=(axis0,{'hand':np.where(hand,alpha(OPEN_HAND[f]),0)})
            # The staff's palm is a native plate beneath the original forearm.
            dx,dy=(int(np.floor(n+.5)) for n in at['matrix'][4:])
            hand_grip=np.roll(alpha(GRIP),(dy,dx),axis=(0,1))
            if np.count_nonzero(hand_grip)!=310: raise ValueError('Unexpected supporting grip')
            cases[side,f,'staff']=(axis,dict(hands,grip=hand_grip))
    assets={};items={}
    def save(image):
        out=io.BytesIO();image.save(out,format='PNG',compress_level=9);data=out.getvalue()
        key=hashlib.sha256(data).hexdigest();assets[key+'.png']=data;return key

    for row in rows:
        item=str(row['item'])
        if row['holds'] or item in items: raise ValueError('Incomplete glove')
        tracks=items[item]={}
        for layer in row['layers']:
            source_side=layer['id'].split(':')[-1]
            side={'left':'near','right':'far'}[source_side]
            reviewed=layer['id']=='reviewed-gloves:'+item+':'+source_side
            original=layer['id']=='focus-overlap:gloves:'+item+':'+source_side and row['status']=='preserved-reviewed-existing' and layer in donor['layers']
            if not (reviewed or original) or layer['binding']!={'kind':'fixed'} or len(layer['frames'])!=8: raise ValueError('Foreign glove material')
            track=tracks[side]=[]
            for f in range(8):
                phase={}
                for form in ('normal','open','staff'):
                    if (side,f,form) not in cases: continue
                    axis,parts=cases[side,f,form]
                    axes=[point(p,source_side.upper()+'_HANDCENTER')-point(p,source_side.upper()+'_WRIST') for p in donor['poses']]
                    def score(j):
                        cosine=np.dot(axes[j],axis)/np.linalg.norm(axes[j])/np.linalg.norm(axis)
                        return round(float(cosine),3),j==f,-abs(j-f)
                    source_frame=max(range(8),key=score)
                    sha=layer['frames'][source_frame];im=Image.open(io.BytesIO(library[sha])).convert('RGBA')
                    if im.size!=(640,640): raise ValueError('Wrong glove material size')
                    union=np.maximum.reduce(list(parts.values()));area=int(np.count_nonzero(union))
                    if not 170<area<2500: raise ValueError('Unexpected wrist area '+str((item,side,form,f,area)))
                    bound=np.asarray(bind(im,union,axis,axes[source_frame]))
                    if np.count_nonzero(bound[:,:,3])<.58*area: raise ValueError('Glove fit lost its material '+str((item,side,form,f)))
                    registered=phase[form]=dict(source=sha,sourceFrame=source_frame)
                    for name,coverage in parts.items():
                        part=bound.copy()
                        part[:,:,3]=np.minimum(part[:,:,3],coverage)
                        part[part[:,:,3]==0]=0
                        if not np.any(part[:,:,3]): raise ValueError('Invisible owned finger group')
                        registered[name]=save(Image.fromarray(part))
                track.append(phase)
        if set(tracks)!={'near','far'}: raise ValueError('Incomplete glove pair')
    if len(items)!=10: raise ValueError('Expected ten independent glove IDs')
    assets['registration.json']=json.dumps(dict(sourceArchive=ARCHIVES['focus'],pins=pins,items=items),separators=(',',':')).encode()
    return assets



def materialize(bank):
    import struct
    with zipfile.ZipFile(OUTPUT) as z:
        registration=json.loads(z.read('registration.json'))
        if len(registration['pins'])!=8 or len(registration['items'])!=10: raise ValueError('Incomplete North focus gloves')
        seen=set()
        for sides in registration['items'].values():
            if set(sides)!={'near','far'}: raise ValueError('Missing hand')
            for phases in sides.values():
                if len(phases)!=8: raise ValueError('Incomplete North glove cycle')
                for forms in phases:
                    for panel in forms.values():
                        for name in ('hand','behind','grip'):
                            key=panel.get(name)
                            if not key or key in seen: continue
                            data=z.read(key+'.png')
                            if hashlib.sha256(data).hexdigest()!=key or struct.unpack('>II',data[16:24])!=(640,640):
                                raise ValueError('Invalid North glove material')
                            (bank/(key+'.png')).write_bytes(data)
                            seen.add(key)
    return registration


if __name__=='__main__':
    entries=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUTPUT) as z:
            old=json.loads(z.read('registration.json'));new=json.loads(entries['registration.json'])
            if old['sourceArchive']!=new['sourceArchive'] or old['pins']!=new['pins'] or old['items'].keys()!=new['items'].keys(): raise ValueError('Stale glove rig')
            for item, sides in new['items'].items():
                for side,phases in sides.items():
                    for f,forms in enumerate(phases):
                        for form,row in forms.items():
                            ref=old['items'][item][side][f][form]
                            if ref['source']!=row['source'] or ref['sourceFrame']!=row['sourceFrame'] or ref.keys()!=row.keys(): raise ValueError('Changed source or fingers')
                            for k in row.keys()-{'source','sourceFrame'}:
                                expected=Image.open(io.BytesIO(entries[row[k]+'.png']))
                                stored=Image.open(io.BytesIO(z.read(ref[k]+'.png')))
                                if expected.size!=stored.size or expected.tobytes()!=stored.tobytes(): raise ValueError('Changed glove phase')
    else:
        with zipfile.ZipFile(OUTPUT,'w') as z:
            for k,v in sorted(entries.items()): z.writestr(zipfile.ZipInfo(k),v,compress_type=zipfile.ZIP_DEFLATED)
