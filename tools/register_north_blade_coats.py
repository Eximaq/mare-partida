"""Mount the original North coat panels in the native blade layer stack."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache

from blade_sleeves_panels import clipped, map_panel
from north_blade_anatomy import ROOT,original,rigs
from north_rifle_clothing_panels import split_front
from articulated_sleeve_projection import bend
from register_north_blade_gloves import contacts
from register_south_focus_trousers import OUTFITS,index

OUT=ROOT/'tools/rework-combat-wardrobe/north-blade-coats.zip'
IDS=(6,7,130,137,144,151,158,165,172,179)


def generate():
    import numpy as np
    from PIL import Image,ImageFilter
    records={r['id']:r for r in index(OUTFITS)['records']}
    lookup=json.loads((OUTFITS/'archives/archive-index.json').read_bytes())['sources']
    @lru_cache(maxsize=64)
    def texture(key):
        ref=lookup[key]
        with zipfile.ZipFile(OUTFITS/'archives'/ref['archive']) as z:data=z.read(ref['path'])
        if hashlib.sha256(data).hexdigest()!=key:raise ValueError('Changed rear garment')
        im=Image.open(io.BytesIO(data)).convert('RGBA')
        if im.size!=(512,512):raise ValueError('Unexpected resting material')
        padded=Image.new('RGBA',(640,640));padded.paste(im,(64,64));return padded

    originals={};reg={'rigs':{},'sources':{}};assets={}
    def store(im):
        output=io.BytesIO();im.save(output,format='PNG',compress_level=5)
        data=output.getvalue();key=hashlib.sha256(data).hexdigest();assets[key+'.png']=data;return key
    for item in IDS:
        name=f'male-torso{item}-north-frozen-idle-native' if item!=151 else 'male-pants133-idle-north-isolated-r2-coat151-native'
        r=records[name];pack=r['pack'];d=pack['directions']['north']
        if r['body']!='male' or r['equipment']['torso']!=item or pack['frame']!={'width':128,'height':128} or pack['pivot']!={'x':64,'y':112} or pack['density']!=4:raise ValueError('Invalid original '+name)
        parts=[];src=[]
        for l in sorted(d['layers'],key=lambda l:l['depth']):
            n=l['id']
            if not n.startswith((f'coat{item}-','coat-front-','sleeve-aperture-','original-neck-coverage')):continue
            k=l['source'];b=l['binding']
            if k not in r['sourceRefs'] or b['kind'] not in ('bone','rigid') or 'mask' in l:raise ValueError('Unowned coat part '+n)
            parts.append((n,b['a'],b['b'],texture(k)));src.append([n,k,b['a'],b['b']])
        if not any('core' in n[0] for n in parts) or not any('hem' in n[0] for n in parts):raise ValueError('Missing torso')
        # 144/179 have a continuous shoulder mantle instead of articulated sleeves.
        originals[item]=d['rest'],parts if item in (144,179) else split_front(item,parts,rifle=True)
        reg['sources'][item]=dict(record=name,layers=src)
    yy,xx=np.indices((640,640))
    for family,pack in rigs().items():
        d=pack['directions']['north'];native={l['id']:l for l in d['layers']}
        pins,hands=contacts(family,d)
        for key in ('torso','shorts','legs','underbody'):
            pins[key]=native[key]['frames']
        label=pins['forearm-hand-near'][0]
        block=reg['rigs'][label]=dict(family=family,pins=pins,items={i:[] for i in IDS},waist={i:[] for i in IDS})
        for f,p in enumerate(d['poses']):
            def joint(key):
                val=p[key];x,y=4*val['x'],4*val['y']
                # Only arms are mirrored in the two re-authored sword drawings.
                return np.array([639-x if family=='restored' and key.startswith(('LEFT ','RIGHT ')) else x,y])
            def alpha(k):
                return np.asarray(original(native[k]['frames'][f]))[:,:,3]
            stock=np.asarray(original(native['shorts']['frames'][f]))
            navy=(stock[:,:,3]>0)&(stock[:,:,2].astype(int)>=stock[:,:,0].astype(int))
            for item,(rest,parts) in originals.items():
                groups={}
                def add(n,im):
                    if im.getbbox():groups.setdefault(n,Image.new('RGBA',(640,640))).alpha_composite(im)
                def anchor(key):
                    return 64+np.array([rest[key]['x']*4,rest[key]['y']*4])
                moving={}
                for n,a,b,im in parts:
                    if (a,b)==('NECK','HIP'):
                        top=joint('BODY NECK');hip=joint('HIP')
                        # The mantle is mounted on the actor's shoulder span.
                        w=abs(joint('LEFT SHOULDER')[0]-joint('RIGHT SHOULDER')[0])/abs(anchor('LEFT SHOULDER')[0]-anchor('RIGHT SHOULDER')[0])
                        add('back' if 'rear' in n else 'core',map_panel(im,anchor(a),anchor(b),top,hip,w))
                        continue
                    side,first=a.split(' ',1);last=b.split(' ',1)[1]
                    if (first,last) not in (('SHOULDER','ELBOW'),('ELBOW','ARM')):raise ValueError('Unknown sleeve joint')
                    # In the wardrobe archive side names designate the near/far
                    # image side of a resting coat. Preserve that actual side.
                    near=(side=='LEFT')!=(family=='restored')
                    tag='near' if near else 'far';target='RIGHT' if near else 'LEFT'
                    moving.setdefault((side,target,tag),[]).append((n,first,im))
                for (side,target,tag),sleeve_parts in moving.items():
                  arm=tuple(anchor(side+' '+k) for k in ('SHOULDER','ELBOW','ARM'))
                  fit=tuple(joint(target+' '+k) for k in ('SHOULDER','ELBOW','ARM'))
                  # Triangulate the entire elbow turn on the same seam.
                  # Both surfaces now meet even during an acute sword swing.
                  for n,first,im in sleeve_parts:
                    sleeve=bend(im,arm,fit)
                    start=fit[0] if first=='SHOULDER' else fit[1]
                    if family=='daggers' and f in (1,2,3,4,5,6) and first=='ELBOW':
                        # When thrusting away from the camera, the far ends of
                        # both forearms turn behind the upper arms and trunk.
                        # Retain only the flexed cuff emerging around the elbow.
                        radius=23 if f in (1,2,5,6) else 17
                        surface=alpha('forearm-hand-'+tag)
                        cover=(xx-start[0])**2+(yy-start[1])**2<=radius**2
                        sleeve=clipped(sleeve,np.where(cover,surface,0))
                    if tag in hands[f]:sleeve=clipped(sleeve,255-hands[f][tag][0])
                    add('back' if 'aperture-rear' in n else tag+('Upper' if first=='SHOULDER' else 'Lower'),sleeve)
                if 'core' not in groups:raise ValueError('Missing back panel')
                core=groups['core']
                for tag,target in [('near','RIGHT'),('far','LEFT')]:
                    a=joint(target+' SHOULDER');b=joint(target+' ELBOW');axis=b-a
                    dx=xx-a[0];dy=yy-a[1]
                    caps=(dx*dx+dy*dy<=29**2)&(dx*axis[0]+dy*axis[1]<=20*np.linalg.norm(axis))
                    if item in (144,179):
                        for key,suffix in [('upper-arm-','Upper'),('forearm-hand-','Lower')]:
                            cover=alpha(key+tag).copy()
                            if tag in hands[f]:cover=np.minimum(cover,255-hands[f][tag][0])
                            add(tag+suffix,clipped(core,cover))
                    else:add(tag+'Shoulder',clipped(core,np.where(caps,alpha('upper-arm-'+tag),0)))
                if family=='daggers' and f in (1,2,3,4,5,6):
                    # The original mannequin allocates patches of the shoulder
                    # blades to folded arm tiles. From the rear camera the
                    # actual back occludes those projected wrists. Repaint
                    # only the same coat's back across its true torso outline.
                    neck=joint('BODY NECK');hip=joint('HIP');center=np.interp(yy,[neck[1]+8,hip[1]],[neck[0],hip[0]])
                    half=np.interp(yy,[neck[1]+8,neck[1]+34,hip[1]-24,hip[1]],[32,44,32,27])
                    region=(abs(xx-center)<half)&(yy>=neck[1]+6)&(yy<=hip[1]+5)
                    limbs=np.maximum.reduce([alpha(k) for k in ('upper-arm-far','forearm-hand-far','upper-arm-near','forearm-hand-near')])
                    add('nearDrape',clipped(core,np.where(region,limbs,0)))
                overlap=(navy&(np.asarray(core)[:,:,3]>0)).ravel()
                edges=np.flatnonzero(np.diff(np.r_[False,overlap,False])).reshape(-1,2)
                block['waist'][item].append([[int(a),int(b-a)] for a,b in edges])
                block['items'][item].append({k:store(v) for k,v in groups.items()})
    assets['register.json']=json.dumps(reg,separators=(',',':')).encode();return assets


def materialize(bank):
    with zipfile.ZipFile(OUT) as z:
        reg=json.loads(z.read('register.json'));seen=set()
        if len(reg['rigs'])!=3 or set(map(int,reg['sources']))!=set(IDS):raise ValueError('Unregistered wardrobe')
        for block in reg['rigs'].values():
            if block['items'].keys()!=reg['sources'].keys():raise ValueError('Missing garment')
            for item,rows in block['items'].items():
                if len(rows)!=8 or len(block['waist'][item])!=8:raise ValueError('Incomplete cycle')
                for row in rows:
                    if 'core' not in row:raise ValueError('Missing core')
                    for key in row.values():
                        if key in seen:continue
                        raw=z.read(key+'.png')
                        if hashlib.sha256(raw).hexdigest()!=key or struct.unpack('>II',raw[16:24])!=(640,640):raise ValueError('Unexpected coat plane')
                        (bank/(key+'.png')).write_bytes(raw);seen.add(key)
    return reg


if __name__=='__main__':
    raw=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUT) as z:
            prev=json.loads(z.read('register.json'));cur=json.loads(raw['register.json'])
            if prev['sources']!=cur['sources'] or prev['rigs'].keys()!=cur['rigs'].keys():raise ValueError('Changed sources')
            for rig,block in cur['rigs'].items():
                old=prev['rigs'][rig]
                if old['pins']!=block['pins'] or old['waist']!=block['waist']:raise ValueError('Changed rig or waist')
                for item,rows in block['items'].items():
                    for a,b in zip(rows,old['items'][item],strict=True):
                        if a.keys()!=b.keys():raise ValueError('Changed moving part')
                        for part in a:
                            if Image.open(io.BytesIO(raw[a[part]+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(b[part]+'.png'))).tobytes():raise ValueError('Changed garment')
    else:
        with zipfile.ZipFile(OUT,'w') as z:
            for k,v in sorted(raw.items()):z.writestr(zipfile.ZipInfo(k),v,compress_type=zipfile.ZIP_DEFLATED)
