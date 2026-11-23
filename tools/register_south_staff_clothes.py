"""Register the editable front garments on the eight drawings of the South focus gesture."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache

from register_south_focus_trousers import BASE, OUTFITS, ROOT, index
from register_south_punch_coats import COATS
from register_staff_gloves import bind

BANK = ROOT / 'tools/rework-combat-wardrobe/south-staff-clothes.zip'
SIZE = (640,640)
# Original left elbow and wrist, measured on the actual gesture. The source's
# rest skeleton stays fixed while the open hand is drawn towards the camera.
FOREARM = [
    ((379,303),(386,348)), ((386,299),(374,315)),
    ((390,293),(338,287)), ((387,290),(347,288)),
    ((367,271),(349,283)), ((381,288),(351,283)),
    ((391,298),(365,325)), ((379,303),(386,348)),
]
# Own distal silhouette. The hand crossing the chest is traced inside its
# black outline. Resting fingers are separated from the dark stock shorts.
RIGHT = [(242,342),(263,342),(265,350),(278,352),(278,382),(239,382)]
REST = [(379,342),(397,342),(403,381),(368,382),(364,352),(376,349)]
LEFT = [
    REST,
    [(366,310),(377,308),(390,316),(382,332),(367,347),(349,345),(346,331),(350,315)],
    [(292,264),(296,258),(302,257),(306,250),(313,251),(321,259),(322,252),(329,254),(341,273),(346,284),(338,298),(322,294),(295,280),(290,276),(290,271)],
    [(304,285),(311,280),(319,279),(320,275),(309,263),(308,257),(312,254),(321,256),(337,265),(346,275),(350,285),(346,297),(324,295),(318,290),(303,290)],
    [(298,271),(303,263),(313,263),(322,266),(322,251),(320,237),(326,232),(332,237),(335,251),(337,232),(342,226),(347,229),(347,250),(354,238),(361,234),(365,239),(357,256),(367,246),(374,248),(376,254),(366,266),(375,259),(378,264),(376,270),(362,283),(351,289),(333,286),(320,280),(307,275)],
    [(313,271),(318,265),(326,267),(327,263),(322,255),(324,248),(330,247),(342,253),(354,266),(361,277),(357,291),(348,295),(334,290),(321,279),(312,278)],
    [(338,321),(344,317),(359,316),(370,317),(379,326),(369,344),(351,352),(337,350),(330,343),(329,330)],
    REST,
]
# Wrist-to-fingertip direction of the two approved gloves.
FINGERS = [(0,23),(-19,23),(-34,-24),(-23,-16),(-9,-31),(-20,-18),(-20,19),(0,23)]


# Native sleeve seam, elbow split and cuff limit in physical pixels. Cut from
# the intact garment, so the broad rectangular regions of the frozen control
# panels cannot move a neighboring flap or cut a rectangular hole in a cape.
SEAMS={
 6: [(369,242),(361,251),(359,264),(356,282),(415,282),(415,236),(380,238)],
 7: [(369,238),(362,250),(358,270),(354,289),(411,291),(411,235),(380,236)],
 130:[(370,244),(368,249),(357,257),(350,261),(350,283),(355,305),(359,325),(360,348),(408,349),(408,240),(381,242)],
 137:[(363,244),(359,249),(355,260),(355,278),(355,298),(361,316),(362,351),(369,362),(416,362),(416,253),(377,244)],
 144:[(351,278),(354,285),(365,295),(380,304),(393,309),(403,309),(409,338),(408,344),(371,344),(367,329),(361,317),(353,311)],
 151:[(354,268),(366,273),(379,271),(385,268),(407,293),(413,338),(412,358),(368,358),(364,340),(360,323),(355,311)],
 158:[(351,291),(363,301),(377,308),(393,314),(401,322),(406,345),(401,356),(371,356),(365,334),(363,319),(356,309)],
 165:[(352,264),(361,269),(379,275),(387,277),(412,314),(411,346),(393,359),(371,359),(365,329),(358,308),(353,289)],
 172:[(358,276),(365,280),(372,277),(384,278),(394,284),(409,317),(412,345),(398,359),(378,359),(369,348),(366,321),(363,299)],
 179:[(352,276),(362,279),(370,280),(374,291),(380,313),(387,332),(389,348),(387,355),(365,356),(362,337),(358,314),(354,299)],
}
# The long capes have a continuous strip of their own lining immediately
# below the resting cuff. Carry only that same strip under the vacated cuff.
CAPE_LINING={144:(349,350,386),158:(356,358,395),179:(357,359,393)}
# Contours on the original forward elbow/forearm. Only this foreground skin
# crosses the torso. Sleeves themselves will be drawn on top of the cut.
ARM_CONTACT={2:[(338,281),(354,276),(371,275),(386,277),(395,285),(397,296),(389,303),(378,306),(359,304),(339,298)],
 3:[(338,275),(355,272),(371,269),(387,273),(395,282),(396,293),(387,302),(374,305),(358,301),(342,295)],
 4:[(338,274),(360,253),(375,250),(379,263),(377,274),(370,282),(355,289),(344,288)],
 5:[(342,269),(352,267),(366,266),(377,269),(386,280),(388,291),(380,299),(367,300),(351,295)]}

def generate():
    import numpy as np
    from PIL import Image, ImageChops, ImageDraw, ImageFilter

    sources={b:json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in (BASE,OUTFITS)}
    @lru_cache(maxsize=110)
    def read(bank,sha):
        row=sources[bank][sha]
        with zipfile.ZipFile(bank/'archives'/row['archive']) as z:
            raw=z.read(row['path'])
        if hashlib.sha256(raw).hexdigest()!=sha: raise ValueError('Source changed '+sha)
        return Image.open(io.BytesIO(raw)).convert('RGBA')
    tiles={}
    def stash(im):
        f=io.BytesIO();im.save(f,format='PNG',compress_level=6);data=f.getvalue()
        sha=hashlib.sha256(data).hexdigest();tiles[sha+'.png']=data;return sha
    def cloth(row,key):
        im=read(OUTFITS,key)
        if im.size==SIZE:return im
        declared=row.get('sourceRasterPadding',{}).get(key)=={'sourceSize':512,'offset':64}
        centered=row['pack']['density']==4 and row['pack']['frame']=={'width':128,'height':128} and row['pack']['pivot']=={'x':64,'y':112}
        if im.size!=(512,512) or not (declared or centered):raise ValueError('Unregistered origin '+key)
        out=Image.new('RGBA',SIZE);out.paste(im,(64,64));return out
    def mask(coords,skin):
        area=Image.new('L',SIZE);ImageDraw.Draw(area).polygon(coords,fill=255)
        return ImageChops.multiply(area,skin)
    def xy(p):
        return np.array([p['x'],p['y']])*4
    def fit(im,a,b,c,d):
        # Move both seam ends. Preserve the physical width of the sleeve when
        # its projected long axis shortens in the forward-facing gesture.
        def basis(v):return np.stack((v,[-v[1]/np.linalg.norm(v),v[0]/np.linalg.norm(v)]),axis=1)
        inv=basis(b-a)@np.linalg.inv(basis(d-c))
        return im.transform(SIZE,Image.Transform.AFFINE,tuple(np.column_stack((inv,a-inv@c)).ravel()),Image.Resampling.NEAREST)

    records={r['id']:r for r in index(OUTFITS)['records']}
    base=next(r for r in index(BASE)['records'] if r['id']=='male-attack-focus-south-drawn8')
    rig=base['pack']['directions']['south']
    if rig['clip']['frames']!=8 or rig['clip']['fps']!=12 or rig['layers'][0]['id']!='skin-arms-phase':raise ValueError('Unexpected focus rig')
    skin=rig['layers'][0]['frames'];masks=[];grips={}
    for f,key in enumerate(skin):
        a=read(BASE,key).getchannel('A')
        masks.append([mask(RIGHT,a),mask(LEFT[f],a)])
    glovers=[r for r in records.values() if r['id'].startswith('frozen-male-glove') and r['id'].endswith('-south-attack-unarmed-native-layers')]
    if len(glovers)!=10:raise ValueError('Expected ten original gloves')
    for side in range(2):
        donors={}
        for row in glovers:
            l,=[l for l in row['pack']['directions']['south']['layers'] if l['id']=='registered-frozen-glove-native-attack']
            if l['binding']!={'kind':'fixed'} or len(l['frames'])!=8:raise ValueError('Unexpected glove source')
            item=row['equipment']['gloves'];h=l['frames'][0];panel=np.array(read(OUTFITS,h))
            if panel.shape!=(640,640,4):raise ValueError('Unexpected glove dimensions')
            if side:panel[:,:320]=0
            else:panel[:,320:]=0
            donors[item]=panel
            grips.setdefault(str(item),dict(record=row['id'],materials=[h],left=[],right=[]))
        envelope=np.maximum.reduce([v[:,:,3] for v in donors.values()])
        for item,panel in donors.items():
            record=grips[str(item)]
            for f,phase in enumerate(masks):
                matte=np.asarray(phase[side]);axis=FINGERS[f] if side else (0,1)
                out=bind(Image.fromarray(panel),matte,axis,(0,1),envelope)
                alpha=np.asarray(out)[:,:,3]
                if np.any(alpha>matte) or np.count_nonzero(alpha)<100:raise ValueError(('Unregistered hand',item,side,f))
                record['left' if side else 'right'].append(stash(out))

    envelopes=[read(BASE,h).getchannel('A').filter(ImageFilter.MaxFilter(17)) for h in skin]
    coats={}
    for item in sorted(COATS):
        if item==151:
            row=next(r for r in records.values() if r.get('isolatedCoat151') and r['direction']=='south' and r['action']=='idle')
        else:row=records[f'male-torso{item}-south-frozen-attack-native-candidate']
        model=row['pack']['directions']['south'];parts=[]
        for l in sorted(model['layers'],key=lambda l:l['depth']):
            if not l['id'].startswith(f'coat{item}'):continue
            key=l.get('source') or l['frames'][0]
            if key not in row['sourceRefs']:raise ValueError('Foreign garment')
            im=cloth(row,key)
            if item==151:
                part=l['id'].removeprefix('coat151-own-original-control-')
                if part in ('core','hem','coat151-rear-openings'):joint=('NECK','HIP')
                else:
                    side,section=part.split('-');side=side.upper()
                    joint=(side+' SHOULDER',side+' ELBOW') if section=='upper' else (side+' ELBOW',side+' ARM')
            else:
                if l['binding']['kind']!='rigid':raise ValueError('Unexpected coat binding')
                joint=tuple(l['binding'][s].removeprefix('cloth:') for s in ('a','b'))
            parts.append((l['depth'],joint,im,key))
        if not parts:raise ValueError('Missing panels')
        rec=coats[str(item)]=dict(record=row['id'],materials=[p[3] for p in parts],front=[],rear=[])
        original=rig['rest']
        front=Image.new('RGBA',SIZE);back=Image.new('RGBA',SIZE)
        for depth,_,im,_ in parts:(back if depth<0 else front).alpha_composite(im)
        seam=Image.new('L',SIZE);ImageDraw.Draw(seam).polygon(SEAMS[item],fill=255)
        sleeve=front.copy();sleeve.putalpha(ImageChops.multiply(front.getchannel('A'),seam))
        static=front.copy();static.putalpha(ImageChops.subtract(front.getchannel('A'),seam))
        if item in CAPE_LINING:
            band,top,right=CAPE_LINING[item]
            patch=Image.new('RGBA',SIZE)
            for y in range(250,band):
                sample_y=top+(band-y)//8
                shift=round((band-y)*.18)
                patch.paste(front.crop((345,sample_y,right,sample_y+1)),(345-shift,y))
            patch.putalpha(ImageChops.multiply(patch.getchannel('A'),sleeve.getchannel('A')))
            static.alpha_composite(patch)
        joint=xy(original['LEFT ELBOW']);base_tip=np.array([386,347])
        def half(im,y0,y1):
            out=Image.new('RGBA',SIZE);out.paste(im.crop((0,y0,640,y1)),(0,y0));return out
        upper=half(sleeve,0,313);lower=half(sleeve,294,640)
        for f,(elbow,wrist) in enumerate(FOREARM):
            if f in (0,7):dressed=front.copy()
            else:
                dressed=static.copy()
                if f in ARM_CONTACT:
                    arm=mask(ARM_CONTACT[f],read(BASE,skin[f]).getchannel('A'))
                    dressed.putalpha(ImageChops.subtract(dressed.getchannel('A'),arm))
                root=xy(original['LEFT SHOULDER']);bend=np.array(elbow)
                moving=fit(upper,root,joint,root,bend)
                moving.alpha_composite(fit(lower,joint,base_tip,bend,np.array(wrist)))
                # The foreshortened elbow can expose the square back edge of a
                # control panel. Keep the sleeve within its measured allowance.
                limb=envelopes[f]
                moving.putalpha(ImageChops.multiply(moving.getchannel('A'),limb))
                dressed.alpha_composite(moving)
            contact=ImageChops.lighter(*masks[f])
            dressed.putalpha(ImageChops.subtract(dressed.getchannel('A'),contact))
            rear=back
            if item==151 and f not in (0,7):
                # This editable rear-opening panel also stores the back edge of
                # the hanging cuff, separated from its front at the source.
                rear=back.copy();rear.paste((0,0,0,0),(368,334,413,365))
            rec['front'].append(stash(dressed));rec['rear'].append(stash(rear) if rear.getbbox() else None)
    reg=dict(sha=base['sourcePackSHA256'],receiver=base['id'],skin=skin,coats=coats,gloves=grips)
    tiles['register.json']=json.dumps(reg,separators=(',',':')).encode()
    return tiles


def materialize(bank):
    with zipfile.ZipFile(BANK) as z:
        reg=json.loads(z.read('register.json'))
        if len(reg['coats'])!=10 or len(reg['gloves'])!=10 or len(reg['skin'])!=8:raise ValueError('Incomplete South focus register')
        for name in z.namelist():
            if name=='register.json':continue
            raw=z.read(name)
            if hashlib.sha256(raw).hexdigest()+'.png'!=name or struct.unpack('>II',raw[16:24])!=SIZE:raise ValueError('Invalid focus panel')
            (bank/name).write_bytes(raw)
        return reg


if __name__=='__main__':
    raw=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(BANK) as z:
            old=json.loads(z.read('register.json'));new=json.loads(raw['register.json'])
            if any(old[k]!=new[k] for k in ('sha','receiver','skin')):raise ValueError('Changed focus rig')
            for group in ('coats','gloves'):
                if old[group].keys()!=new[group].keys():raise ValueError('Incomplete garment group')
                for item,row in new[group].items():
                    prev=old[group][item]
                    if row['record']!=prev['record'] or row['materials']!=prev['materials']:raise ValueError('Changed sources')
                    for k in ('right','left') if group=='gloves' else ('rear','front'):
                        for a,b in zip(row[k],prev[k],strict=True):
                            if bool(a)!=bool(b) or a and Image.open(io.BytesIO(raw[a+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(b+'.png'))).tobytes():raise ValueError(('Changed pixels',item,k))
    else:
        with zipfile.ZipFile(BANK,'w') as z:
            for name,b in sorted(raw.items()):z.writestr(zipfile.ZipInfo(name),b,compress_type=zipfile.ZIP_DEFLATED)
