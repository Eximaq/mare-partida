import argparse,zipfile,json,base64,io,hashlib
import numpy as np
from PIL import Image,ImageOps
ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--recipe-source',required=True);args=ap.parse_args()
z=zipfile.ZipFile(args.source);q=zipfile.ZipFile(args.recipe_source)
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(open(args.source,'rb').read())=='3b3ff09ef98716f5d4b0faff6c9b90c3d3b366a7822c33a137ecb5981056ad84'
assert sha(open(args.recipe_source,'rb').read())=='168bc00e1509c0cde4f33106e8e45945ff6512441736965806d1ce82fbd6bfc4'
p=json.loads(q.read('source68/sources/base-east.json'));rec=json.loads(q.read('source68/RECIPE.json'));near=next(l for l in p['pack']['directions']['east']['layers'] if l['id']=='forearm-hand-near');yy,xx=np.mgrid[:768,:768]
def im(z,n):return Image.open(io.BytesIO(z.read(n))).convert('RGBA')
def png(a):
 b=io.BytesIO();a.save(b,format='PNG');return b.getvalue()
rows=[]
for k in range(8):
 if k in [0,7]: hand=im(q,f'source68/shared-idle/{k:02}-hand.png')
 else:
  hand=Image.new('RGBA',(768,768));s=near['frames'][k] if 'frames'in near else near['source'];a=Image.open(io.BytesIO(base64.b64decode(p['images'][s].split(',')[-1]))).convert('RGBA');hand.alpha_composite(a,(64,64))
 gx,gy=rec['grips'][k];mask=(np.array(hand)[:,:,3]>0)&((xx-gx)**2+(yy-gy)**2<24**2)
 for item in [1,68]:
  b=im(z,f'source/{item}/body-east/{k}.png');g=im(z,f'source/{item}/equipment-east/{k}.png');r=im(z,f'source/{item}/east/{k}.png');a=np.array(Image.alpha_composite(b,g));a[mask]=np.array(b)[mask]
  assert np.array_equal(a,np.array(r));assert np.array_equal(np.array(b),np.array(im(z,f'source/68/body-east/{k}.png')))
  refs=json.loads(z.read(f'source/{item}/SOURCE_APPROVAL.json'))['frames']
  for direction,render in [('east',Image.fromarray(a)),('west',ImageOps.mirror(Image.fromarray(a)))]:
   h=sha(png(render));assert h==refs[f'{direction}/{k:02}.png'];rows.append({'item':item,'direction':direction,'phase':k,'sha256':h,'referenceHashExact':True})
print(json.dumps({'sourceSHA256':sha(open(args.source,'rb').read()),'recipeSourceSHA256':sha(open(args.recipe_source,'rb').read()),'clip':rec['clip'],'canvas':[768,768],'constantPadding':64,'mirror':'literal EAST flip','composition':'body then authentic equipment then restore original body under authentic near-hand alpha within original 24px grip radius','scope':'bare male original source; no torso combination or runtime/browser claim','approvalEvidence':'SOURCE_APPROVAL records; later authenticated linkage not independently reread in this replay','verified':len(rows),'rows':rows},indent=2))
