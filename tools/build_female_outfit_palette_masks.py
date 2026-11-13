"""Native female palettes: exact spatial anatomy ownership, never apparel hue selection.
Anatomical cutout ear/neck traces
are in original640 coordinates, matched to original sources before classification.
"""
import pathlib,json,zipfile,io,hashlib,numpy as np
from PIL import Image,ImageDraw
root=pathlib.Path(__file__).resolve().parents[1];dest=root/'tools/rework-modular-outfits-hd';ad=dest/'archives';x=json.loads((dest/'index.json').read_text());a=json.loads((ad/'archive-index.json').read_text());b=json.loads((root/'tools/rework-base-hd/index.json').read_text());ba=json.loads((root/'tools/rework-base-hd/archives/archive-index.json').read_text());cache={};assets={};proof=[]
def load(s,idx,dr):
 if s not in cache:
  e=idx['sources'][s]
  with zipfile.ZipFile(dr/e['archive'])as z:cache[s]=np.array(Image.open(io.BytesIO(z.read(e['path']))).convert('RGBA'))
 return cache[s]
polys={'south':[[(300,171),(309,171),(309,181),(300,181)],[(343,186),(356,186),(356,207),(343,207)],[(288,216),(341,216),(341,224),(288,224)]],'north':[[(310,222),(335,222),(335,232),(310,232)]],'east':[[(307,194),(321,194),(322,215),(307,215)],[(343,171),(353,171),(353,186),(343,186)],[(315,216),(337,216),(337,233),(315,233)],[(337,223),(363,201),(365,208),(346,228),(337,228)]]}
polys['west']=[[(640-X,Y)for X,Y in p]for p in polys['east']]
def match(im,ref):return (ref[:,:,3]>0)&(im[:,:,3]>0)&(np.abs(im.astype(int)-ref.astype(int)).max(axis=2)<=2)
for r in x['records']:
 if r['body']!='female':continue
 dr=r['direction'];attack=r['action']=='attack-unarmed'
 if r['action']not in ['idle','walk','attack-unarmed']:continue
 base=next(t for t in b['records']if t['body']=='female'and t['direction']==dr and t['action']=='attack-unarmed'and t['hairStyle']=='original');layers=base['pack']['directions'][dr]['layers'];h=load(next(l for l in layers if l['id']=='hair')['source'],ba,root/'tools/rework-base-hd/archives');zone=Image.new('L',(640,640));draw=ImageDraw.Draw(zone)
 for poly in polys[dr]:draw.polygon(poly,fill=255)
 zone=np.array(zone)>0
 if not attack:h=h[64:576,64:576];zone=zone[64:576,64:576]
 ownership={}
 for l in r['pack']['directions'][dr]['layers']:
  if not attack and l['id']not in ['visible-clothed-composite','visible-original-hands','pants147-exact-visible-distal-owner']:continue
  for f,s in enumerate(l.get('frames')or[l.get('source')]):
   if not s:continue
   im=load(s,a,ad);hair=match(im,h)&~zone
   if s in ownership:ownership[s]['hair']|=hair
   else:ownership[s]={'hair':hair}

 masks={}
 for s,parts in ownership.items():
  im=load(s,a,ad);rgb=im[:,:,:3].astype(float);R,G,B=rgb.transpose(2,0,1);light=R*.2126+G*.7152+B*.0722;mm={}
  for typ,allow in parts.items():
   if typ!='hair':continue # Full 40-state skin ownership is not yet demonstrated.
   if typ=='skin':allow=allow&(R>45)&(G>R*.33)&(G<R*.9)&(R>B*1.28);tone=np.select([light<70,light<112,light<157,light<202],[1,2,3,4],5)
   else:allow=allow&(light>=20);tone=1+(light>30).astype(int)+(light>60).astype(int)+(light>95).astype(int)+(light>145).astype(int)
   if not allow.any():continue
   arr=np.zeros_like(im);arr[:,:,0]=np.where(allow,tone,0);arr[:,:,3]=np.where(allow,255,0);buf=io.BytesIO();Image.fromarray(arr).save(buf,format='PNG');v=buf.getvalue();sha=hashlib.sha256(v).hexdigest();assets[sha]=v;mm[typ]=sha;proof.append({'record':r['id'],'source':s,'mask':sha,'material':typ,'pixels':int(allow.sum()),'authority':'exact spatial RGBA match (Canvas tolerance2) to isolated class anatomy; source hair ear/neck anatomical traces'})
  if mm:masks[s]=mm
 if masks:r['paletteSourceMasks']=masks;r['paletteRefs']=sorted({v for m in masks.values()for v in m.values()});r['palettePolicy']='verified-female-original-hair-only';r['paletteSupportedMaterials']=['hair']
name='female-outfit-original-palette-masks.zip';a['sources']={k:v for k,v in a['sources'].items()if v['archive']!=name}
with zipfile.ZipFile(ad/name,'w',compression=zipfile.ZIP_STORED)as z:
 for s,v in sorted(assets.items()):z.writestr(s+'.png',v);a['sources'][s]={'archive':name,'path':s+'.png','bytes':len(v)}
v=(ad/name).read_bytes();a['archives']=[e for e in a['archives']if e['file']!=name]+[{'file':name,'bytes':len(v),'sha256':hashlib.sha256(v).hexdigest(),'pngCount':len(assets),'compression':'stored'}];(dest/'index.json').write_text(json.dumps(x,separators=(',',':')));(ad/'archive-index.json').write_text(json.dumps(a,separators=(',',':')));(root/'docs/native-hd/female-outfit-palette-mask-proof.json').write_text(json.dumps({'tracesNative640':polys,'proof':proof},indent=2));print(len(assets),'masks',len(v),'bytes',len(proof),'sourcecontracts')
