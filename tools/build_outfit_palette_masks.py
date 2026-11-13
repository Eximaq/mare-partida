import pathlib,json,hashlib,zipfile,io,copy
import numpy as np
from PIL import Image,ImageDraw
root=pathlib.Path(__file__).resolve().parents[1];native=root;dest=root/'tools/rework-modular-outfits-hd';ad=dest/'archives';x=json.loads((dest/'index.json').read_text());a=json.loads((ad/'archive-index.json').read_text());b=json.loads((native/'tools/rework-base-hd/index.json').read_text());ba=json.loads((native/'tools/rework-base-hd/archives/archive-index.json').read_text());cache={};assets={};proof=[]
def load(s,idx,path):
 key=(s,str(path))
 if key not in cache:
  e=idx['sources'][s]
  with zipfile.ZipFile(path/e['archive'])as z:cache[key]=np.array(Image.open(io.BytesIO(z.read(e['path']))).convert('RGBA'))
 return cache[key]
baseTypes={}
for r in b['records']:
 for d in r['pack']['directions'].values():
  for l in d['layers']:
   if l['slot']not in ['body','headBase','face','hair']:continue
   for s in [l.get('source')]+l.get('frames',[]):
    if s:baseTypes[s]='hair'if l['slot']=='hair'else'skin'
ref=next(r for r in b['records']if r['body']=='male'and r['action']=='walk'and r['direction']=='east')['pack']['directions']['east']['layers']
known=[(load(l['source'],ba,native/'tools/rework-base-hd/archives'),'hair'if l['slot']=='hair'else'skin')for l in ref if l['slot']in['body','headBase','face','hair']]
for r in x['records']:
 if r['body']!='male' or r['equipment'].get('pants')!=133 or set(r['equipment'])-{'pants','boots'}:continue
 masks={};d=r['pack']['directions'][r['direction']]
 for l in d['layers']:
  for s in [l.get('source')]+l.get('frames',[]):
   if not s or s in masks:continue
   im=load(s,a,ad);rgb=im[:,:,:3].astype(float);light=rgb[:,:,0]*.2126+rgb[:,:,1]*.7152+rgb[:,:,2]*.0722;allowed={}
   if s in baseTypes:allowed[baseTypes[s]]=im[:,:,3]>0
   elif r['direction']=='west' and l['id'] in ['near-upper-arm','near-forearm-hand']:allowed['skin']=im[:,:,3]>0
   elif r['direction']in['east','west']and l['id']in['clothed018-visible-background','near-upper-arm','near-forearm-hand']:
    for typ in ['skin','hair']:
     matches=np.zeros(im.shape[:2],bool)
     for refim,t in known:
      if t!=typ:continue
      if r['direction']=='west':refim=refim[:,::-1,:]
      matches|=(refim[:,:,3]>0)&np.all(im==refim,axis=2)
     allowed[typ]=matches
   else:continue
   # Original hair cutouts include small exposed skin fragments. Anatomical regions
   # are traced at original512 coordinates; only existing opaque skin-tone pixels
   # are recolored; source RGBA and alpha are never modified.
   if 'hair' in allowed:
    regions={
      'south':[[(216,136),(222,137),(223,155),(216,155)],[(287,136),(296,136),(295,156),(287,156)],[(247,126),(259,120),(258,136),(252,139)],[(267,112),(280,112),(280,124),(273,127)],[(239,118),(246,118),(245,124),(240,126)]],
      'north':[[(240,157),(274,157),(274,169),(240,169)]],
      'east':[[(245,128),(252,128),(255,132),(258,138),(258,148),(255,150),(250,147),(246,142),(244,136)],[(264,128),(265,123),(270,121),(274,114),(278,114),(278,121),(274,126),(268,130)],[(279,116),(286,116),(291,120),(293,126),(287,124),(282,122)]],
    }
    dr='east' if r['direction']=='west' else r['direction'];reg=Image.new('L',(512,512));draw=ImageDraw.Draw(reg)
    for poly in regions[dr]:draw.polygon(poly,fill=255)
    if r['direction']=='west':reg=reg.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if im.shape[0]==640:
     padded=Image.new('L',(640,640));padded.paste(reg,(64,64));reg=padded
    zone=np.array(reg)>0;hairSkin=allowed['hair']&zone
    allowed['hair']=allowed['hair']&~zone;allowed['skin']=allowed.get('skin',np.zeros(im.shape[:2],bool))|hairSkin
   mm={}
   for typ,allow in allowed.items():
    if typ=='skin':
     R,G,B=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2];allow=allow&(R>45)&(G>R*.33)&(G<R*.9)&(R>B*1.28);tone=np.select([light<70,light<112,light<157,light<202],[1,2,3,4],5)
    else:allow=allow&(light>=20);tone=1+(light>30).astype(int)+(light>60).astype(int)+(light>95).astype(int)+(light>145).astype(int)
    arr=np.zeros_like(im);arr[:,:,0]=np.where(allow,tone,0);arr[:,:,3]=np.where(allow,255,0)
    if not np.count_nonzero(allow):continue
    buf=io.BytesIO();Image.fromarray(arr).save(buf,format='PNG');v=buf.getvalue();sha=hashlib.sha256(v).hexdigest();assets[sha]=v;mm[typ]=sha;proof.append({'record':r['id'],'source':s,'material':typ,'mask':sha,'pixels':int(allow.sum()),'authority':'identical base source SHA'if s in baseTypes else'pixel-exact mirrored render of isolated original arm'if r['direction']=='west' and l['id'] in ['near-upper-arm','near-forearm-hand']else'exact spatial RGBA match to original anatomical layers'})
   if mm:masks[s]=mm
 r['paletteSourceMasks']=masks;r['palettePolicy']='verified-original-anatomy-only';r['paletteRefs']=sorted({v for m in masks.values()for v in m.values()})
name='outfit-original-palette-masks.zip'
a['sources']={k:v for k,v in a['sources'].items()if v['archive']!=name}
with zipfile.ZipFile(ad/name,'w',compression=zipfile.ZIP_STORED)as z:
 for s,v in sorted(assets.items()):z.writestr(s+'.png',v);a['sources'][s]={'archive':name,'path':s+'.png','bytes':len(v)}
v=(ad/name).read_bytes();a['archives']=[e for e in a['archives']if e['file']!=name]+[{'file':name,'bytes':len(v),'sha256':hashlib.sha256(v).hexdigest(),'pngCount':len(assets),'compression':'stored'}];(dest/'index.json').write_text(json.dumps(x,separators=(',',':')));(ad/'archive-index.json').write_text(json.dumps(a,separators=(',',':')));(root/'docs/native-hd/outfit-palette-mask-proof.json').write_text(json.dumps(proof,indent=2));print(len(assets),'mask PNGs;',len(v),'bytes;',sum(bool(r.get('paletteSourceMasks'))for r in x['records']),'records')
