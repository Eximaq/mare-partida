"""Attach original male trouser pixels to the two authored lateral blade stances."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache
from pathlib import Path

from export_articulated_boots import BANK, OUTFITS, ROOT, index

DEST=ROOT/'tools/rework-combat-wardrobe/blade-trousers.zip'
IDS=(21,22,133,140,147,154,161,168,175,182)


def generate():
    import numpy as np
    from PIL import Image

    base=ROOT/'tools/rework-base-hd'
    banks={b:json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in (OUTFITS,base,BANK)}

    @lru_cache(maxsize=64)
    def original(key):
        bank=next(b for b,rows in banks.items() if key in rows)
        entry=banks[bank][key]
        with zipfile.ZipFile(bank/'archives'/entry['archive']) as z:
            raw=z.read(entry['path'])
        if hashlib.sha256(raw).hexdigest()!=key: raise ValueError('Changed original '+key)
        return Image.open(io.BytesIO(raw)).convert('RGBA')

    native=index(base)
    outfits=index(OUTFITS)
    donors={r['id']:r for r in outfits['records']}
    weapons=index(BANK)
    compressed=outfits['maleSidePunchOwnPants']['directions']['east']
    source_punch=next(r for r in native['records'] if r['id']==compressed['baseId'])
    if source_punch['sourcePackSHA256']!=compressed['baseSHA']:raise ValueError('Changed standing leg donor')
    punch=source_punch['pack']['directions']['east']
    rigs={'daggers':{direction:next(r for r in native['records'] if r['id']==f'v7-daggers-{direction}-modular8-{direction}')['pack']
                       for direction in ('east','west')},
          'sword':{direction:next(r for r in weapons['records'] if r['body']=='male' and r['direction']==direction and r['item']==1)['basePack']['pack']
                   for direction in ('east','west')}}
    result={'sources':{},'rigs':{},'items':{}}
    assets={}
    def gather(d,ids,f):
        im=Image.new('RGBA',(640,640))
        for l in d['layers']:
            if l['id'] in ids:im.alpha_composite(original(l['frames'][f]))
        return np.array(im)
    def span(mask,y,crotch):
        # The two intervals at/below the crotch track the two painted legs,
        # independently, even when the front knee lunges away from the back.
        seg=np.flatnonzero(np.diff(np.r_[False,mask[y],False])).reshape(-1,2)
        seg=sorted((tuple(row) for row in seg if row[1]-row[0]>=3),key=lambda row:row[1]-row[0],reverse=True)
        if not seg:raise ValueError(f'Missing contour at y={y}')
        if len(seg)>1 and y>=crotch:
            (l,a),(b,r)=sorted(seg[:2])
            return np.array([l,a-.5,b+.5,r],dtype=float)
        l,r=seg[0]
        if y<crotch and len(seg)>1:
            l=min(l,seg[1][0]);r=max(r,seg[1][1])
        return np.array([l,(l+r)/2-.25,(l+r)/2+.25,r],dtype=float)
    def find_split(mask,first,last):
        for y in range(first,last):
            # Ignore isolated paint ticks and seams one pixel high.
            if all(span(mask,t,0)[2]-span(mask,t,0)[1]>=4 for t in range(y,y+4)):
                return y
        raise ValueError('Expected both legs of an open stance')
    def broad(tex,src,dst,waists):
        out=np.zeros((640,640,4),dtype='uint8')
        sy,dy=waists
        sc=find_split(src,sy+42,sy+120)
        dc=find_split(dst,dy+42,dy+120)
        # At the source ankle and target ankle the sole is still below us.
        # Five knots preserve the seam, the first open row and the cuffs.
        src_knots=[sy,sc-9,sc,sc+16,430]
        dst_knots=[dy,dc-9,dc,dc+16,490]
        xs=np.arange(640)+.5
        def outline(mask,ys,top,split):
            points=np.unique(np.r_[top+12,np.arange(top+15,ys[-1],9),split-1,split+3,ys[-1]]).astype(int)
            rows=[]
            for y0 in points:
                support=np.median([span(mask,int(q),split) for q in range(y0-1,y0+2)],axis=0)
                rows.append(support)
            return np.stack([np.interp(ys,points,col) for col in np.asarray(rows).T],axis=1)
        sa=outline(src,np.arange(431),sy,sc)
        sb=outline(dst,np.arange(491),dy,dc)
        for y in range(dy-12,491):
            src_y=sy+y-dy if y<dy else np.interp(y,dst_knots,src_knots)
            iy=round(src_y)
            if not np.any(tex[iy,:,3]):continue
            # The belt above the skin neckline uses the first complete hip row.
            a=sa[iy].copy();b=sb[y].copy()
            # Retain the sewn allowance at the outside trouser seam of the
            # wider garments. Inner seams still follow each knee independently.
            b[0]-=1;b[-1]+=1
            origin=np.r_[a[0]-32,a,a[-1]+32]
            target=np.r_[b[0]-32,b,b[-1]+32]
            which=np.floor(np.interp(xs,target,origin)).astype(int).clip(0,tex.shape[1]-1)
            inside=(xs>=target[0])&(xs<target[-1]);out[y,inside]=tex[iy,which[inside]]
        return out
    def slim(tex,ref_lower,target_lower,waist):
        # The daggers keep the legs together and shift the upper hips while
        # the feet remain grounded. Use the receiving outline row by row.
        src_y,dst_y=waist
        out=np.zeros((640,640,4),dtype='uint8');coords=np.arange(640)+.5
        def support(mask,y):
            return np.median([span(mask,i,640)[[0,-1]] for i in range(y-2,y+3)],axis=0)
        src_knots=[src_y+17,405,495];dst_knots=[dst_y+17,405,495]
        a=np.array([support(ref_lower,i) for i in src_knots])
        b=np.array([support(target_lower,i) for i in dst_knots])
        centers=a.mean(axis=1);target_centers=b.mean(axis=1)
        sx=(b[0,1]-b[0,0])/(a[0,1]-a[0,0])
        if not .78<sx<1.28:raise ValueError('Unexpected side waist width '+str([a[0],b[0],sx]))
        for y in range(dst_y-10,490):
            iy=round(src_y+(y-dst_y)*(511-src_y)/(511-dst_y))
            if not np.any(tex[iy,:,3]):continue
            center=np.interp(iy,src_knots,centers);dest=np.interp(y,dst_knots,target_centers)
            which=np.floor(center+(coords-dest)/sx).astype(int).clip(0,639)
            out[y]=tex[iy,which]
        return out
    def png(im):
        stream=io.BytesIO();im.save(stream,format='PNG',optimize=True)
        raw=stream.getvalue();key=hashlib.sha256(raw).hexdigest();assets[key+'.png']=raw
        return key
    for family,views in rigs.items():
        limits={}
        for direction,p in views.items():
            d=p['directions'][direction]
            if p['frame']!={'width':160,'height':160} or p['pivot']!={'x':80,'y':128} or p['density']!=4 or d['clip']['frames']!=8 or d['clip']['fps']!=12:
                raise ValueError('Changed scale or attack clock')
            l={l['id']:l for l in d['layers']}
            limits[direction]={id:l[id]['frames'] for id in ('shorts','underbody','legs','forearm-hand-far','forearm-hand-near')}
            if any(l[id]['binding']!={'kind':'fixed'} for id in limits[direction]):raise ValueError('Moving source domain')
        result['rigs'][family]=limits
        e=views['east']['directions']['east'];outdir=result['items'][family]={}
        for f in range(8):
            for k,keys in limits['east'].items():
                if not np.array_equal(np.asarray(original(keys[f]))[:,::-1],np.asarray(original(limits['west'][k][f]))):
                    raise ValueError('WEST is not the registered mirror')
            lower=gather(e,('underbody','legs','shorts'),f)
            stock=gather(e,('shorts',),f)
            # The stock plate retains its signed outline after the current
            # hands occlude it. Stray specks in this layer can belong to the wrist.
            navy=(stock[:,:,2].astype(int)>stock[:,:,0].astype(int))&(stock[:,:,3]>80)
            ys=np.where(np.sum(navy,axis=1)>=13)[0]
            waist=int(ys[0])-3
            domain=(lower[:,:,3]>64)
            arms=gather(e,('upper-arm-far','forearm-hand-far','upper-arm-near','forearm-hand-near'),f)
            for item in IDS:
                if family=='sword':
                    name=({21:'male-pants21-walk-east',22:'male-pants22-walk-east',133:'male-pants133-walk-east-source-v18-candidate'}
                          .get(item,f'frozen-male-pants{item}-east-walk-v47'))
                    r=donors[name];d=r['pack']['directions']['east']
                    if r['body']!='male' or r['equipment']['pants']!=item or len(d['poses'])!=16:raise ValueError('Foreign walking source')
                    layers=[l for l in d['layers'] if l['id'].startswith('pants'+str(item)+'-') and l['slot']=='pants']
                    if not layers or any(l['binding']!={'kind':'fixed'} for l in layers):raise ValueError('Unowned fabric')
                    ref='lower-redrawn' if item in (21,22) else 'clothed018-visible-background'
                    support=next(l for l in d['layers'] if l['id']==ref)['frames'][0]
                    src=np.array(original(support))[:,:,3]>64
                    layers.sort(key=lambda layer:layer['depth'])
                    parts=[layer['frames'][0] for layer in layers]
                    tex=np.array(original(parts[0]))
                    sy=256 if item in (21,22) else 252
                    pixels=broad(tex,src,domain,(sy,waist))
                    # The decorated front panel is a separate hanging piece in
                    # the original stride. It hangs from the belt; stretching
                    # it between the two knees distorts its embroidery.
                    if len(parts)>1:
                        if len(parts)!=2 or 'panel' not in layers[1]['id']:raise ValueError('Unknown trouser part')
                        source_mid=np.mean(span(src,sy+14,640)[[0,-1]])
                        target_mid=np.mean(span(domain,waist+14,640)[[0,-1]])
                        skirt=original(parts[1])
                        shift_x=round(target_mid-source_mid)
                        panel=Image.new('RGBA',(640,640));panel.paste(skirt,(shift_x,waist-sy))
                        composed=Image.fromarray(pixels);composed.alpha_composite(panel);pixels=np.array(composed)
                else:
                    g=min(6,max(1,f))
                    if str(item) in compressed['items']:
                        name=compressed['baseId']+'/pants'+str(item);parts=[compressed['items'][str(item)]]
                    else:
                        name=f'male-pants{item}-attack-unarmed-east'+('-drawn8-candidate' if item==133 else '')
                        r=donors[name];d=r['pack']['directions']['east']
                        l,=[l for l in d['layers'] if l['id'].startswith('pants'+str(item)+'-')]
                        if r['equipment']!={'pants':item} or l['slot']!='pants' or l['binding']!={'kind':'fixed'}:raise ValueError('Unowned side cloth')
                        parts=[l['frames'][g] if l.get('frames') else l['source']]
                    tex=np.array(original(parts[0]));ref=gather(punch,('skin-arms-phase','shorts-phase'),g)
                    ref[:378]=gather(punch,('shorts-phase',),g)[:378]
                    # The arm above the abdomen in phases 1..6 never reaches
                    # the lower body support used to map a fitted leg.
                    pixels=slim(tex,ref[:,:,3]>64,domain,(318,waist))
                # On flattened sword/dagger receivers, apply only fabric in
                # front of the body. Native gloves, geometry and metal remain
                # separate passes. Keep both hands over the waist.
                pixels[:,:,3]=((pixels[:,:,3].astype('uint16')*(255-arms[:,:,3].astype('uint16'))+127)//255).astype('uint8')
                pixels[pixels[:,:,3]==0]=0
                im=Image.fromarray(pixels)
                bounds=im.getbbox()
                if not bounds or bounds[1]<290 or bounds[3]>505:raise ValueError('Wrong garment bounds')
                key=png(im.crop(bounds))
                code=family+'/'+str(item)
                entry=result['sources'].setdefault(code,dict(record=name,parts=[]))
                if entry['record']!=name:raise ValueError('Unstable cloth identity')
                entry['parts'].append(parts)
                outdir.setdefault(str(item),[]).append(dict(art=key,x=bounds[0],y=bounds[1],width=bounds[2]-bounds[0],height=bounds[3]-bounds[1]))
    assets['register.json']=json.dumps(result,separators=(',',':')).encode()
    return assets


def materialize(bank):
    with zipfile.ZipFile(DEST) as z:
        registry=json.loads(z.read('register.json'))
        for name,rows in registry['items'].items():
            if set(map(int,rows))!=set(IDS):raise ValueError('Incomplete blade wardrobe '+name)
            for track in rows.values():
                if len(track)!=8:raise ValueError('Incomplete attack cycle')
                for row in track:
                    key=row['art'];raw=z.read(key+'.png')
                    if hashlib.sha256(raw).hexdigest()!=key or struct.unpack('>II',raw[16:24])!=(row['width'],row['height']):raise ValueError('Invalid blade cloth')
                    (bank/(key+'.png')).write_bytes(raw)
    return registry


if __name__=='__main__':
    assets=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(DEST) as z:
            old=json.loads(z.read('register.json'));new=json.loads(assets['register.json'])
            if old['sources']!=new['sources'] or old['rigs']!=new['rigs']:raise ValueError('Changed source or receiver')
            for family,rows in new['items'].items():
                for item,track in rows.items():
                    for a,b in zip(old['items'][family][item],track,strict=True):
                        lhs=Image.open(io.BytesIO(z.read(a['art']+'.png')));rhs=Image.open(io.BytesIO(assets[b['art']+'.png']))
                        if (a['x'],a['y'],lhs.size,lhs.tobytes())!=(b['x'],b['y'],rhs.size,rhs.tobytes()):raise ValueError('Changed fitted material')
    else:
        with zipfile.ZipFile(DEST,'w') as z:
            for key,raw in sorted(assets.items()):z.writestr(zipfile.ZipInfo(key),raw,compress_type=zipfile.ZIP_DEFLATED)
