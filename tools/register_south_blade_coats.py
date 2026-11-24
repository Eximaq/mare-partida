"""Fit each original South coat to the moving shoulders, sleeves and forearms of the blade attacks."""
import hashlib
import io
import json
import struct
import sys
import zipfile

from articulated_sleeve_projection import bend
from register_south_blade_gloves import ROOT, SIZE, OUTFITS, contacts, hand_mattes, index, manifest, pixels
from register_south_staff_clothes import SEAMS,CAPE_LINING

OUTPUT=ROOT/'tools/rework-combat-wardrobe/south-blade-coats.zip'
# Two drawn shoulders/elbows, followed by the trouser waist centre. Each blade
# has nine states. The wind-up hand has already moved while the neutral body
# palette still reads phase zero.
JOINTS={"sword":[[[279,258,262,301],[359,258,377,303],320,315],[[280,258,258,295],[361,259,378,303],320,315],[[285,258,253,301],[359,257,376,301],320,315],[[278,251,239,273],[359,255,360,291],318,319],[[285,254,309,276],[356,258,358,293],314,322],[[286,251,320,260],[346,260,351,299],309,326],[[287,255,310,287],[345,259,353,297],315,323],[[281,259,253,298],[355,259,371,296],317,322],[[278,256,256,301],[361,256,375,300],316,320]],"daggers":[[[280,258,265,302],[353,259,370,301],318,319],[[280,258,266,302],[354,258,372,296],318,319],[[282,258,264,303],[357,257,370,293],319,319],[[283,257,264,287],[358,257,373,294],317,320],[[283,258,251,290],[357,257,374,296],317,320],[[280,256,254,304],[360,257,376,295],317,322],[[279,258,257,303],[361,260,380,297],321,322],[[280,258,255,301],[360,258,376,294],319,323],[[280,257,261,302],[358,258,374,302],319,322]]}
PHASES=[0,0,1,2,3,4,5,6,7]
REST=(((276,258),(261,303),(254,345)),((364,258),(379,303),(386,345)))


def generate():
    import numpy as np
    from PIL import Image,ImageChops,ImageDraw,ImageFilter
    rows={r['id']:r for r in index(OUTFITS)['records']}
    skins,shorts,profiles,hilt=manifest()
    data={};coats={};regs={'sources':{},'rigs':{}}
    def store(im):
        if not im.getbbox():return None
        out=io.BytesIO();im.save(out,format='PNG',compress_level=6);raw=out.getvalue()
        k=hashlib.sha256(raw).hexdigest();data[k+'.png']=raw;return k
    def polygon(vertices):
        out=Image.new('L',SIZE);ImageDraw.Draw(out).polygon(vertices,fill=255);return out
    def own(img,m):
        dst=img.copy();dst.putalpha(ImageChops.multiply(img.getchannel('A'),m));return dst
    def signed_panel(r,key):
        art=pixels(key)
        if art.size==SIZE:return art
        known=r.get('sourceRasterPadding',{}).get(key)=={'sourceSize':512,'offset':64}
        centred=r['pack']['density']==4 and r['pack']['frame']=={'width':128,'height':128} and r['pack']['pivot']=={'x':64,'y':112}
        if art.size!=(512,512) or not (known or centred):raise ValueError('Unknown South material grid')
        out=Image.new('RGBA',SIZE);out.paste(art,(64,64));return out
    for item in sorted(SEAMS):
        if item==151:r=next(v for v in rows.values() if v.get('isolatedCoat151') and v['direction']=='south' and v['action']=='idle')
        else:r=rows[f'male-torso{item}-south-frozen-attack-native-candidate']
        if r['body']!='male' or r['equipment']['torso']!=item:raise ValueError('Wrong coat identity')
        core=Image.new('RGBA',SIZE);back=core.copy();materials=[]
        for l in sorted(r['pack']['directions']['south']['layers'],key=lambda q:q['depth']):
            if not l['id'].startswith(f'coat{item}-'):continue
            key=l.get('source') or l['frames'][0]
            if key not in r['sourceRefs'] or l['binding']['kind']!=('bone' if item==151 else 'rigid'):raise ValueError('Unowned front coat')
            (back if l['depth']<0 else core).alpha_composite(signed_panel(r,key));materials.append(key)
        if not materials or not core.getbbox():raise ValueError('Missing coat panels')
        # Cut both sleeve seams from this coat's actual authored composition.
        # A source rectangle may also contain its own apron: moving the full
        # rectangle would carry that apron away with the wrist.
        far=polygon([(640-x,y) for x,y in SEAMS[item]]);near=polygon(SEAMS[item])
        limbs=[own(core,far),own(core,near)];still=core.copy()
        still.putalpha(ImageChops.subtract(core.getchannel('A'),ImageChops.lighter(far,near)))
        if item in CAPE_LINING:
            band,top,right=CAPE_LINING[item]
            for side,cover in enumerate((far,near)):
                repair=Image.new('RGBA',SIZE)
                for y in range(250,band):
                    sample=top+(band-y)//8;shift=round((band-y)*.18)
                    if side:repair.paste(core.crop((345,sample,right,sample+1)),(345-shift,y))
                    else:repair.paste(core.crop((640-right,sample,295,sample+1)),(640-right+shift,y))
                repair.putalpha(ImageChops.multiply(repair.getchannel('A'),cover));still.alpha_composite(repair)
        cuff_back=[None,None]
        if item==151:
            # The rear-openings source contains both exposed back cuffs as well
            # as the collar. Keep the collar on the torso and move each little
            # lining with its own wrist instead of leaving it in the air.
            for side,x in enumerate((0,320)):
                panel=Image.new('RGBA',SIZE)
                panel.paste(back.crop((x,330,x+320,367)),(x,330));cuff_back[side]=panel
            back.paste((0,0,0,0),(0,330,640,367))
        coats[str(item)]=(still,limbs,back,cuff_back)
        regs['sources'][str(item)]={'record':r['id'],'materials':materials}
    def move_core(im,right,left,waist):
        src=np.array([[276,258],[364,258],[320,319]],float)
        dst=np.array([right,left,waist],float);inverse=np.linalg.solve(np.column_stack((dst,np.ones(3))),src).T
        return im.transform(SIZE,Image.Transform.AFFINE,tuple(inverse.ravel()),Image.Resampling.NEAREST)
    def upper_arm_mask(joints,skin):
        # Map only the forearm which actually travels in front of the chest.
        a,b,c=[np.asarray(p,float) for p in joints];v=c-b;ln=np.linalg.norm(v)
        n=np.array([-v[1],v[0]])/max(ln,1)
        profile=[b+n*10,b+(c-b)*.24+n*13,c+n*9,c-n*9,b+(c-b)*.15-n*13,b-n*9]
        return ImageChops.multiply(polygon([tuple(np.rint(p).astype(int)) for p in profile]),skin)
    for family in ('sword','daggers'):
        # Source anatomy is verified shared by weapon-independent torso;
        # weapon and foreground depth are still determined by each receiver.
        rig=regs['rigs'][family]={'skin':skins[family],'items':{item:[] for item in coats}}
        for n,(j,phase) in enumerate(zip(JOINTS[family],PHASES,strict=True)):
            neutral=pixels(skins[family][phase]);native=neutral.getchannel('A')
            p=profiles['1' if family=='sword' else '73'][1][n]
            fore=pixels(p[-1]);stock=np.asarray(pixels(shorts[family][phase]));foredata=np.array(fore)
            foredata[np.all(foredata==stock,axis=2)]=0
            coverage=Image.fromarray(np.maximum(np.asarray(native),foredata[:,:,3]))
            limb_bounds=coverage.filter(ImageFilter.MaxFilter(15))
            hand=hand_mattes(family,phase,np.asarray(coverage),Image.fromarray(foredata),n)
            # Palms are drawn over the sleeve. A separate hand operation can
            # subsequently equip either glove material without changing the coat.
            stop=Image.fromarray(np.maximum(*hand))
            jw=contacts(family,phase,n);anchors=[]
            for side in range(2):
                sx,sy,ex,ey=j[side];wx,wy,_,_=jw[side]
                anchors.append(np.asarray([(sx,sy),(ex,ey),(wx,wy)],float))
            native_front=upper_arm_mask(anchors[0],coverage) if family=='sword' and n in (3,4,5,6) else upper_arm_mask(anchors[1],coverage) if family=='daggers' and 2<=n<=7 else None
            for item,(core,limbs,rear,cuffs) in coats.items():
                body=move_core(core,anchors[0][0],anchors[1][0],j[2:])
                if native_front:body.putalpha(ImageChops.subtract(body.getchannel('A'),native_front))
                sleeves=[bend(part,np.asarray(rest,float),target) for part,rest,target in zip(limbs,REST,anchors,strict=True)]
                for side in ((1,0) if family=='sword' else (0,1)):
                    panel=sleeves[side];panel.putalpha(ImageChops.multiply(panel.getchannel('A'),limb_bounds));body.alpha_composite(panel)
                body.putalpha(ImageChops.subtract(body.getchannel('A'),stop))
                lining=move_core(rear,anchors[0][0],anchors[1][0],j[2:])
                for side,panel in enumerate(cuffs):
                    if panel:lining.alpha_composite(bend(panel,np.asarray(REST[side],float),anchors[side]))
                rig['items'][item].append({'front':store(body),'rear':store(lining)})
    data['register.json']=json.dumps(regs,separators=(',',':')).encode()
    return data


def materialize(bank):
    with zipfile.ZipFile(OUTPUT) as z:
        reg=json.loads(z.read('register.json'))
        for rig in reg['rigs'].values():
            if len(reg['sources'])!=10 or len(rig['skin'])!=8 or set(reg['sources'])!=set(rig['items']) or any(len(v)!=9 for v in rig['items'].values()):raise ValueError('Incomplete blade coat')
        for name in z.namelist():
            if name=='register.json':continue
            raw=z.read(name)
            if hashlib.sha256(raw).hexdigest()+'.png'!=name or struct.unpack('>II',raw[16:24])!=SIZE:raise ValueError('Changed visual material')
            (bank/name).write_bytes(raw)
    return reg


if __name__=='__main__':
    assets=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUTPUT) as z:
            old=json.loads(z.read('register.json'));now=json.loads(assets['register.json'])
            if old['sources']!=now['sources']:raise ValueError('Changed source selection')
            for family,rig in now['rigs'].items():
                before=old['rigs'][family]
                if rig['skin']!=before['skin'] or rig['items'].keys()!=before['items'].keys():raise ValueError('Changed receiver')
                for item,frames in rig['items'].items():
                    for a,b in zip(frames,before['items'][item],strict=True):
                        for key in ('rear','front'):
                            if bool(a[key])!=bool(b[key]) or a[key] and Image.open(io.BytesIO(assets[a[key]+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(b[key]+'.png'))).tobytes():raise ValueError('Changed coat pixels')
    else:
        with zipfile.ZipFile(OUTPUT,'w') as z:
            for name,data in sorted(assets.items()):z.writestr(zipfile.ZipInfo(name),data,compress_type=zipfile.ZIP_DEFLATED)
