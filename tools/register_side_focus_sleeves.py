"""Bind the original six profile coats to the standing and bent staff arms."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache

from export_staff_coats import BANK, ROOT, weapons
from register_south_focus_trousers import OUTFITS, index
from register_orb_gloves import PALM
from register_staff_gloves import WRISTS, TIPS

OUT = ROOT / 'tools/rework-combat-wardrobe/side-focus-sleeves.zip'
SIZE = (640, 640)
# Inside of the visible sleeve, traced at the original shoulder and cuff.
# The second profile follows the side seam exposed when the forearm rises.
SEAMS = {
    6: ([(289,242),(301,234),(313,235),(326,240),(331,247),(330,256),(327,266),(317,269),(300,267),(291,258)], [(238,302),(268,307)]),
    7: ([(282,244),(294,232),(304,226),(316,229),(325,240),(329,253),(327,269),(326,280),(316,289),(306,291),(292,287),(280,271)], [(232,299),(287,299)]),
    130: ([(292,244),(299,237),(308,234),(320,236),(332,243),(332,265),(329,288),(330,307),(335,321),(334,338),(324,341),(307,341),(290,336),(280,320),(281,302),(291,281)], [(237,300),(290,297),(340,293)]),
    137: ([(289,248),(294,239),(305,236),(320,240),(330,249),(332,263),(327,289),(330,309),(334,335),(331,345),(318,351),(302,352),(281,346),(281,327),(287,300),(291,283)], [(240,296),(295,295),(350,289)]),
    144: ([(297,249),(313,245),(328,252),(332,266),(321,281),(318,296),(321,317),(321,328),(315,332),(301,330),(299,321),(298,300),(298,280)], [(245,283),(292,275),(333,265)]),
    172: ([(296,258),(307,249),(320,249),(324,259),(316,279),(316,288),(320,303),(325,317),(327,341),(323,349),(311,352),(296,348),(296,328),(298,313),(288,292),(289,272)], [(252,291),(294,289),(349,278)]),
}


def generate():
    import numpy as np
    from PIL import Image, ImageDraw

    lookup = {b:json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in (BANK,OUTFITS)}
    @lru_cache(maxsize=80)
    def source(bank, sha):
        row=lookup[bank][sha]
        with zipfile.ZipFile(bank/'archives'/row['archive']) as z: raw=z.read(row['path'])
        if hashlib.sha256(raw).hexdigest()!=sha: raise ValueError('Changed source '+sha)
        im=Image.open(io.BytesIO(raw)).convert('RGBA')
        if bank==OUTFITS:
            if im.size!=(512,512): raise ValueError('Unregistered cloth density')
            padded=Image.new('RGBA',SIZE);padded.paste(im,(64,64));return padded
        if im.size!=SIZE:raise ValueError('Unregistered receiving anatomy')
        return im

    weapon=weapons()
    registered=next(r for r in weapon['orderedAttackProfiles'] if r['id']=='authored-ordered-124-east')
    rig=next(r for r in weapon['records'] if r['id']=='orb17-east-native-layers')['basePack']['pack']['directions']['east']
    native={l['id']:l for l in rig['layers']}
    def point(p,k):return np.array([p[k]['x'],p[k]['y']])*4
    def map_panel(im,a,b,c,d,width=1.0):
        def basis(axis,w):
            return np.stack((axis,np.array([-axis[1],axis[0]])*w/np.linalg.norm(axis)),axis=1)
        u,v=b-a,d-c
        if min(np.linalg.norm(u),np.linalg.norm(v))<5:raise ValueError('Unregistered projected limb')
        inv=basis(u,1)@np.linalg.inv(basis(v,width))
        return im.transform(SIZE,Image.Transform.AFFINE,tuple(np.column_stack((inv,a-inv@c)).ravel()),Image.Resampling.NEAREST)
    def clipped(im,mask):
        rgba=np.array(im)
        rgba[:,:,3]=((rgba[:,:,3].astype(np.uint32)*mask+127)//255).astype('uint8');rgba[rgba[:,:,3]==0]=0
        return Image.fromarray(rgba)
    yy,xx=np.indices((640,640))
    records={r['id']:r for r in index(OUTFITS)['records']}
    assets={};items={};pins=[]
    def store(im):
        buf=io.BytesIO();im.save(buf,format='PNG',compress_level=6)
        raw=buf.getvalue();k=hashlib.sha256(raw).hexdigest();assets[k+'.png']=raw;return k
    def alpha(im):return np.asarray(im)[:,:,3]
    for f,st in enumerate(registered['states']):
        pins.append({l['id']:l['sha256'] for l in st['layers'] if l['id'] in ('torso','upper-arm-far','forearm-hand-far','upper-arm-near','grip')})
    open_pins={}
    for direction in ('east','west'):
        base=next(r['basePack'] for r in weapon['records'] if r['id']=='orb17-'+direction+'-native-layers')
        lower=base['pack']['directions'][direction]
        names=('torso','upper-arm-near','forearm-hand-near','upper-arm-far','forearm-hand-far')
        open_pins[direction]=[{k:next(l for l in lower['layers'] if l['id']==k)['frames'][f] for k in names} for f in range(8)]
    open_masks={'open':[],'orb':[]}
    orb=next(r for r in weapon['orderedAttackProfiles'] if r['id']=='authored-orb-17-east')
    for f,pose in enumerate(rig['poses']):
        def native_layer(k):
            l=native[k]
            return source(BANK,l['frames'][f] if 'frames' in l else l['source'])
        near=alpha(native_layer('forearm-hand-near'))
        hand=point(pose,'RIGHT HAND CENTER');joint=point(pose,'RIGHT ARM')
        axis=hand-joint;edge=joint-.6*axis
        right=np.where((xx-edge[0])*axis[0]+(yy-edge[1])*axis[1]>=0,near,0)
        for kind in open_masks:
            start,end=map(np.array,PALM[f] if kind=='orb' else (WRISTS[f],TIPS[f]))
            axis=end-start;dx=xx-start[0];dy=yy-start[1]
            region=(dx*axis[0]+dy*axis[1]>=0)&(dx*dx+dy*dy<55**2)&(xx>=343)&(yy>=227)
            if kind=='orb':
                actual=np.asarray(source(BANK,orb['states'][f]['layers'][0]['sha256']))
                behind=Image.new('RGBA',SIZE)
                for l in rig['layers']:
                    if l['id'] not in ('upper-arm-far','forearm-hand-far') and l['slot'] not in ('face','headBase','hair'):
                        behind.alpha_composite(native_layer(l['id']))
                region&=np.abs(actual.astype(int)-np.asarray(behind).astype(int)).max(axis=2)>4
                far=actual[:,:,3]
            else:far=alpha(native_layer('forearm-hand-far'))
            silhouette=np.maximum(right,np.where(region,far,0)).astype('uint8')
            if np.count_nonzero(silhouette)<500:raise ValueError('Missing original hand')
            im=Image.new('RGBA',SIZE);im.putalpha(Image.fromarray(silhouette));open_masks[kind].append(store(im))
    for item,(edge,side) in SEAMS.items():
        name=f'male-torso{item}-east-frozen-attack-native-candidate'
        r=records[name];d=r['pack']['directions']['east'];rest=d['rest']
        original=records[f'male-torso{item}-east-frozen-idle-native']
        known={l['source'] for l in original['pack']['directions']['east']['layers']}
        if r['body']!='male' or r['equipment']!={'torso':item} or r['pack']['pivot']!={'x':80,'y':128}:raise ValueError(name)
        owner=Image.new('RGBA',SIZE);parts=[]
        for l in sorted(d['layers'],key=lambda l:l['depth']):
            if l['id'].startswith('base:'):continue
            key=l['source']
            if key not in known or r['sourceRasterPadding'][key]!={'sourceSize':512,'offset':64} or l['slot'] not in ('underArms','top'):raise ValueError('Foreign cloth')
            owner.alpha_composite(source(OUTFITS,key));parts.append([l['id'],key])
        poly=Image.new('L',SIZE);ImageDraw.Draw(poly).polygon(edge,fill=255)
        arm=clipped(owner,np.asarray(poly))
        # Recover the textile behind the resting sleeve from this same coat's
        # editable side lining. Apply it only to the exposed region of the male
        # coat, bounded by its existing side seam and carrying its original hem.
        lining_record=records[f'female-torso{item}-east-frozen-attack-native']
        lining,=[l for l in lining_record['pack']['directions']['east']['layers'] if l['id']==f'coat{item}-native-fabric-side-lining']
        if lining['slot']!='top' or lining['binding']!={'kind':'fixed'}:raise ValueError('Invalid fabric backing')
        fabric=source(OUTFITS,lining['source']);left,top,right,bottom=arm.getbbox()
        limit=np.interp(yy,*zip(*side))
        backing=Image.new('RGBA',SIZE);patch=fabric.crop(fabric.getbbox()).resize((right-left,bottom-top),Image.Resampling.NEAREST)
        backing.paste(patch,(left,top));backing=clipped(backing,np.where((xx>=limit)&(alpha(arm)>0),255,0))
        core=clipped(owner,255-np.asarray(poly));core.alpha_composite(backing)
        # Overlap at the elbow by a few original rows so the elbow turn
        # maintains the stitch. No pixels are taken from another item.
        elbow=point(rest,'RIGHT ELBOW')
        upper=clipped(arm,np.where(yy<=elbow[1]+3,255,0));lower=clipped(arm,np.where(yy>=elbow[1]-3,255,0))
        row=items[item]=dict(source=name,panels=parts,backing=[lining_record['id'],lining['source']],grip=[],open=[],orb=[])
        for f,p in enumerate(rig['poses']):
            stock=registered['states'][f]
            limb={l['id']:source(BANK,l['sha256']) for l in stock['layers'] if l['id'] in ('upper-arm-near','grip','headBase','face','hair')}
            hair_head=np.maximum.reduce([alpha(limb[k]) for k in ('headBase','face','hair')])
            # The approved head is in front of the rear collar. The neck
            # extends below the chin; keep that part under the front collar.
            head=np.where(yy < 228+(point(p,'NECK')[1]-232),hair_head,0)
            def torso(im):
                return map_panel(im,point(rest,'NECK'),point(rest,'HIP'),point(p,'NECK'),point(p,'HIP'))
            for kind in ('grip','open','orb'):
                fore=point(p,'LEFT ELBOW')
                wrist=point(p,'LEFT ARM')
                if kind=='orb':
                    palm,tip=map(np.array,PALM[f]);wrist=palm+.28*(tip-palm)
                def arm_on(a,b,c):
                    up=map_panel(upper,point(rest,'RIGHT SHOULDER'),elbow,a,b)
                    down=map_panel(lower,elbow,point(rest,'RIGHT ARM'),b,c)
                    up.alpha_composite(down);return up
                far=arm_on(point(p,'LEFT SHOULDER'),fore,wrist)
                if kind=='grip':
                    # The separately authored stock hand, unlike the open
                    # palm rig, bends towards the staff. Locate its elbow
                    # and wrist on the real support panel before fitting.
                    y,x=np.nonzero(alpha(limb['grip']))
                    ex=x.min()+9;ey=np.median(y[x<=x.min()+9]);wx=x.max()-32;wy=np.median(y[x==wx])
                    if not (288<ex<307 and 281<ey<312 and 335<wx<359):raise ValueError('Unexpected staff arm')
                    near=arm_on(point(p,'RIGHT SHOULDER'),np.array([ex,ey]),np.array([wx,wy]))
                    cover=np.maximum(alpha(limb['upper-arm-near']),alpha(limb['grip']))
                    coat=clipped(torso(core),255-cover)
                else:
                    # Approved profile and relaxed forearm share the same
                    # silhouette. Keep the original sewn sleeve continuous.
                    near=torso(arm)
                    covers=[alpha(source(BANK,native[k]['frames'][f])) for k in ('upper-arm-near','forearm-hand-near')]
                    cover=np.maximum.reduce(covers);coat=clipped(torso(owner),255-cover)
                far.alpha_composite(coat);far.alpha_composite(near)
                row[kind].append(store(clipped(far,255-head)))
    receipt=dict(items=items,pins=pins,openPins=open_pins,hands=open_masks)
    assets['register.json']=json.dumps(receipt,separators=(',',':')).encode()
    return assets


def materialize(bank):
    with zipfile.ZipFile(OUT) as z:
        reg=json.loads(z.read('register.json'))
        if set(map(int,reg['items']))!=set(SEAMS) or len(reg['pins'])!=8:raise ValueError('Incomplete side coats')
        mask_keys=set(reg['hands']['open']+reg['hands']['orb'])
        for key in mask_keys:
            raw=z.read(key+'.png')
            if hashlib.sha256(raw).hexdigest()!=key:raise ValueError('Invalid open hand')
            (bank/(key+'.png')).write_bytes(raw)
        for row in reg['items'].values():
            if any(len(row[k])!=8 for k in ('open','orb','grip')):raise ValueError('Incomplete coat cycle')
            for key in set(row['open']+row['orb']+row['grip']):
                raw=z.read(key+'.png')
                if hashlib.sha256(raw).hexdigest()!=key or struct.unpack('>II',raw[16:24])!=SIZE:raise ValueError('Changed coat panel')
                (bank/(key+'.png')).write_bytes(raw)
    return reg


if __name__=='__main__':
    raw=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUT) as z:
            old=json.loads(z.read('register.json'));new=json.loads(raw['register.json'])
            if old['pins']!=new['pins'] or old['openPins']!=new['openPins'] or old['items'].keys()!=new['items'].keys():raise ValueError('Changed coat receiver')
            for kind,track in new['hands'].items():
                for key,previous in zip(track,old['hands'][kind],strict=True):
                    if Image.open(io.BytesIO(raw[key+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(previous+'.png'))).tobytes():raise ValueError('Changed distal hand')
            for item,row in new['items'].items():
                saved=old['items'][item]
                if any(row[k]!=saved[k] for k in ('source','panels','backing')):raise ValueError('Changed garment source')
                for k in ('open','orb','grip'):
                    for a,b in zip(row[k],saved[k],strict=True):
                        if Image.open(io.BytesIO(raw[a+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(b+'.png'))).tobytes():raise ValueError('Changed garment pixels')
    else:
        with zipfile.ZipFile(OUT,'w') as z:
            for k,v in sorted(raw.items()):z.writestr(zipfile.ZipInfo(k),v,compress_type=zipfile.ZIP_DEFLATED)
