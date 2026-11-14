import argparse,pathlib,zipfile,json,io,hashlib
import numpy as np
from PIL import Image
from scipy.ndimage import label
p=argparse.ArgumentParser();p.add_argument('--source-dir',required=True);p.add_argument('--output',required=True);a=p.parse_args();root=pathlib.Path(a.source_dir);out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True);H=lambda b:hashlib.sha256(b).hexdigest()
def enc(im):
 b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()
def image(z,n):return Image.open(io.BytesIO(z.read(n))).convert('RGBA')
components={};refs={};manifest={'scope':'F147 S8/N9 and F168 SN4 only. No new art, runtime or appearance substitution.','approvedAppearance':None,'appearanceBlocker':'Source metadata does not name engine appearance keys. Match original base SHA to authoritative runtime defaults before production binding; do not assume male sword colors.','profiles':[]}
for item,name in [(147,'Calca147_SN_Runtime_84.zip'),(168,'Calca168_SN_Runtime_81.zip')]:
 z=zipfile.ZipFile(root/name);sourceH=H((root/name).read_bytes())
 for d,n in [('south',10),('north',12)]:
  seq=[];states=[]
  tm=json.loads(z.read(f'original/candidate-s8-n9/{d}/TIMELINE.json')) if item==147 else next(x for x in json.loads(z.read('original/cycle-r4/TIMELINES.json'))if x['direction']==d)
  for i,t in enumerate(tm['sequence']):
   seq.extend([str(i)]*(t['durationMs']//25))
   if item==147:
    prefix=f'original/candidate-s8-n9/{d}/';bp=prefix+f'base-{i}.png';cp=prefix+f'cloth-{i}.png';rp=prefix+f'frame-{i}.png'
   else:bp=f'original/baseline-v2/assets/{d}-{i}.png';cp=f'original/cycle-r4/cloth/{d}-{i}.png';rp=f'original/cycle-r4/frames/{d}-{i}.png'
   base=image(z,bp);cloth=image(z,cp);layers=[];notes={}
   if item==147:
    b=np.array(base);r,g,bb=[b[:,:,j].astype(float)for j in range(3)];yy,xx=np.indices(r.shape);skin=(r>g*1.2)&(g>bb*1.12)&(r>90)&(b[:,:,3]>128);labs,_=label(skin);ids=np.unique(labs[(yy<235)&skin]);owner=np.isin(labs,ids)&skin
    c=np.array(cloth);c[owner]=0;cloth=Image.fromarray(c);final=Image.alpha_composite(base,cloth);notes={'ownerPolicy':'Verbatim original recompose_sn_selected.py connected upper-skin rule; remove cloth only under that owner, no final-image extraction.','ownerMaskSHA256':H(enc(Image.fromarray((owner*255).astype('uint8'))))}
    layers=[('anatomy',base),('garment',cloth)]
   else:
    op=f'original/baseline-v2/owners/{d}-{i}.png';owner=image(z,op);final=Image.alpha_composite(Image.alpha_composite(base,cloth),owner);layers=[('anatomy',base),('garment',cloth),('original-owner-RGBA',owner)];notes={'ownerSource':op,'ownerSHA256':H(z.read(op))}
   raw=enc(final);assert raw==z.read(rp),(item,d,i);rh=H(raw);refs[rh+'.png']=raw
   state={'state':str(i),'durationMs':t['durationMs'],'layers':[],'referenceSHA256':rh,'sourceBase':{'member':bp,'sha256':H(z.read(bp))},'sourceCloth':{'member':cp,'sha256':H(z.read(cp))},**notes}
   for role,im in layers:
    raw=enc(im);h=H(raw);components[h+'.png']=raw;state['layers'].append({'role':role,'operation':'source-over','member':h+'.png','sha256':h})
   if item==168:
    op=f'original/cycle-r4/frames/{d}-{i}-opaque.png';opaque=image(z,op);bg=Image.new('RGB',opaque.size,opaque.getpixel((0,0))[:3]);bg.paste(final,(0,0),final);assert np.array_equal(np.array(bg),np.array(opaque.convert('RGB')));raw=z.read(op);h=H(raw);refs[h+'.png']=raw;state['selectedOpaqueReferenceSHA256']=h
   states.append(state)
  assert len(seq)==40;manifest['profiles'].append({'item':item,'body':'female','action':'walk','direction':d,'canvas':[512,512],'density':4,'pivot':[64,112],'sourceArchive':name,'sourceArchiveSHA256':sourceH,'phaseCount':n,'clock':{'cycleMs':1000,'tickMs':25,'ticks':seq,'authoredDurationsMs':[s['durationMs']for s in states]},'states':states})
for fn,entries in [('components.zip',components),('references.zip',refs)]:
 with zipfile.ZipFile(out/fn,'w')as zz:
  for n,data in sorted(entries.items()):
   i=zipfile.ZipInfo(n,(2020,1,1,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;zz.writestr(i,data)
 manifest.setdefault('archives',[]).append({'name':fn,'sha256':H((out/fn).read_bytes()),'members':len(entries)})
manifest['verification']={'authoredPosesByteExact':44,'sourceTicksCovered':160,'opaque168RGBExact':22,'notTested':['runtime sampler','appearance identifiers','browser/map','other wardrobe combinations']};(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest['archives']))
