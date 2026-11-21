"""Replay approved F182 SN layers; split anatomy only on the original uncovered-body rule."""
import argparse,pathlib,zipfile,json,hashlib,io
import numpy as np
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--selected-index',required=True);p.add_argument('--output',required=True);a=p.parse_args();out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True);H=lambda b:hashlib.sha256(b).hexdigest();raw=pathlib.Path(a.source).read_bytes();assert H(raw)=='a6b4587a08d81992454aa943be584ba7a7fb03218598b5e590085c50a9fca5f2';z=zipfile.ZipFile(io.BytesIO(raw));ir=pathlib.Path(a.selected_index).read_bytes();assert H(ir)=='e42bfdbd5787b513f08f823340cdfc45d20b5336379a17569c3d8e2ce547c5f4';selected=json.loads(zipfile.ZipFile(io.BytesIO(ir)).read('FAMILY182_SELECTED_INDEX.json'));prefix='sn-material-v3/';timelines=json.loads(z.read(prefix+'TIMELINES.json'));assets={};refs={};proof={'sourceSHA256':H(raw),'selectedIndexSHA256':H(ir),'revision':'EW38_SN3','policy':'Source body split into complementary covered/uncovered anatomy by cloth alpha==0 AND owner alpha==0; union RGBA exactly original. Original cloth and owners copied verbatim. No torso combination support.','directions':{}}
def encode(im):
 b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()
def add(b):
 h=H(b);assets[h+'.png']=b;return h
for t in timelines:
 d=t['direction'];states=[]
 for k,e in enumerate(t['sequence']):
  b=z.read(prefix+e['path']);c=z.read(prefix+f'cloth/{d}-{k}.png');o=z.read(prefix+f'owners/{d}-{k}.png');ref=z.read(prefix+f'frames/{d}-{k}.png');rh=H(ref);assert next(r for r in selected['poses']if r['direction']==d and r['sample']==k)['sha256']==rh
  ba=np.array(Image.open(io.BytesIO(b)).convert('RGBA'));ca=np.array(Image.open(io.BytesIO(c)).convert('RGBA'));oa=np.array(Image.open(io.BytesIO(o)).convert('RGBA'));uncovered=(ca[:,:,3]==0)&(oa[:,:,3]==0);covered=ba.copy();covered[uncovered]=0;restored=ba.copy();restored[~uncovered]=0;assert np.array_equal(covered.astype('uint16')+restored.astype('uint16'),ba)
  layers=[add(encode(Image.fromarray(covered))),add(c),add(o),add(encode(Image.fromarray(restored)))];add(b);refs[rh+'.png']=ref;states.append({'phase':k,'durationMs':e['durationMs'],'baseSHA256':H(b),'clothSHA256':H(c),'ownerSHA256':H(o),'layers':layers,'referenceSHA256':rh,'anatomyUnionRGBAExact':True})
 proof['directions'][d]={'states':states,'durationMs':[s['durationMs']for s in states],'ticks':[s['phase']for s in states for _ in range(s['durationMs']//25)]}
for name,entries in [('f182-sn-original-layers.zip',assets),('f182-sn-approved-references.zip',refs)]:
 with zipfile.ZipFile(out/name,'w')as dest:
  for n,b in sorted(entries.items()):
   i=zipfile.ZipInfo(n,(2020,1,1,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;dest.writestr(i,b)
 proof.setdefault('archives',[]).append({'file':name,'sha256':H((out/name).read_bytes()),'bytes':(out/name).stat().st_size,'pngCount':len(entries)})
(out/'proof.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof['archives']))
