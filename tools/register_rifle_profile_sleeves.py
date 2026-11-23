"""Bind every original side coat to the firearm's back, two upper arms and two forearms."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache
from export_staff_coats import BANK, ROOT, weapons
from register_south_focus_trousers import OUTFITS,index
from register_side_focus_sleeves import SEAMS
from blade_sleeves_panels import profile_panels,point,map_panel,clipped

OUT=ROOT/'tools/rework-combat-wardrobe/rifle-profile-sleeves.zip'
# Boundary of the near sleeve in each original, followed by the exposed side seam.
TAILORED={
 151:([(284,242),(292,228),(307,221),(323,225),(332,235),(334,249),(329,254),(330,277),(330,302),(332,313),(340,347),(334,354),(306,354),(299,346),(292,315),(289,302),(291,271)],[(230,303),(290,300),(350,291)]),
 158:([(301,255),(309,247),(323,248),(332,260),(332,272),(325,284),(320,303),(321,322),(324,347),(319,356),(302,357),(297,350),(296,327),(294,311),(294,288)],[(247,286),(305,278),(358,265)]),
 165:([(287,245),(295,236),(306,233),(318,237),(328,247),(331,258),(328,271),(328,298),(332,320),(339,344),(334,354),(307,358),(293,354),(286,347),(287,322),(287,301),(284,279),(284,258)],[(235,302),(294,296),(357,287)]),
 179:([(284,242),(289,228),(304,224),(319,226),(330,239),(332,251),(326,262),(320,279),(318,297),(318,318),(319,336),(315,345),(295,345),(285,338),(286,322),(288,301),(293,282),(293,258)],[(232,288),(294,281),(347,270)]),
}


def generate():
    import numpy as np
    from PIL import Image,ImageFilter

    banks={b:json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in (BANK,OUTFITS)}
    @lru_cache(maxsize=96)
    def original(bank,k):
        row=banks[bank][k]
        with zipfile.ZipFile(bank/'archives'/row['archive']) as z:data=z.read(row['path'])
        if hashlib.sha256(data).hexdigest()!=k:raise ValueError('Changed garment/anatomy '+k)
        im=Image.open(io.BytesIO(data)).convert('RGBA')
        if bank==OUTFITS:
            if im.size!=(512,512):raise ValueError('Wrong source density')
            p=Image.new('RGBA',(640,640));p.paste(im,(64,64));return p
        if im.size!=(640,640):raise ValueError('Wrong receiving anatomy')
        return im
    records={r['id']:r for r in index(OUTFITS)['records']}
    data=weapons()['records'];rigs={};sources={};frames={};library={};assets={}
    def store(im):
        if not im.getbbox():return None
        stream=io.BytesIO();im.save(stream,'PNG',compress_level=6)
        raw=stream.getvalue();k=hashlib.sha256(raw).hexdigest();assets[k+'.png']=raw;return k
    for item,cut in {**SEAMS,**TAILORED}.items():
        name,parts,record,lining,rest,_,_,core,upper,lower=profile_panels(item,cut,records,OUTFITS,original)
        sources[item]=dict(record=name,parts=parts,lining=[record,lining])
        library[item]=(rest,core,upper,lower,original(OUTFITS,lining));frames[item]=[]
    ids=('underbody','torso','shorts','upper-arm-far','forearm-hand-far','upper-arm-near','forearm-hand-near')
    poses={}
    for direction in ('east','west'):
        r=next(r for r in data if r['body']=='male' and r['item']==4 and r['direction']==direction)
        pack=r['basePack']['pack'];d=pack['directions'][direction];poses[direction]=d['poses']
        if pack['pivot']!={'x':80,'y':128} or pack['density']!=4 or pack['frame']!={'width':160,'height':160} or d['clip']!={'frames':8,'fps':12,'loop':False,'contactFrame':4}:
            raise ValueError('Unregistered rifle body')
        layers={l['id']:l for l in d['layers']}
        if any(layers[k]['binding']!={'kind':'fixed'} for k in ids):raise ValueError('Moved rifle arm')
        rigs[direction]={k:layers[k]['frames'] for k in ids}
    # This donor keeps the entire lateral torso under the hanging sleeve. Its
    # alpha alone supplies the anatomical contour; none of its skin is copied.
    rest_body=records['male-torso6-east-frozen-idle-native']['pack']['directions']['east']
    torso_key=next(l['source'] for l in rest_body['layers'] if l['id']=='base:torso')
    stationary=np.asarray(original(OUTFITS,torso_key))[:,:,3]
    yy,xx=np.indices((640,640))
    def extent(alpha,row):
        line=np.max(alpha[max(0,row-1):row+2],axis=0)
        good=np.flatnonzero(line>64)
        return np.array([good[0],good[-1]]) if good.size else None
    def shaped_core(cloth,back,ref,actual,waist,backing_material):
        # Fit each horizontal strip to the receiver's actual ribcage. The
        # markers alone stay fixed while the back leans out during recoil.
        src=point(ref,'RIGHT SHOULDER');hip=point(ref,'HIP')
        dst=point(actual,'RIGHT SHOULDER')
        scale=(waist-dst[1])/(hip[1]-src[1])
        if not .6<scale<1.65:raise ValueError('Incompatible torso length')
        yref=np.array([227,235,244,254,265,280,295,308,318])
        ydst=np.rint((yref-src[1])*scale+dst[1]).astype(int)
        donor=np.array([extent(stationary,y) for y in yref]);target=np.array([extent(back,y) for y in ydst])
        if min(np.diff(donor).ravel())<18 or min(np.diff(target).ravel())<18:raise ValueError('Incomplete ribcage')
        # Authored side lining fills the area exposed by the original hanging
        # arm rotating away from the waist. Sample only that garment's textile.
        fabric=Image.new('RGBA',(640,640));x0,y0,x1,y1=cloth.getbbox()
        sample=backing_material.crop(backing_material.getbbox()).resize((x1-x0,y1-y0),Image.Resampling.NEAREST)
        fabric.paste(sample,(x0,y0))
        cover=np.where((yy>=236)&(yy<=320),stationary,0)
        fabric=clipped(fabric,cover);fabric.alpha_composite(cloth)
        rgba=np.asarray(fabric);out=np.zeros_like(rgba);x=np.arange(640)
        top=max(0,round((y0-src[1])*scale+dst[1])-1);last=min(639,round((y1-src[1])*scale+dst[1])+1)
        for y in range(top,last+1):
            original_y=round(src[1]+(y-dst[1])/scale)
            if not 0<=original_y<640:continue
            a,b=(np.interp(original_y,yref,donor[:,j]) for j in (0,1))
            left,right=(np.interp(y,ydst,target[:,j]) for j in (0,1))
            positions=np.interp(x,[left-90,left,right,right+90],[a-90,a,b,b+90])
            indices=np.rint(positions).astype(int).clip(0,639)
            valid=(x>=left-90)&(x<right+90);out[y,valid]=rgba[original_y,indices[valid]]
        return Image.fromarray(out)
    for f,p in enumerate(poses['east']):
        native={}
        for k in ids:
            im=original(BANK,rigs['east'][k][f])
            if not np.array_equal(np.asarray(im)[:,::-1],np.asarray(original(BANK,rigs['west'][k][f]))):raise ValueError('Different side mirror '+k)
            native[k]=np.asarray(im)
        shorts=native['shorts'];navy=(shorts[:,:,3]>80)&(shorts[:,:,2].astype(int)>shorts[:,:,0].astype(int))
        band=np.nonzero(navy.sum(axis=1)>=13)[0]
        waist=int(band[0])-3
        # A lowered gun arm may occlude the front waistband. Anchor it to the
        # actual pelvis/feet, which this upright rig draws before both arms.
        hip=point(p,'HIP')
        if not 300<waist<340 or not 293<hip[0]<346:raise ValueError('Unexpected rifle waist')
        # Restrict the remote arm to its actually drawn contour plus the seam
        # allowance. The other arm occludes this layer naturally at runtime.
        far={}
        for k in ('upper-arm-far','forearm-hand-far'):
            support=Image.fromarray(native[k][:,:,3]);box=support.getbbox()
            if box:
                l,t,r,b=box;rect=(max(0,l-8),max(0,t-8),min(640,r+8),min(640,b+8))
                support.paste(support.crop(rect).filter(ImageFilter.MaxFilter(17)),rect)
            far[k]=np.asarray(support)
        for item,(rest,core,upper,lower,backing_material) in library.items():
            front=shaped_core(core,native['underbody'][:,:,3],rest,p,waist,backing_material)
            row={'core':store(front)}
            for side,depth in [('RIGHT','near'),('LEFT','far')]:
                shoulder,elbow,wrist=[point(p,side+' '+j) for j in ('SHOULDER','ELBOW','ARM')]
                for a,b,c,d,tile,k in [('RIGHT SHOULDER','RIGHT ELBOW',shoulder,elbow,upper,'upper-arm-'),('RIGHT ELBOW','RIGHT ARM',elbow,wrist,lower,'forearm-hand-')]:
                    layer=k+depth
                    garment=map_panel(tile,point(rest,a),point(rest,b),c,d)
                    if depth=='far':garment=clipped(garment,far[layer])
                    if layer=='upper-arm-near':
                        delta=(xx-shoulder[0])**2+(yy-shoulder[1])**2
                        top=(delta<34**2)&(yy<shoulder[1]+20)
                        cap=clipped(front,np.where(top,native[layer][:,:,3],0))
                        cap.alpha_composite(garment);garment=cap
                    key=store(garment)
                    if key:row[layer]=key
            frames[item].append(row)
    assets['register.json']=json.dumps(dict(sources=sources,rigs=rigs,items=frames),separators=(',',':')).encode()
    return assets


def materialize(bank):
    with zipfile.ZipFile(OUT) as z:
        r=json.loads(z.read('register.json'))
        if set(map(int,r['items']))!=set(SEAMS)|set(TAILORED):raise ValueError('Incomplete rifle coat catalog')
        for track in r['items'].values():
            if len(track)!=8 or not all('core' in p for p in track):raise ValueError('Incomplete torso cycle')
            for p in track:
                for k in set(p.values()):
                    raw=z.read(k+'.png')
                    if hashlib.sha256(raw).hexdigest()!=k or struct.unpack('>II',raw[16:24])!=(640,640):raise ValueError('Invalid rifle textile')
                    (bank/(k+'.png')).write_bytes(raw)
        return r


if __name__=='__main__':
    data=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUT) as z:
            prev=json.loads(z.read('register.json'));cur=json.loads(data['register.json'])
            if cur['sources']!=prev['sources'] or cur['rigs']!=prev['rigs']:raise ValueError('Changed garment provenance')
            for n,rows in cur['items'].items():
                for a,b in zip(rows,prev['items'][n],strict=True):
                    if a.keys()!=b.keys():raise ValueError('Changed depth ownership')
                    for k in a:
                        if Image.open(io.BytesIO(data[a[k]+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(b[k]+'.png'))).tobytes():raise ValueError('Changed garment pixels')
    else:
        with zipfile.ZipFile(OUT,'w') as z:
            for k,v in sorted(data.items()):z.writestr(zipfile.ZipInfo(k),v,compress_type=zipfile.ZIP_DEFLATED)
