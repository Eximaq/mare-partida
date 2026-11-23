"""Fit six original profile coats to the authored male sword and paired-dagger arms."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache

from blade_sleeves_panels import profile_panels, point, map_panel, clipped
from export_articulated_boots import BANK, OUTFITS, ROOT, index
from register_side_focus_sleeves import SEAMS

OUT=ROOT/'tools/rework-combat-wardrobe/blade-sleeves.zip'
BASE=ROOT/'tools/rework-base-hd'


def generate():
    import numpy as np
    from PIL import Image,ImageFilter

    lookup={b:json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in (BANK,OUTFITS,BASE)}
    @lru_cache(maxsize=128)
    def source(bank,key):
        row=lookup[bank][key]
        with zipfile.ZipFile(bank/'archives'/row['archive']) as z:
            raw=z.read(row['path'])
        if hashlib.sha256(raw).hexdigest()!=key:raise ValueError('Changed original '+key)
        im=Image.open(io.BytesIO(raw)).convert('RGBA')
        if bank==OUTFITS:
            if im.size!=(512,512):raise ValueError('Unexpected cloth density')
            plane=Image.new('RGBA',(640,640));plane.paste(im,(64,64));return plane
        if im.size!=(640,640):raise ValueError('Unexpected blade anatomy')
        return im

    weapons=index(BANK)
    bases=index(BASE)
    outfits={r['id']:r for r in index(OUTFITS)['records']}
    alpha=lambda im:np.asarray(im)[:,:,3]
    sources={};assets={};rigs={};coats={}
    panels={}
    for item,seams in SEAMS.items():
        name,parts,backing,lining,rest,owner,arm,core,upper,lower=profile_panels(item,seams,outfits,OUTFITS,source)
        panels[item]=(rest,core,upper,lower)
        sources[item]=dict(record=name,panels=parts,lining=[backing,lining])

    for family in ('sword','daggers'):
        bank=BANK if family=='sword' else BASE
        if family=='sword':
            sides={r['direction']:r['basePack']['pack'] for r in weapons['records'] if r['item']==1 and r['body']=='male' and r['direction'] in ('east','west')}
        else:
            sides={d:next(r for r in bases['records'] if r['id']==f'v7-daggers-{d}-modular8-{d}')['pack'] for d in ('east','west')}
        keys=('torso','shorts','upper-arm-far','forearm-hand-far','upper-arm-near','forearm-hand-near','headBase','face','hair')
        bank_rigs=rigs[family]={};clothing=coats[family]={n:[] for n in SEAMS}
        for d,pack in sides.items():
            track=pack['directions'][d]
            if pack['frame']!={'width':160,'height':160} or pack['density']!=4 or pack['pivot']!={'x':80,'y':128} or track['clip']['frames']!=8 or track['clip']['fps']!=12:raise ValueError('Unregistered rig')
            layers={l['id']:l for l in track['layers']};bank_rigs[d]={k:layers[k].get('frames') or [layers[k]['source']]*8 for k in keys}
        pack=sides['east']['directions']['east']
        yy,xx=np.indices((640,640))
        for f,p in enumerate(pack['poses']):
            tile={}
            for k,hashes in bank_rigs['east'].items():
                im=source(bank,hashes[f]);west=source(bank,bank_rigs['west'][k][f])
                if not np.array_equal(np.asarray(im)[:,::-1],np.asarray(west)):raise ValueError('Unexpected mirror '+k)
                tile[k]=alpha(im)
            near=np.maximum(tile['upper-arm-near'],tile['forearm-hand-near'])
            far=np.maximum(tile['upper-arm-far'],tile['forearm-hand-far'])
            head=np.maximum.reduce([tile[k] for k in ('headBase','face','hair')])
            if family=='daggers':
                # The ordered source translates the head (-8,+4) only.
                head=np.roll(head,(4,-8),axis=(0,1))
            # Expose the front collar below the chin. Keep the player's head
            # and hair in front of the back collar above the original neckline.
            head=np.where(yy<point(p,'NECK')[1]-3,head,0)
            def sleeve_on(side,upper,lower,rest):
                shoulder=point(p,side+' SHOULDER');elbow=point(p,side+' ELBOW');wrist=point(p,side+' ARM')
                source_elbow=point(rest,'RIGHT ELBOW')
                a=map_panel(upper,point(rest,'RIGHT SHOULDER'),source_elbow,shoulder,elbow)
                b=map_panel(lower,source_elbow,point(rest,'RIGHT ARM'),elbow,wrist)
                a.alpha_composite(b);return a
            # The authored dagger pose labels keep the same HIP/NECK origins
            # as the rest sheet. The painted torso shifts frame-by-frame.
            # Register the actual shoulder and both ends of the stock waistband.
            stock=np.asarray(source(bank,bank_rigs['east']['shorts'][f]))
            navy=(stock[:,:,3]>80)&(stock[:,:,2].astype(int)>stock[:,:,0].astype(int))
            yrows=np.nonzero(navy.sum(axis=1)>=13)[0];waist=int(yrows[0])-3
            band=[np.nonzero(navy[y])[0] for y in range(waist+11,waist+16)]
            center=np.median([(r[0]+r[-1])/2 for r in band if len(r)>25])
            if not 275<center<355:raise ValueError('Missing authored waist')
            far_support=Image.fromarray(far);box=far_support.getbbox()
            if box:
                l,t,r,b=box;box=(max(0,l-6),max(0,t-6),min(640,r+6),min(640,b+6))
                expanded=far_support.crop(box).filter(ImageFilter.MaxFilter(13));far_support.paste(expanded,box)
            for item,(rest,core,upper,lower) in panels.items():
                shoulder=point(rest,'RIGHT SHOULDER');hip=point(rest,'HIP')
                a=point(p,'RIGHT SHOULDER');b=np.array([center,waist])
                scale=(b[1]-a[1])/(hip[1]-shoulder[1])
                shear=((b[0]-hip[0])-(a[0]-shoulder[0]))/(hip[1]-shoulder[1])
                inv_y=1/scale
                # Horizontal threads retain their width. The two pins permit
                # the sideways shift between the waist and the shoulders.
                body=core.transform((640,640),Image.Transform.AFFINE,(1,-shear*inv_y,shoulder[0]-a[0]+shear*a[1]*inv_y,0,inv_y,shoulder[1]-a[1]*inv_y),Image.Resampling.NEAREST)
                rear=sleeve_on('LEFT',upper,lower,rest)
                front=sleeve_on('RIGHT',upper,lower,rest)
                # A completely hidden far arm can still have keypoints. Use its
                # actual drawn support and the near body to resolve occlusion.
                if np.count_nonzero(far)<30:rear=Image.new('RGBA',(640,640))
                else:
                    rear=clipped(rear,np.asarray(far_support))
                    rear=clipped(rear,255-np.maximum.reduce([tile['torso'],near,head]).astype('uint8'))
                rear.alpha_composite(clipped(body,255-near))
                rear.alpha_composite(front);out=clipped(rear,255-head)
                if family=='sword':
                    padded=Image.new('RGBA',(768,768));padded.paste(out,(64,64));out=padded
                data=io.BytesIO();out.save(data,format='PNG',compress_level=6);raw=data.getvalue()
                key=hashlib.sha256(raw).hexdigest();assets[key+'.png']=raw
                clothing[item].append(key)
    assets['register.json']=json.dumps(dict(sources=sources,coats=coats,rigs=rigs),separators=(',',':')).encode()
    return assets


def materialize(bank,daggers,sword):
    with zipfile.ZipFile(OUT) as z:
        reg=json.loads(z.read('register.json'))
        for family,existing in [('sword',sword),('daggers',daggers)]:
            tracks=reg['coats'][family]
            if set(map(int,tracks))!=set(SEAMS) or set(map(int,existing['coats'])).intersection(SEAMS):raise ValueError('Duplicate or missing blade coats')
            for item,track in tracks.items():
                if len(track)!=8:raise ValueError('Incomplete sleeve cycle')
                for key in set(track):
                    raw=z.read(key+'.png');size=768 if family=='sword' else 640
                    if hashlib.sha256(raw).hexdigest()!=key or struct.unpack('>II',raw[16:24])!=(size,size):raise ValueError('Invalid sleeve material')
                    (bank/(key+'.png')).write_bytes(raw)
            existing['coats'].update(tracks)
            existing['profileSleeves']=reg['sources']
    return daggers,sword


if __name__=='__main__':
    raw=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUT) as z:
            previous=json.loads(z.read('register.json'));current=json.loads(raw['register.json'])
            if any(previous[k]!=current[k] for k in ('rigs','sources')):raise ValueError('Changed source or rig')
            for family,rows in current['coats'].items():
                for item,seq in rows.items():
                    for a,b in zip(seq,previous['coats'][family][item],strict=True):
                        if Image.open(io.BytesIO(raw[a+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(b+'.png'))).tobytes():raise ValueError('Changed cloth')
    else:
        with zipfile.ZipFile(OUT,'w') as z:
            for key,data in sorted(raw.items()):z.writestr(zipfile.ZipInfo(key),data,compress_type=zipfile.ZIP_DEFLATED)
