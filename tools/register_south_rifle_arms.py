"""Fit the approved South coats and separate glove materials on the two raised rifle arms."""
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache

from export_staff_coats import BANK,ROOT,weapons
from register_south_focus_trousers import OUTFITS,index
from register_south_staff_clothes import CAPE_LINING, SEAMS
from register_staff_gloves import bind

SIZE=(640,640)
OUT=ROOT/'tools/rework-combat-wardrobe/south-rifle-arms.zip'
# Measured screen-left and screen-right hand contours, elbow and wrist from the
# original eight physical drawings. The state skeleton stores the idle arms,
# so it cannot describe the foreshortening of either palm during recoil.
RIGHT=[
 [(243,341),(265,341),(266,346),(272,350),(273,365),(269,367),(263,356),(262,366),(268,374),(266,378),(257,377),(250,374),(245,365)],
 [(279,314),(287,304),(296,303),(303,306),(312,313),(315,320),(308,322),(300,317),(298,319),(303,324),(313,325),(314,330),(306,338),(298,341),(290,338),(281,330)],
 [(288,275),(295,261),(304,258),(317,259),(322,263),(324,270),(322,275),(320,276),(321,280),(320,287),(317,294),(301,294),(293,291),(286,288)],
 [(299,249),(304,237),(311,234),(324,236),(329,242),(332,243),(334,250),(333,255),(328,257),(329,265),(325,274),(311,274),(302,270),(298,263)],
 [(297,245),(301,236),(308,234),(321,235),(326,238),(330,243),(330,251),(326,254),(325,264),(322,267),(307,267),(298,265),(295,256)],
 [(298,246),(302,237),(312,234),(323,236),(329,238),(332,247),(330,252),(326,255),(327,262),(323,269),(306,270),(299,266),(297,260)],
 [(288,286),(293,274),(299,271),(313,271),(321,273),(324,279),(323,285),(320,289),(320,298),(316,304),(299,305),(291,304),(288,299)],
 [(271,340),(280,330),(284,327),(291,328),(300,332),(306,339),(308,344),(306,348),(300,346),(295,338),(289,339),(289,345),(294,350),(306,351),(307,355),(300,361),(289,364),(277,360),(272,352)],
]
LEFT=[
 [(374,342),(395,342),(398,353),(398,365),(391,374),(383,378),(375,378),(375,374),(381,367),(382,357),(378,360),(375,367),(371,367),(370,356),(370,350)],
 [(334,316),(345,315),(355,319),(365,329),(357,338),(348,345),(334,346),(324,342),(321,336),(324,333),(335,336),(343,331),(344,326),(338,325),(331,328),(327,326)],
 [(318,291),(324,288),(331,288),(333,291),(330,295),(324,296),(323,299),(328,300),(335,297),(337,292),(333,290),(332,286),(337,281),(346,282),(352,287),(359,295),(357,304),(349,309),(337,313),(327,312),(318,309),(313,302),(312,297)],
 [(303,273),(310,273),(312,278),(322,279),(326,274),(327,262),(330,258),(335,258),(340,262),(344,270),(341,278),(334,285),(323,289),(313,288),(305,284),(301,279)],
 [(296,266),(301,265),(306,268),(311,272),(320,273),(324,268),(325,258),(330,255),(336,257),(340,264),(341,272),(335,278),(326,283),(314,284),(305,281),(299,276)],
 [(299,267),(304,266),(310,270),(319,273),(325,268),(326,259),(331,256),(337,259),(341,268),(339,275),(334,280),(323,286),(312,285),(303,280),(298,275)],
 [(313,314),(321,312),(326,314),(323,318),(328,319),(337,315),(337,313),(330,314),(326,312),(327,308),(334,304),(344,304),(352,309),(358,315),(356,324),(350,329),(339,333),(327,333),(318,329),(311,323),(311,318)],
 [(346,341),(355,339),(366,342),(372,350),(366,357),(360,365),(349,369),(338,369),(331,366),(329,361),(331,358),(338,360),(345,358),(350,353),(349,349),(344,349),(337,353),(334,351),(335,348)],
]
BENDS=[
 [((261,303),(256,344)),((381,303),(384,344))],
 [((260,304),(284,320)),((380,309),(355,329))],
 [((259,298),(289,283)),((380,302),(350,298))],
 [((281,272),(301,259)),((354,277),(335,270))],
 [((279,278),(299,253)),((356,282),(333,267))],
 [((281,274),(299,254)),((357,281),(333,269))],
 [((260,305),(290,296)),((381,309),(351,318))],
 [((260,311),(277,345)),((378,314),(362,350))],
]
AXES=[[(1,29),(-3,30)],[(23,8),(-23,10)],[(12,-26),(-27,0)],[(10,-26),(-26,6)],[(10,-27),(-26,4)],[(10,-27),(-26,4)],[(12,-23),(-27,2)],[(23,9),(-26,10)]]

def generate(poses=None):
    import numpy as np
    from PIL import Image,ImageDraw,ImageChops,ImageFilter
    src={b:json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in (OUTFITS,BANK)}
    @lru_cache(maxsize=90)
    def read(k):
        for b,refs in src.items():
            if k not in refs:continue
            row=refs[k]
            with zipfile.ZipFile(b/'archives'/row['archive']) as z:raw=z.read(row['path'])
            if hashlib.sha256(raw).hexdigest()!=k:raise ValueError('Changed original firearm or garment')
            return Image.open(io.BytesIO(raw)).convert('RGBA')
        raise KeyError(k)
    def emit(im):
        box=im.getbbox()
        if not box:return None
        buf=io.BytesIO();im.crop(box).save(buf,'PNG');raw=buf.getvalue();k=hashlib.sha256(raw).hexdigest()
        files[k+'.png']=raw;return [k,*box[:2]]
    def polygon(coords):
        area=Image.new('L',SIZE);ImageDraw.Draw(area).polygon(coords,fill=255);return area
    def with_alpha(im,a):
        im=im.copy();im.putalpha(a);return im
    def fit(im,a,b,c,d):
        a,b,c,d=(np.asarray(p,dtype=float) for p in (a,b,c,d))
        def basis(v):
            return np.stack((v,[-v[1]/np.linalg.norm(v),v[0]/np.linalg.norm(v)]),axis=1)
        inv=basis(b-a)@np.linalg.inv(basis(d-c))
        return im.transform(SIZE,Image.Transform.AFFINE,tuple(np.column_stack((inv,a-inv@c)).ravel()),Image.Resampling.NEAREST)
    def band(im,y0,y1):
        out=Image.new('RGBA',SIZE);out.paste(im.crop((0,y0,640,y1)),(0,y0));return out
    def limb(elbow,wrist,radius):
        e,w=np.array(elbow),np.array(wrist);v=w-e;normal=np.array([-v[1],v[0]])/np.linalg.norm(v)
        return polygon([tuple(p) for p in [e+radius*normal,w+9*normal,w-9*normal,e-radius*normal]])
    records={r['id']:r for r in index(OUTFITS)['records']}
    if poses is None:
        rg=next(r for r in weapons()['records'] if r['id']=='rifle115-south-original-body-native-attachment')
        native=rg['basePack']['pack']['directions']['south']
        pins=native['layers'][0]['frames']
        # The alternate musket recording holds a genuinely different, lowered
        # elbow at physical state 8, then repeats the opening arm on state 9.
        import re
        source=(ROOT/'player-rework-weapon-native-hd.js').read_text(encoding='utf8')
        musket=json.loads(re.search(r'^ const w5SouthIndependent=(.+);$',source,re.M)[1])
        extra=musket['rows'][8]['body']
        skin=[read(k).getchannel('A') for k in [*pins,extra]]
        right_contours=[*RIGHT,[(x+2,y-14) for x,y in RIGHT[0]]]
        left_contours=[*LEFT,[(x-5,y-15) for x,y in LEFT[0]]]
        targets=[*BENDS,[((260,295),(258,329)),((379,295),(379,329))]]
        axes=[*AXES,AXES[0]]
        # The approved musket body has the same physical arms in states 0..7
        # and 9. Differences close to the removed head cannot authorize a fit.
        for f,row in enumerate(musket['rows']):
            if f==8:continue
            original=np.asarray(read(pins[f%9] if f<8 else pins[0]))[:,:,3]
            new=np.asarray(read(row['body']))[:,:,3]
            if np.any(abs(original[246:320].astype(int)-new[246:320].astype(int))>1):
                raise ValueError('Unexpected musket upper arms')
        scale=[im.filter(ImageFilter.MaxFilter(17)) for im in skin]
        masks=[]
        for f in range(9):
            right=ImageChops.multiply(polygon(right_contours[f]),skin[f])
            left=ImageChops.subtract(ImageChops.multiply(polygon(left_contours[f]),skin[f]),right)
            masks.append([right,left])
        resting={0,7,8}
    else:
        pins,skin,masks,targets,axes,resting=(poses[k] for k in ('pins','skin','masks','targets','axes','resting'))
        scale=[im.filter(ImageFilter.MaxFilter(17)) for im in skin]
    files={};items={}
    glovers=[r for r in records.values() if r['id'].startswith('frozen-male-glove') and r['id'].endswith('-south-attack-unarmed-native-layers')]
    if len(glovers)!=10:raise ValueError('Incomplete glove library')
    donors={}
    for r in glovers:
        l,=[l for l in r['pack']['directions']['south']['layers'] if l['id']=='registered-frozen-glove-native-attack']
        item=r['equipment']['gloves'];sha=l['frames'][0];im=np.array(read(sha))
        if im.shape!=(640,640,4) or sha not in r['sourceRefs']:raise ValueError('Unowned glove '+r['id'])
        a,b=im.copy(),im.copy();a[:,320:]=0;b[:,:320]=0;donors[item]=(a,b)
        items['gloves'+str(item)]=dict(origin=r['id'],parts=[sha],phases=[])
    envelopes=[np.maximum.reduce([d[s][:,:,3] for d in donors.values()]) for s in range(2)]
    for item,donor in donors.items():
        for f,phase in enumerate(masks):
            im=Image.new('RGBA',SIZE)
            for side in (1,0):
                matte=np.asarray(phase[side]);glove=bind(Image.fromarray(donor[side]),matte,axes[f][side],(0,1),envelopes[side])
                alpha=np.asarray(glove)[:,:,3]
                if np.any(alpha>matte) or np.count_nonzero(alpha)<70:raise ValueError(('Empty or unowned glove',item,f,side))
                im.alpha_composite(glove)
            items['gloves'+str(item)]['phases'].append(dict(front=emit(im)))
    for item,seam in SEAMS.items():
        row=next(r for r in records.values() if r.get('isolatedCoat151') and r['direction']=='south' and r['action']=='idle') if item==151 else records[f'male-torso{item}-south-frozen-attack-native-candidate']
        model=row['pack']['directions']['south'];front=Image.new('RGBA',SIZE);back=front.copy();keys=[]
        for l in sorted(model['layers'],key=lambda l:l['depth']):
            if not l['id'].startswith(f'coat{item}'):continue
            k=l.get('source') or l['frames'][0];im=read(k)
            if k not in row['sourceRefs']:raise ValueError('Foreign source '+k)
            if im.size==(512,512):
                if not (row.get('sourceRasterPadding',{}).get(k)=={'sourceSize':512,'offset':64} or
                       row['pack']['frame']=={'width':128,'height':128} and row['pack']['pivot']=={'x':64,'y':112}):raise ValueError('Unregistered source origin')
                part=Image.new('RGBA',SIZE);part.paste(im,(64,64));im=part
            if im.size!=SIZE:raise ValueError('Invalid fabric')
            keys.append(k);(front if l['depth']>=0 else back).alpha_composite(im)
        if not keys:raise ValueError('No garment '+str(item))
        rec=items['torso'+str(item)]=dict(origin=row['id'],parts=keys,phases=[])
        right=polygon([(640-x,y) for x,y in seam]);left=polygon(seam);seams=ImageChops.lighter(right,left)
        main=with_alpha(front,ImageChops.subtract(front.getchannel('A'),seams))
        if item in CAPE_LINING:
            start,top,end=CAPE_LINING[item];lining=Image.new('RGBA',SIZE)
            for y in range(250,start):
                sy=top+(start-y)//8;shift=round((start-y)*.18)
                for x0,x1,dx in [(345,end,-shift),(640-end,640-345,shift)]:
                    lining.paste(front.crop((x0,sy,x1,sy+1)),(x0+dx,y))
            main.alpha_composite(with_alpha(lining,ImageChops.multiply(lining.getchannel('A'),seams)))
        for f in range(len(skin)):
            frame=Image.new('RGBA',SIZE)
            shoulders=poses.get('shoulders') if poses else None
            def attach_core(cloth):
                if not shoulders:
                    frame.alpha_composite(cloth,(2,2));return
                # In the heavy-rifle lift the stock draws the far shoulder
                # upwards and forwards; keep the actual waist fixed.
                src=np.array([[276,258,1],[364,258,1],[320,336,1]],float)
                dst=np.array([[*p,1] for p in [*shoulders[f],(322,338)]],float)
                projection=np.linalg.solve(dst,src).T[:2].ravel()
                frame.alpha_composite(cloth.transform(SIZE,Image.Transform.AFFINE,tuple(projection),Image.Resampling.NEAREST))
            attach_core(main)
            # Hold the original shoulder cap against the foreshortened limb.
            crown=band(front,0,267)
            crown=with_alpha(crown,ImageChops.multiply(crown.getchannel('A'),scale[f]))
            attach_core(crown)
            occlude=Image.new('L',SIZE)
            sleeves=Image.new('RGBA',SIZE)
            for s,(e,w) in enumerate(targets[f]):
                sh=(276,258) if s==0 else (364,258);target=shoulders[f][s] if shoulders else ((277,258) if s==0 else (365,258))
                src_elbow=(261,304) if s==0 else (379,304);src_wrist=(254,347) if s==0 else (386,347)
                sleeve=with_alpha(front,ImageChops.multiply(front.getchannel('A'),[right,left][s]))
                upper=fit(band(sleeve,0,310),sh,src_elbow,target,e)
                lower=fit(band(sleeve,296,640),src_elbow,src_wrist,e,w)
                upper.alpha_composite(lower)
                sleeves.alpha_composite(with_alpha(upper,ImageChops.multiply(upper.getchannel('A'),scale[f])))
                if f not in resting:
                    occlude=ImageChops.lighter(occlude,ImageChops.multiply(limb(e,w,11),skin[f]))
            frame=with_alpha(frame,ImageChops.subtract(frame.getchannel('A'),occlude))
            frame.alpha_composite(sleeves)
            frame=with_alpha(frame,ImageChops.subtract(frame.getchannel('A'),ImageChops.lighter(*masks[f])))
            rear=back.copy()
            if item==151:
                for x0,x1 in [(227,272),(368,413)]:rear.paste((0,0,0,0),(x0,334,x1,365))
            if poses is not None:
                # The original hardware in a flattened target is above the sleeve.
                frame=with_alpha(frame,ImageChops.subtract(frame.getchannel('A'),poses['hardware'][f]))
            rec['phases'].append(dict(front=emit(frame),rear=emit(rear)))
    registration=dict(pins=pins,items=items)
    if poses is None:
        registration['musket']=dict(body=[s['body'] for s in musket['rows']],gear=[[g['sha'] for g in s['gear']] for s in musket['rows']],archive=musket['sourceArchive'],clock=musket['clock'])
    files['register.json']=json.dumps(registration,separators=(',',':')).encode()
    return files


def south_rifle_arms(folder):
    with zipfile.ZipFile(OUT) as z:
        row=json.loads(z.read('register.json'))
        if len(row['items'])!=20 or len(row['pins'])!=8:raise ValueError('Incomplete South arm registration')
        for n in z.namelist():
            if n=='register.json':continue
            raw=z.read(n)
            if hashlib.sha256(raw).hexdigest()+'.png'!=n:raise ValueError('Invalid garment')
            (folder/n).write_bytes(raw)
        return row


if __name__=='__main__':
    files=generate()
    if '--verify' in sys.argv:
        with zipfile.ZipFile(OUT) as z:
            if set(z.namelist())!=files.keys() or any(z.read(k)!=v for k,v in files.items()):raise ValueError('Changed South firearm arms')
    else:
        with zipfile.ZipFile(OUT,'w') as z:
            for k,v in sorted(files.items()):z.writestr(zipfile.ZipInfo(k),v,compress_type=zipfile.ZIP_DEFLATED)
