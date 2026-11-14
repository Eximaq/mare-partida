from pathlib import Path
import json,zipfile,hashlib,io,argparse
import numpy as np
from PIL import Image,ImageOps
p=argparse.ArgumentParser();p.add_argument('--source-zip',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
assert sha(a.source_zip.read_bytes())=='168bc00e1509c0cde4f33106e8e45945ff6512441736965806d1ce82fbd6bfc4'
z=zipfile.ZipFile(a.source_zip);assets={};raw={};refs={};checks=[]
def im(n):return Image.open(io.BytesIO(z.read(n))).convert('RGBA')
def enc(x):
 o=io.BytesIO();x.save(o,format='PNG');return o.getvalue()
def put(x,dest):
 b=enc(x);h=sha(b);dest[h+'.png']=b;return {'sha256':h,'url':'assets/'+h+'.png','size':list(x.size)}
r=json.loads(z.read('RECIPE.json'));bp=json.loads(z.read('source68/sources/base-east.json'))['pack'];assert bp['pivot']=={'x':80,'y':128} and bp['density']==4
assert 'padded.alpha_composite(a,(64,64))' in z.read('source68/build.py').decode()
spec={'item':69,'body':'male','canvas':[1024,1024],'sourcePadding':128,'sourceSHA256':sha(a.source_zip.read_bytes()),'clock':r['clip'],'directions':{}}
for side in ['east','west']:
 frames=[]
 for k in range(8):
  b,g,h=[im(f'{folder}/{k:02}.png') for folder in ['body','equipment','hand']];old=im(f'source68/body-east/{k:02}.png');assert old.size==(768,768)
  padded=Image.new('RGBA',(1024,1024));padded.alpha_composite(old,(128,128));assert np.array_equal(np.array(padded),np.array(b))
  if side=='west':b,g,h=map(ImageOps.mirror,[b,g,h])
  mask=(np.array(h)[:,:,3]>0);m=Image.fromarray(mask.astype('uint8')*255,'L');out=np.array(Image.alpha_composite(b,g));out[mask]=np.array(b)[mask]
  n=f'{side}/{k:02}.png';assert np.array_equal(out,np.array(im(n)));refs['69/'+n]=z.read(n)
  hand=put(h,raw);md=put(m,assets);md['encoding']='L; red>0 iff original hand alpha>0'
  frames.append({'phase':k,'body':put(b,assets),'gear':put(g,assets),'anatomicalRestoreMask':md,'operations':['source-over body','source-over gear','replace-rgba-under-mask body using binary anatomicalRestoreMask red>0'],'referenceSHA256':sha(z.read(n)),'originalHandEvidenceSHA256':hand['sha256']})
  checks.append({'side':side,'phase':k,'pixelDiff':0,'bodyPadding128Exact':True,'maskPredicateExact':True})
 spec['directions'][side]=frames
spec.update(nativePivot=[512,704],totalPadding=192,logicalPivot=[128,176])
def archive(name,items):
 with zipfile.ZipFile(a.output/name,'w',zipfile.ZIP_DEFLATED) as zz:
  for n,b in sorted(items.items()):
   zi=zipfile.ZipInfo(n,(2026,1,1,0,0,0));zi.compress_type=zipfile.ZIP_DEFLATED;zz.writestr(zi,b)
for name,data in [('components.zip',assets),('original-hand-evidence.zip',raw),('references.zip',refs)]:archive(name,data)
(a.output/'descriptor.json').write_text(json.dumps(spec,indent=2))
proof={'checks':checks,'paddingProof':{'inner64Source':'source68/build.py','outer128Source':'build.py and byte-exact RGBA re-embedding8/8','sourcePivot':[80,128],'density':4,'nativePivot':[512,704]},'files':{q.name:{'sha256':sha(q.read_bytes()),'bytes':q.stat().st_size} for q in a.output.glob('*.zip')}}
(a.output/'proof.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof['files']))
