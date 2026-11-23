"""Recover cloth planes on the two South weapons with fused hands and hardware."""
import hashlib
import io
import json
import re
import sys
import zipfile
from functools import lru_cache
from export_staff_coats import BANK,ROOT,weapons
from register_south_rifle_arms import generate as garment_library

OUT=ROOT/'tools/rework-combat-wardrobe/south-fused-firearm-clothes.zip'
# Distal palm contact bounds on the receiver in original physical pixels.
# This region intersects the proven skin material and never paints hardware.
# Right arm on screen left, left arm on screen right, facing camera.
DUAL=[
 [((247,321),(258,345),(257,368)),((388,320),(390,345),(387,369))],
 [((246,315),(257,343),(264,361)),((388,316),(389,343),(383,362))],
 [((246,307),(252,318),(243,344)),((391,308),(393,319),(406,342))],
 [((249,312),(253,312),(247,339)),((391,310),(392,310),(404,339))],
 [((256,311),(263,296),(254,319)),((386,312),(384,295),(391,320))],
 [((262,309),(272,292),(259,314)),((379,310),(376,293),(386,313))],
 [((281,282),(287,266),(266,279)),((361,281),(364,266),(384,280))],
 [((282,278),(287,263),(266,276)),((360,279),(363,264),(385,278))],
]
RIFLE=[
 [((251,298),(269,318),(287,332)),((375,315),(369,315),(351,307))],
 [((236,274),(267,282),(288,298)),((381,296),(375,287),(358,272))],
 [((232,253),(279,264),(311,271)),((367,286),(379,265),(394,249))],
 [((243,264),(267,268),(286,278)),((366,304),(345,298),(319,290))],
 [((247,278),(267,270),(287,279)),((368,302),(345,299),(319,290))],
]
# Each stock, mechanism and bore occupies this bounded area in the recorded
# image. The independent painted skin ranks recover the actual finger gaps.
BARRELS=[
 [(235,317),(264,311),(301,290),(442,265),(450,287),(305,321),(281,333),(248,354),(236,350)],
 [(238,289),(265,278),(320,250),(442,222),(447,251),(328,281),(292,296),(248,326)],
 [(262,247),(293,233),(335,219),(434,216),(447,247),(341,262),(314,279),(278,284)],
 [(258,227),(286,226),(305,211),(333,215),(350,234),(347,286),(337,305),(307,303),(299,275),(260,278)],
 [(258,228),(285,227),(305,211),(334,215),(350,230),(349,284),(338,306),(308,306),(300,274),(261,280)],
]
# Fingers below/around the barrel aren't a single convex silhouette.
# Use each actual pixel of signed skin in the recorded distal crop.
PALM116=[
 [[(267,313),(276,308),(286,312),(297,323),(297,331),(288,337),(282,338),(269,329)],[(348,307),(356,300),(372,299),(376,310),(371,319),(362,325),(349,322)]],
 [[(265,271),(281,268),(292,274),(299,286),(294,296),(286,301),(276,297),(264,286)],[(351,264),(365,262),(376,269),(379,280),(373,289),(357,289),(350,279)]],
 [[(276,249),(291,245),(305,251),(321,259),(315,273),(304,281),(289,279),(274,267)],[(372,239),(386,235),(401,237),(412,250),(408,262),(391,274),(375,270)]],
 [[(263,256),(277,254),(290,261),(296,276),(289,285),(276,287),(264,278)],[(301,279),(313,272),(333,275),(348,286),(348,300),(340,304),(317,304),(304,296)]],
 [[(263,256),(275,253),(291,261),(299,275),(293,286),(277,289),(264,279)],[(302,280),(317,273),(337,275),(347,283),(348,298),(335,304),(315,304),(307,297)]],
]


def generate():
    import numpy as np
    from PIL import Image,ImageDraw,ImageFilter
    archive=json.loads((BANK/'archives/archive-index.json').read_bytes())
    @lru_cache(maxsize=40)
    def pixels(key):
        p=archive['sources'][key]
        with zipfile.ZipFile(BANK/'archives'/p['archive']) as z:raw=z.read(p['path'])
        if hashlib.sha256(raw).hexdigest()!=key:raise ValueError('Changed source material')
        image=Image.open(io.BytesIO(raw)).convert('RGBA')
        if image.size!=(640,640):raise ValueError('Incompatible firearm canvas')
        return np.array(image)
    def polygon(points):
        area=Image.new('L',(640,640));ImageDraw.Draw(area).polygon(points,fill=255)
        return np.asarray(area)>0
    y,x=np.indices((640,640))
    source=(ROOT/'player-rework-weapon-native-hd.js').read_text(encoding='utf8')
    dst={};assets={}
    model=weapons()
    for arm in (114,116):
        record=next(r for r in model['records'] if r['id']==('pistolas114-south-native-original-source' if arm==114 else 'rifle116-south-original-body-native-layers'))
        registered=json.loads(re.search(r'^ const rifle'+str(arm)+r'SouthLocalSource=(.+);$',source,re.M)[1])
        targets=DUAL if arm==114 else RIFLE;poses=dict(pins=[],skin=[],masks=[],targets=[],axes=[],resting=set(),hardware=[])
        if arm==116:
            poses['shoulders']=[[(275,255),(366,257)],[(266,248),(366,254)],[(263,236),(360,243)],[(275,248),(367,250)],[(275,250),(368,252)]]
        for f,(s,pal) in enumerate(zip(record['states'],registered.values(),strict=True)):
            sha=s['approved']['sha256']
            if sha!=pal['ref']:raise ValueError('Unverified firearm state')
            origin=pixels(sha);colored=pixels(pal['looks']['ebony'])
            if not np.array_equal(origin[:,:,3],colored[:,:,3]):raise ValueError('Unregistered skin material')
            delta=np.abs(origin.astype(int)-colored.astype(int)).max(axis=2)>7
            skin=Image.fromarray(delta.astype('uint8')*255)
            # Include genuine dark ink only when it touches proven hand pigment.
            # No wood, gold, steel or translucent flash may acquire glove color.
            edge=np.asarray(skin.filter(ImageFilter.MaxFilter(3)))>0
            dark=(origin[:,:,:3].max(axis=2)<66)&(origin[:,:,3]>0)
            material=(delta|(edge&dark))&(origin[:,:,3]>0)
            poses['skin'].append(skin);poses['pins'].append(sha);poses['masks'].append([]);poses['targets'].append([]);poses['axes'].append([])
            for side,(elbow,wrist,tip) in enumerate(targets[f]):
                axis=np.subtract(tip,wrist);u=axis/np.linalg.norm(axis)
                dx=x-wrist[0];dy=y-wrist[1];along=dx*u[0]+dy*u[1];across=abs(dx*u[1]-dy*u[0])
                if arm==116:window=polygon(PALM116[f][side])
                else:window=(along>=-6)&(along<=np.linalg.norm(axis)+6)&(across<17)
                keep=np.where(window&material,origin[:,:,3],0)
                if np.count_nonzero(keep)<85:raise ValueError(('Unregistered distal palm',arm,f,side))
                poses['masks'][-1].append(Image.fromarray(keep))
                poses['targets'][-1].append((elbow,wrist));poses['axes'][-1].append(axis)
            if arm==116:
                tube=polygon(BARRELS[f])
                # A garment can uncover a gold edge beyond the polygon if its
                # own alpha crosses the outer stock. Discover stable hardware
                # from the five independently dressed, original approved shots.
                near=np.zeros((640,640),int)
                for garment in [r for r in model['exactSouthFirearms'] if r['equipment']['weapon']==116]:
                    frame=garment['states'][f]
                    if frame['state']!=s['state']:raise ValueError('Different recoil phase')
                    near+=(abs(pixels(frame['approved']).astype(int)-origin.astype(int)).max(axis=2)<=3)
                thin=np.asarray(Image.fromarray(tube.astype('uint8')*255).filter(ImageFilter.MaxFilter(11)))>0
                tube|=(near>=2)&thin
            else:
                left,right=targets[f][0][1],targets[f][1][1]
                tube=((x<left[0]+10)&(y>=min(left[1]-55,targets[f][0][2][1]-48)))|((x>right[0]-10)&(y>=min(right[1]-55,targets[f][1][2][1]-48)))
            # Anywhere before the waist the saved head stays above the coat.
            protect=((tube&~material)|(y<226))&(origin[:,:,3]>0)
            poses['hardware'].append(Image.fromarray(protect.astype('uint8')*255))
        made=garment_library(poses);r=json.loads(made.pop('register.json'));assets.update(made)
        dst[str(arm)]=dict(id=record['id'],archive=record['sourceArchiveSHA256'],fps=record['fps'],clock=record['timeline'],pins=r['pins'],items=r['items'])
    assets['register.json']=json.dumps(dst,separators=(',',':')).encode()
    return assets


def south_fused_clothes(folder):
    with zipfile.ZipFile(OUT) as z:
        rows=json.loads(z.read('register.json'))
        if len(rows)!=2 or any(len(r['items'])!=20 for r in rows.values()):raise ValueError('Incomplete original firearm clothes')
        for n in z.namelist():
            if n=='register.json':continue
            raw=z.read(n)
            if hashlib.sha256(raw).hexdigest()+'.png'!=n:raise ValueError('Changed firearm garment')
            (folder/n).write_bytes(raw)
        return rows


if __name__=='__main__':
    files=generate()
    if '--verify' in sys.argv:
        with zipfile.ZipFile(OUT) as z:
            if set(z.namelist())!=files.keys() or any(z.read(k)!=v for k,v in files.items()):raise ValueError('Changed original firearm clothes')
    else:
        with zipfile.ZipFile(OUT,'w') as z:
            for k,v in sorted(files.items()):z.writestr(zipfile.ZipInfo(k),v,compress_type=zipfile.ZIP_DEFLATED)
