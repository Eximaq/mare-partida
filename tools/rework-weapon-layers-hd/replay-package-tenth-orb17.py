from pathlib import Path
import zipfile,json,hashlib,io,argparse,numpy as np
from PIL import Image,ImageOps
p=argparse.ArgumentParser();p.add_argument('--source-zip',type=Path,required=True);p.add_argument('--cohort-zip',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
assert sha(a.source_zip.read_bytes())=='c1f831f405e5a97ce0ca43d11c5d29bb53e43fea610545502fd84171ecf677dd';assert sha(a.cohort_zip.read_bytes())=='949573ea1f0fafdfc574858338becda9d8cdacf34f1b93883ee560eea96aee85'
z=zipfile.ZipFile(a.source_zip);co=zipfile.ZipFile(a.cohort_zip);assets={};refs={};rows=[]
def im(z,n):return Image.open(io.BytesIO(z.read(n))).convert('RGBA')
def put(x):
 o=io.BytesIO();x.save(o,format='PNG');b=o.getvalue();h=sha(b);assets[h+'.png']=b;return {'url':'assets/'+h+'.png','sha256':h,'size':list(x.size)}
spec={'item':17,'body':'male','scope':'attack-focus, not carry','clock':json.loads(z.read('approved122/sources/base-east.json'))['pack']['directions']['east']['clip'],'canvas':[640,640],'pivot':[80,128],'density':4,'approvedCoats':[151,158,165,179],'bareApprovalClaimed':False,'directions':{}}
for side in ['east','west']:
 frames=[]
 for k in range(8):
  b,g=im(z,f'body-east/{k:02}.png'),im(z,f'equipment/{k:02}.png');m=Image.open(io.BytesIO(z.read(f'occlusion/{k:02}.png'))).convert('L');mask=np.array(m)>0;v=np.array(Image.alpha_composite(b,g));v[mask]=np.array(b)[mask];assert np.array_equal(v,np.array(im(co,f'source/17/{k}.png')))
  coats={}
  for c in spec['approvedCoats']:
   cloth=np.array(im(co,f'clothing/{c}/{k}-cloth.png'));owner=np.array(Image.open(io.BytesIO(co.read(f'source/17/{k}-ownership.png'))))>0;cloth[owner]=0;cloth[:205]=0;cl=Image.fromarray(cloth);out=Image.alpha_composite(Image.fromarray(v),cl)
   if side=='west':cl=ImageOps.mirror(cl);out=ImageOps.mirror(out)
   n=f'17/{c}/{k}-{side}.png';assert np.array_equal(np.array(out),np.array(im(co,n)));coats[str(c)]=put(cl);refs[n]=co.read(n);rows.append({'coat':c,'phase':k,'side':side,'diff':0,'referenceSHA256':sha(co.read(n))})
  if side=='west':b,g,m=map(ImageOps.mirror,[b,g,m])
  frames.append({'phase':k,'body':put(b),'gear':put(g),'originalAnatomyRestoreMask':put(m),'coats':coats,'operations':['body source-over','gear source-over','replace body RGBA under original mask red>0','optional authored coat source-over']})
 spec['directions'][side]=frames
for name,data in [('components.zip',assets),('references.zip',refs)]:
 with zipfile.ZipFile(a.output/name,'w',zipfile.ZIP_DEFLATED) as zz:
  for n,b in sorted(data.items()):
   i=zipfile.ZipInfo(n,(2026,1,1,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;zz.writestr(i,b)
(a.output/'descriptor.json').write_text(json.dumps(spec,indent=2));(a.output/'proof.json').write_text(json.dumps({'rows':rows,'sourceSHA256':sha(a.source_zip.read_bytes()),'cohortSHA256':sha(a.cohort_zip.read_bytes()),'files':{p.name:{'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size} for p in a.output.glob('*.zip')}},indent=2));print('64 exact')
