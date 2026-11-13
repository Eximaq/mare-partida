"""Compose isolated authored boots over existing pants/body records. No resampling."""
import copy,hashlib,io,json,pathlib,zipfile
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1];dest=root/'tools/rework-modular-outfits-hd';ad=dest/'archives'
x=json.loads((dest/'index.json').read_text());a=json.loads((ad/'archive-index.json').read_text())
original=[r for r in x['records'] if not r.get('bootsOverlay')];new=[];padded={};proof=[]
def read(s):
 e=a['sources'][s]
 with zipfile.ZipFile(ad/e['archive']) as z:return z.read(e['path'])
for boots in (9,148):
 for direction in ('south','north','east','west'):
  donor=next((r for r in original if r['body']=='male' and r['direction']==direction and r['action']=='walk' and r['equipment'].get('boots')==boots),None)
  if not donor:continue
  dd=donor['pack']['directions'][direction];ids=donor['equipmentLayerGroups']['boots'];layers=[l for l in dd['layers'] if l['id'] in ids]
  assert layers and all(l['binding']['kind']=='fixed' for l in layers)
  for base in original:
   if base.get('equipment')!={'pants':133} or base['direction']!=direction:continue
   r=copy.deepcopy(base);d=r['pack']['directions'][direction];attack=base['action'].startswith('attack');frame=base.get('overlayContract',{}).get('sourceFrame',0)
   if not attack:
    # Frame/time alignment must be exact, not merely equal frame counts.
    for key in ('LEFT HIP','RIGHT HIP','LEFT KNEE','RIGHT KNEE','LEFT LEG','RIGHT LEG'):
     assert d['rest'].get(key)==dd['rest'].get(key),(direction,key)
     for i,p in enumerate(d['poses']):assert p.get(key)==dd['poses'][i].get(key),(direction,i,key)
   bootslayers=copy.deepcopy(layers)
   for l in bootslayers:
    # Boots remain immediately over cloth; no imported torso, gloves, or baked body.
    l['depth']=2.5 if attack else 5.75
    if attack:
     s=l.get('frames',[l.get('source')])[frame];im=Image.open(io.BytesIO(read(s))).convert('RGBA');assert im.size==(512,512)
     canvas=Image.new('RGBA',(640,640));canvas.paste(im,(64,64));buf=io.BytesIO();canvas.save(buf,format='PNG');b=buf.getvalue();sha=hashlib.sha256(b).hexdigest();padded[sha]=b
     proof.append({'sourceSHA256':s,'paddedSHA256':sha,'translation':[64,64],'sourceFrame':frame,'boot':boots,'direction':direction})
     l.pop('frames',None);l['source']=sha
    elif base['action']=='idle':
     l['frames']=[l['frames'][0]]
   
   if attack:r['bodyOcclusion']={'layerId':'skin-arms-phase','belowPhysicalY':400,'reason':'Clothed lower legs replace naked calves; upper body and all source PNG bytes retained'}
   d['layers'].extend(bootslayers);r['id']=base['id']+f'-boots{boots}-isolated-candidate';r['equipment']={'pants':133,'boots':boots};r['candidate']=True;r['status']='native-isolated-equipment-candidate';r.pop('overlayContract',None)
   r['bootsOverlay']={'sourceRecord':donor['id'],'baseRecord':base['id'],'sourceLayerIds':ids,'sourceFrame':frame if attack else None,'pixelPolicy':'Unchanged original PNGs; attacks add transparent 64px padding only','requiresVisualCalibration':True,'approval':'Original isolated sources reused; this combination not separately artist-approved'}
   r['sourceRefs']=sorted({s for l in d['layers'] for s in (([l['source']] if l.get('source') else [])+l.get('frames',[]))});new.append(r)
name='isolated-boots-attack-native-padding.zip'
with zipfile.ZipFile(ad/name,'w',compression=zipfile.ZIP_STORED) as z:
 for s,b in sorted(padded.items()):
  zi=zipfile.ZipInfo(s+'.png',date_time=(2026,11,12,0,0,0));z.writestr(zi,b);a['sources'][s]={'archive':name,'path':s+'.png','bytes':len(b)}
b=(ad/name).read_bytes();a['archives']=[v for v in a['archives'] if v['file']!=name]+[{'file':name,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'pngCount':len(padded),'compression':'stored'}]
x['records']=original+new
(dest/'index.json').write_text(json.dumps(x,separators=(',',':')))
(ad/'archive-index.json').write_text(json.dumps(a,separators=(',',':')))
(root/'docs/native-hd/isolated-boots-overlay.json').write_text(json.dumps({'records':[r['id'] for r in new],'pixelProof':proof,'missing':['boots148 east/west source','armed combinations','coat151/gloves152 attack overlays'],'notApproval':True},indent=2))
print(len(new),'new records;',len(padded),'padded originals;',len(b),'bytes')
