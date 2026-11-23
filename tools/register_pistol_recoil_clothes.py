"""Dress three original dual-pistol recoil tracks with their own two hands and coat panels."""
import hashlib
import io
import json
import re
import sys
import zipfile
from functools import lru_cache
from export_staff_coats import ROOT,BANK,weapons
from export_firearm_wardrobe import DIGESTS
from register_south_focus_trousers import OUTFITS,index
from register_staff_gloves import bind
from register_rifle_profile_sleeves import SEAMS,TAILORED
from blade_sleeves_panels import profile_panels,point,map_panel,clipped
from register_north_rifle_clothes import register_coats

OUT=ROOT/'tools/rework-combat-wardrobe/pistol-recoil-clothes.zip'
# Physical joints in the original, unmirrored 640px recoil. Each tuple is
# shoulder, elbow, wrist, palm centre and barrel tip. The receiving palette
# and signed hand plane decide the visible pixels around each attachment.
EAST=[
 [((308,254),(294,303),(295,336),(298,353),(370,401)),((335,253),(345,299),(355,325),(363,338),(431,375))],
 [((309,253),(292,298),(305,337),(313,355),(378,398)),((336,255),(345,300),(355,324),(363,337),(428,375))],
 [((310,252),(292,298),(328,329),(342,341),(408,356)),((336,253),(345,296),(353,307),(363,314),(435,323))],
 [((309,252),(294,306),(351,303),(365,302),(450,278)),((336,254),(340,305),(352,324),(366,327),(450,321))],
 [((310,250),(294,305),(344,274),(357,267),(438,260)),((336,255),(344,301),(354,301),(366,302),(450,294))],
 [((309,254),(355,276),(404,276),(419,273),(476,267)),((335,257),(368,298),(416,305),(429,307),(480,299))],
 [((310,251),(355,260),(411,248),(425,245),(470,225)),((334,253),(370,281),(421,282),(435,280),(480,261))],
 [((310,250),(355,259),(410,245),(424,242),(470,224)),((334,254),(370,280),(420,280),(435,278),(482,260))],
]
NORTH=[
 [((283,249),(266,300),(248,344),(246,360),(219,384)),((356,249),(376,301),(392,344),(397,361),(422,386))],
 [((283,249),(259,300),(243,343),(237,360),(221,375)),((356,248),(376,299),(396,343),(404,360),(423,373))],
 [((283,250),(260,303),(244,322),(233,334),(205,327)),((356,250),(371,300),(391,321),(404,333),(451,343))],
 [((283,250),(262,305),(247,314),(235,303),(221,282)),((356,250),(376,300),(393,313),(406,304),(431,276))],
 [((283,250),(258,296),(246,277),(248,263),(241,227)),((356,250),(381,296),(395,276),(393,264),(402,227))],
 [((283,250),(256,296),(244,282),(247,269),(242,244)),((356,250),(385,295),(396,283),(392,270),(402,242))],
 [((283,248),(260,266),(260,247),(267,236),(251,214)),((356,248),(381,266),(382,248),(374,237),(391,213))],
 [((283,248),(260,264),(260,245),(266,232),(251,210)),((356,248),(382,264),(383,245),(375,234),(391,211))],
]
DIRECTIONS=('north','east','west')


def generate():
    import numpy as np
    from PIL import Image,ImageFilter
    records={r['id']:r for r in index(OUTFITS)['records']}
    weapon_records={r['id']:r for r in weapons()['records']}
    archives={b:json.loads((b/'archives/archive-index.json').read_bytes()) for b in (BANK,OUTFITS)}
    pistol=archives[BANK]['pistolWardrobe']['directions']
    @lru_cache(maxsize=80)
    def raw(bank,k):
        ref=archives[bank]['sources'][k]
        with zipfile.ZipFile(bank/'archives'/ref['archive']) as z:data=z.read(ref['path'])
        if hashlib.sha256(data).hexdigest()!=k:raise ValueError('Changed owned material '+k)
        image=Image.open(io.BytesIO(data)).convert('RGBA')
        if bank==BANK:
            if image.size!=(640,640):raise ValueError('Changed pistol density')
            return image
        if image.size!=(512,512):raise ValueError('Changed profile cloth density')
        padded=Image.new('RGBA',(640,640));padded.paste(image,(64,64));return padded
    files={};result={}
    def emit(im):
        box=im.getbbox()
        if not box:return None
        buf=io.BytesIO();im.crop(box).save(buf,'PNG');data=buf.getvalue()
        k=hashlib.sha256(data).hexdigest();files[k+'.png']=data
        return [k,*box[:2]]
    north=json.loads(re.search(r'^ const w114NorthIndependent=(.+);$',(ROOT/'player-rework-native-hd.js').read_text(encoding='utf8'),re.M)[1])['frames']
    side=json.loads(re.search(r'^const ownW114Sides=(.+);$',(ROOT/'player-rework-weapon-native-hd.js').read_text(encoding='utf8'),re.M)[1])['114']
    yy,xx=np.indices((640,640))
    def capsule(a,b,width):
        a,b=np.array(a),np.array(b);axis=b-a
        t=np.clip(((xx-a[0])*axis[0]+(yy-a[1])*axis[1])/(axis@axis),0,1)
        return (xx-a[0]-t*axis[0])**2+(yy-a[1]-t*axis[1])**2<width**2
    groups={};witness={}
    for d in DIRECTIONS:
        row=pistol[d];r=weapon_records[row['id']]
        pins=row['poseSourceSHA256']
        if r['item']!=114 or r['direction']!=d or len(pins)!=8 or r['pivot']!=[80,128] or r['timeline']!=list(map(str,range(8))) or pins!=[s['approved']['sha256'] for s in r['states']]:raise ValueError('Unregistered pistol receiver')
        result[d]=dict(id=r['id'],archive=r['sourceArchiveSHA256'],fps=r['fps'],clock=r['timeline'],pins=pins,items={})
        groups[d]=[];witness[d]=[]
        for f,pin in enumerate(pins):
            image=raw(BANK,pin);q=np.asarray(image)
            if d=='north':
                registration=north[f]
                if registration['pin']!=pin:raise ValueError('Unregistered posterior trunk')
                material=raw(BANK,registration['ranks']).getchannel('A')
            else:
                p,k,_=side[d]['states'][f]
                if p!=pin:raise ValueError('Unregistered profile skin')
                material=raw(BANK,k).getchannel('A')
            native_mask=np.asarray(material)>0
            palms=row['slots']['gloves']['25'][f]['front']
            if len(palms)!=1:raise ValueError('Ambiguous owned pistol glove')
            glove=np.array(raw(BANK,palms[0]))[:,:,3]
            if d=='west':
                if not np.array_equal(glove,witness['east'][f][0][:,::-1]) or not np.array_equal(native_mask,witness['east'][f][1][:,::-1]) or not np.array_equal(q,np.array(raw(BANK,pistol['east']['poseSourceSHA256'][f]))[:,::-1]):
                    raise ValueError('West pistol is not already the mirrored native drawing')
                continue
            witness[d].append((glove,native_mask))
            targets=(NORTH if d=='north' else EAST)[f]
            # Split the signed two-hand footprint by the actual wrists rather
            # than a fixed side of screen: the hands cross vertically in profile.
            distances=[(xx-t[3][0])**2+(yy-t[3][1])**2 for t in targets]
            visible=[];weapons_mask=np.zeros_like(native_mask)
            for i,(shoulder,elbow,wrist,tip,muzzle) in enumerate(targets):
                part=np.where(distances[i]<=distances[1-i],glove,0)
                if d=='north':
                    # The posterior master paints a short cuff. Recover only the
                    # skin of the distal fingers in the signed gun-free material.
                    u=np.subtract(tip,wrist);v=u/np.linalg.norm(u)
                    window=capsule(wrist,tip,13)&((xx-wrist[0])*v[0]+(yy-wrist[1])*v[1]>-5)
                    part=np.maximum(part,np.where(window&native_mask,q[:,:,3],0))
                if np.count_nonzero(part)<130:raise ValueError(('Missing original palm',d,f,i))
                visible.append(part)
                weapons_mask|=capsule(tip,muzzle,18)&~native_mask&(q[:,:,3]>0)
            hand=np.maximum(*visible)
            if d=='north':
                # The North master carries two authored weapon-only RGBA planes.
                guns=np.maximum(*[np.array(raw(BANK,k))[:,:,3] for k in north[f]['metal']])
                weapons_mask=weapons_mask&(guns>0)
            if d=='east':
                # Dark blue is the base shorts, not part of a pistol.
                ink=q[:,:,:3].astype(int);navy=(ink[:,:,2]>ink[:,:,0]+3)&(ink[:,:,2]>ink[:,:,1])
                weapons_mask&=~navy
            protect=weapons_mask|(hand>0)|((yy<227)&(q[:,:,3]>0))
            groups[d].append((targets,visible,protect,native_mask))

    from export_north_firearm_wardrobe import ARCHIVE as NORTH_ARCHIVE,DIGEST as NORTH_DIGEST
    checkpoint=ROOT/'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18'
    def png(z,prefix,k):
        data=z.read(prefix+'/assets/'+k+'.png')
        if hashlib.sha256(data).hexdigest()!=k:raise ValueError('Changed glove textile')
        return Image.open(io.BytesIO(data)).convert('RGBA')
    def put(d,slot,item,origin,parts,f,art):
        row=result[d]['items'].setdefault(slot+str(item),dict(origin=origin,parts=parts,phases=[]))
        if len(row['phases'])!=f:raise ValueError('Wrong phase order')
        row['phases'].append(dict(front=emit(art)))
        if d=='east':put('west',slot,item,origin,parts,f,art.transpose(Image.Transpose.FLIP_LEFT_RIGHT))
    for d,name,sha in [('north',NORTH_ARCHIVE[:-4],NORTH_DIGEST),('east','pistolas114-laterais',DIGESTS['pistolas114-laterais'])]:
        data=(checkpoint/(name+'.zip')).read_bytes()
        if hashlib.sha256(data).hexdigest()!=sha:raise ValueError('Wrong pistol material source')
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            catalog=json.loads(z.read(name+'/catalog.json'));hands={}
            if d=='north':
                for row in catalog['northGloves']:
                    if row['phase']==0:hands.setdefault(row['item'],{})[row['side']]=[row['sha']]*8
                rig=catalog['originals']['north']['pack']['directions']['north']
                for s in ('left','right'):
                    layer=next(l for l in rig['layers'] if l['id']=='candidate-glove166-'+s)
                    hands.setdefault(166,{})[s]=[layer['frames'][0]]*8
            else:
                rig=json.loads(z.read(name+'/canonical-east.json'))['pack']['directions']['east']
                for key,parts in catalog.items():
                    if key.startswith('east/gloves/'):hands[int(key.split('/')[-1])]=dict(left=parts['16'],right=parts['18'])
            for item,pair in hands.items():
                for f,(pose,mask,_,_) in enumerate(groups[d]):
                    im=Image.new('RGBA',(640,640))
                    for s,hand in enumerate(('left','right')):
                        donor=png(z,name,pair[hand][f]);axis=(0,1)
                        if d=='east':
                            track=rig['poses'][f];prefix=('RIGHT','LEFT')[s]
                            w=point(track,prefix+'_WRIST');p=point(track,prefix+'_HANDCENTER');axis=p-w
                            sy,sx=np.where(np.asarray(donor)[:,:,3]>50)
                            if abs(sx.mean()-(640-p[0]))<abs(sx.mean()-p[0]):axis=axis*np.array([-1,1])
                        cloth=bind(donor,mask[s],np.subtract(pose[s][3],pose[s][2]),axis)
                        im.alpha_composite(cloth)
                    if np.count_nonzero(np.asarray(im)[:,:,3])<125:raise ValueError('No visible cuff')
                    put(d,'gloves',item,name+'/'+str(item),pair,f,im)
    # The profile donor's own lining, upper arm and forearm are separate
    # here. Only these textiles enter the output; its reference body is never drawn.
    for item,seam in {**SEAMS,**TAILORED}.items():
        name,parts,origin,lining,rest,_,_,core,upper,lower=profile_panels(item,seam,records,OUTFITS,raw)
        s0=point(rest,'RIGHT SHOULDER');e0=point(rest,'RIGHT ELBOW');w0=point(rest,'RIGHT ARM')
        for f,(arms,hands,protection,skin) in enumerate(groups['east']):
            distal=np.maximum(*hands)>0
            made=Image.new('RGBA',(640,640));pieces=[]
            for i,(s,e,w,t,_) in enumerate(arms):
                s,e,w=map(np.array,(s,e,w))
                sleeve=map_panel(upper,s0,e0,s,e)
                sleeve.alpha_composite(map_panel(lower,e0,w0,e,w))
                # Where the far limb goes behind the trunk its visible alpha
                # is restricted to its recorded forearm. The near limb draws last.
                if i==1:
                    support=(capsule(s,e,16)|capsule(e,w,14))&skin
                    outside=(xx>348)|(yy>=318)
                    sleeve=clipped(sleeve,np.where(support|outside,255,0))
                pieces.append(sleeve)
            made.alpha_composite(pieces[1])
            # The dual-pistol profile keeps the pelvis fixed. Its shoulder
            # lowers by a few pixels as both hands rise; keep the hem on the hip.
            h=point(rest,'HIP');p=np.array([320,314]);s=np.array(arms[0][0])
            middle=map_panel(core,s0,h,s,p)
            neararm=capsule(arms[0][0],arms[0][1],14)|capsule(arms[0][1],arms[0][2],12)
            # Preserve the character's real bare arm where the individual coat
            # has a short sleeve while maintaining its own shoulder cap.
            neararm&=skin&(yy>arms[0][0][1]+9)
            made.alpha_composite(clipped(middle,np.where(neararm,0,255)))
            made.alpha_composite(pieces[0])
            put('east','torso',item,name,parts+[['side-lining',lining]],f,clipped(made,np.where(protection|distal,0,255)))
    # North shares the registered static trunk and textile separation with the
    # long rifle. Supply the two recorded pistol elbow/wrist tracks instead.
    joint=[{s:(t[1],t[2]) for s,t in zip(('LEFT','RIGHT'),pose,strict=True)} for pose in NORTH]
    coats=register_coats(lambda k:raw(BANK,k),lambda im:im,recoil=joint)
    for item,row in coats.items():
        for f,p in enumerate(row['frames']):
            im=Image.new('RGBA',(640,640))
            if 'sleeves' in p:im.alpha_composite(p['sleeves'])
            im.alpha_composite(p['front'])
            protect=groups['north'][f][2]
            put('north','torso',item,row['source'],row['materials'],f,clipped(im,np.where(protect,0,255)))
    files['register.json']=json.dumps(result,separators=(',',':')).encode()
    return files


def pistol_recoil_clothes(folder):
    with zipfile.ZipFile(OUT) as z:
        result=json.loads(z.read('register.json'))
        if set(result)!=set(DIRECTIONS):raise ValueError('Incomplete pistol directions')
        for row in result.values():
            if len(row['items'])!=20 or any(len(v['phases'])!=8 for v in row['items'].values()):raise ValueError('Incomplete two-hand recoil')
        for n in z.namelist():
            if n=='register.json':continue
            data=z.read(n)
            if hashlib.sha256(data).hexdigest()+'.png'!=n:raise ValueError('Changed pistol garment')
            (folder/n).write_bytes(data)
        return result


if __name__=='__main__':
    files=generate()
    if '--verify' in sys.argv:
        with zipfile.ZipFile(OUT) as z:
            if set(z.namelist())!=files.keys() or any(z.read(k)!=v for k,v in files.items()):raise ValueError('Changed original pistol garment')
    else:
        with zipfile.ZipFile(OUT,'w') as z:
            for k,v in sorted(files.items()):z.writestr(zipfile.ZipInfo(k),v,compress_type=zipfile.ZIP_DEFLATED)
