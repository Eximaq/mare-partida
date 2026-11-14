import argparse,zipfile,json,base64,io,hashlib,pathlib
import numpy as np
from PIL import Image,ImageOps
ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--recipe-source',required=True);ap.add_argument('--output',required=True);a=ap.parse_args();out=pathlib.Path(a.output);out.mkdir(exist_ok=True)
z=zipfile.ZipFile(a.source);q=zipfile.ZipFile(a.recipe_source);sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(pathlib.Path(a.source).read_bytes())=='3b3ff09ef98716f5d4b0faff6c9b90c3d3b366a7822c33a137ecb5981056ad84'
assert sha(pathlib.Path(a.recipe_source).read_bytes())=='168bc00e1509c0cde4f33106e8e45945ff6512441736965806d1ce82fbd6bfc4'
p=json.loads(q.read('source68/sources/base-east.json'));rec=json.loads(q.read('source68/RECIPE.json'));near=next(l for l in p['pack']['directions']['east']['layers'] if l['id']=='forearm-hand-near');yy,xx=np.mgrid[:768,:768];assets={};refs={};profiles=[]
def im(z,n):return Image.open(io.BytesIO(z.read(n))).convert('RGBA')
def png(i):
 b=io.BytesIO();i.save(b,format='PNG');return b.getvalue()
def asset(i):
 b=png(i);h=sha(b);assets[h+'.png']=b;return {'member':h+'.png','sha256':h,'size':list(i.size)}
for item in [1,68]:
 for direction in ['east','west']:
  states=[]
  for k in range(8):
   b=im(z,f'source/{item}/body-east/{k}.png');g=im(z,f'source/{item}/equipment-east/{k}.png')
   if k in [0,7]:hand=im(q,f'source68/shared-idle/{k:02}-hand.png')
   else:
    hand=Image.new('RGBA',(768,768));s=near['frames'][k] if 'frames'in near else near['source'];h=Image.open(io.BytesIO(base64.b64decode(p['images'][s].split(',')[-1]))).convert('RGBA');hand.alpha_composite(h,(64,64))
   gx,gy=rec['grips'][k];mask=(np.array(hand)[:,:,3]>0)&((xx-gx)**2+(yy-gy)**2<24**2);maskim=Image.fromarray(mask.astype('uint8')*255)
   rendered=np.array(Image.alpha_composite(b,g));rendered[mask]=np.array(b)[mask];r=Image.fromarray(rendered)
   if direction=='west':b,g,maskim,r=[ImageOps.mirror(i) for i in [b,g,maskim,r]]
   rh=sha(png(r));assert rh==json.loads(z.read(f'source/{item}/SOURCE_APPROVAL.json'))['frames'][f'{direction}/{k:02}.png'];refs[rh+'.png']=png(r)
   states.append({'phase':k,'layers':[{'role':'original-anatomy','operation':'source-over',**asset(b)},{'role':'equipment','operation':'source-over',**asset(g)},{'role':'original-anatomy-contact','operation':'replace-rgba-under-mask',**asset(b),'mask':asset(maskim)}],'approvedReferenceSHA256':rh})
  profiles.append({'item':item,'body':'male','direction':direction,'canvas':[768,768],'constantPadding':64,'clip':rec['clip'],'states':states})
def archive(name,members):
 with zipfile.ZipFile(out/name,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as w:
  for n,b in sorted(members.items()):
   i=zipfile.ZipInfo(n,(2026,1,1,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;i.external_attr=0o644<<16;w.writestr(i,b)
 return {'file':name,'sha256':sha((out/name).read_bytes()),'members':len(members)}
manifest={'scope':'bare original male1/68 E/W only; no four-coat approval, arbitrary appearance, runtime or map claim','approvalChain':{'1':{'preview':'Sentinel_ce0afe6f8bd88191aea6e02b1577de5a','approval':'Sentinel_2e9ed548bd5881918e61f3a8acd59030'},'68':{'preview':'Sentinel_7e2b9669f5188191b392aca72aa01952','approval':'Sentinel_249da3b2ac648191b78aaed93597356d'}},'provenanceLimit':'Authenticated messages corroborate SOURCE_APPROVAL scope and quoted words. Historical attachment bytes were not re-fetched; SOURCE_APPROVAL hashes connect preserved archive finals to that revision.','anatomyPolicy':'Shared original body rasters retained separately from gear; no claim body is slot-splittable. Contact mask from original near-hand layer/idle-hand source and original recipe, not final-composite differencing.','archives':[archive('sword1-68-independent-components.zip',assets),archive('sword1-68-approved-references.zip',refs)],'profiles':profiles}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest['archives'],indent=2))
