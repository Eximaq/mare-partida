from pathlib import Path
import argparse,zipfile,json,hashlib,io,numpy as np
from PIL import Image,ImageOps
p=argparse.ArgumentParser();p.add_argument('--source-zip',type=Path,required=True);p.add_argument('--cohort-zip',type=Path,required=True);p.add_argument('--recipe-zip',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
assert sha(a.source_zip.read_bytes())=='c1f831f405e5a97ce0ca43d11c5d29bb53e43fea610545502fd84171ecf677dd';assert sha(a.cohort_zip.read_bytes())=='949573ea1f0fafdfc574858338becda9d8cdacf34f1b93883ee560eea96aee85';assert sha(a.recipe_zip.read_bytes())=='7b0a85d9df7dbdcab72d3621f8f479583c1c5e4ff2eeae28886ab16efdedee7c'
z=zipfile.ZipFile(a.source_zip);co=zipfile.ZipFile(a.cohort_zip);rz=zipfile.ZipFile(a.recipe_zip);work=a.output/'authoring-replay';work.mkdir(exist_ok=True)
for n in z.namelist():
 if n.startswith('approved122/sources/'):
  dst=work/n.removeprefix('approved122/');dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(z.read(n))
original=rz.read('restore_orbe_palm.py');s=original.decode();needle='ar=np.array(c);ar[oc]=np.array(b)[oc];c=Image.fromarray(ar)';assert s.count(needle)==1;s=s.replace(needle,needle+';Image.fromarray((oc*255).astype("uint8")).save(p/"hand-masks"/f"{i:02}-authored-occlusion.png")');ns={};exec(compile(s,'original-restore_orbe_palm.py','exec'),ns);ns['rebuild'](work)
assets={};refs={};rows=[];sourcechecks=[]
def im(z,n):return Image.open(io.BytesIO(z.read(n))).convert('RGBA')
def put(x):
 o=io.BytesIO();x.save(o,format='PNG');b=o.getvalue();h=sha(b);assets[h+'.png']=b;return {'url':'assets/'+h+'.png','sha256':h,'size':list(x.size)}
spec={'item':122,'body':'male','scope':'attack-focus E/W with original four authored coats; not carry','clock':json.loads(z.read('approved122/sources/base-east.json'))['pack']['directions']['east']['clip'],'canvas':[640,640],'pivot':[80,128],'density':4,'approvedCoats':[151,158,165,179],'bareApprovalClaimed':False,'directions':{},'maskProvenance':{'recipeSHA256':sha(original),'rule':'Original handalpha>0 AND y>=centerY+4 UNION original wrist repair mask for phases1/2/6. Replace body RGBA, including transparent pixels, after equipment. No flat-derived mask.'}}
for side in ['east','west']:
 frames=[]
 for k in range(8):
  for folder in ['body-east','equipment','east','west']:
   out=Image.open(work/f'{folder}/{k:02}.png').convert('RGBA');ref=im(z,f'approved122/{folder}/{k:02}.png');assert np.array_equal(np.array(out),np.array(ref));sourcechecks.append({'phase':k,'folder':folder,'diff':0})
  b=Image.open(work/f'body-east/{k:02}.png').convert('RGBA');g=Image.open(work/f'equipment/{k:02}.png').convert('RGBA');mask=np.array(Image.open(work/f'hand-masks/{k:02}-authored-occlusion.png'))>0
  repair=work/f'hand-masks/{k:02}-generated-repair-mask.png'
  if repair.exists():mask|=np.array(Image.open(repair))>0
  m=Image.fromarray(mask.astype('uint8')*255,'L');v=np.array(Image.alpha_composite(b,g));v[mask]=np.array(b)[mask];assert np.array_equal(v,np.array(im(co,f'source/122/{k}.png')))
  coats={}
  for c in spec['approvedCoats']:
   cloth=np.array(im(co,f'clothing/{c}/{k}-cloth.png'));owner=np.array(Image.open(io.BytesIO(co.read(f'source/122/{k}-ownership.png'))))>0;cloth[owner]=0;cloth[:205]=0;cl=Image.fromarray(cloth);out=Image.alpha_composite(Image.fromarray(v),cl)
   if side=='west':cl=ImageOps.mirror(cl);out=ImageOps.mirror(out)
   n=f'122/{c}/{k}-{side}.png';assert np.array_equal(np.array(out),np.array(im(co,n)));coats[str(c)]=put(cl);refs[n]=co.read(n);rows.append({'coat':c,'phase':k,'side':side,'diff':0,'referenceSHA256':sha(co.read(n))})
  if side=='west':b,g,m=map(ImageOps.mirror,[b,g,m])
  frames.append({'phase':k,'body':put(b),'gear':put(g),'originalAnatomyRestoreMask':put(m),'coats':coats,'operations':['body source-over','gear source-over','replace body RGBA under authored hand and wrist mask red>0','optional authored coat source-over']})
 spec['directions'][side]=frames
for name,data in [('components.zip',assets),('references.zip',refs)]:
 with zipfile.ZipFile(a.output/name,'w',zipfile.ZIP_DEFLATED) as zz:
  for n,b in sorted(data.items()):
   i=zipfile.ZipInfo(n,(2026,1,1,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;zz.writestr(i,b)
(a.output/'descriptor.json').write_text(json.dumps(spec,indent=2));proof={'rows':rows,'originalReplayChecks':sourcechecks[:32],'sourceSHA256':sha(a.source_zip.read_bytes()),'cohortSHA256':sha(a.cohort_zip.read_bytes()),'recipeArchiveSHA256':sha(a.recipe_zip.read_bytes()),'recipeSHA256':sha(original),'files':{p.name:{'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size} for p in a.output.glob('*.zip')}};(a.output/'proof.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof['files']));print('64 approved outfit refs RGBA exact;32 original source components exact')
