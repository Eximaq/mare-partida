"""Package byte-preserved F151 v64 garment layers, retaining independent pants.
Usage: python tools/package-slot151.py --source-zip SOURCE --root REPO
No extraction of clothes from composite images, recoloring, scaling, or new pixels.
"""
import argparse,copy,hashlib,json,zipfile
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('--source-zip',required=True);ap.add_argument('--root',default='.');a=ap.parse_args();root=Path(a.root);out=root/'tools/rework-modular-outfits-hd';z=zipfile.ZipFile(a.source_zip)
assert hashlib.sha256(Path(a.source_zip).read_bytes()).hexdigest()=='ed67071e3d570231275e2e35a06b7c595fc7cf401fd3f023fe7a7b90e051e63e'
i=json.loads((out/'index.json').read_bytes());ai=json.loads((out/'archives/archive-index.json').read_bytes());assets={};records=[];provenance={}
for direction in ['east','west']:
 p=json.loads(z.read(f'current/{direction}/pack.json'));d=p['directions'][direction];keep=[l for l in d['layers'] if l['id']=='visible-clothed-composite' or l['id'].startswith(('coat151-','original-neck-coverage')) or l['id']=='native-visible-near-arm-manual']
 for l in keep:
  names={}
  for f in set(l.get('frames',[])+[l['source']]):
   data=z.read(f'current/{direction}/{f}');h=hashlib.sha256(data).hexdigest();assets[h]=data;names[f]=h;provenance[f'current/{direction}/{f}']=h
  l['source']=names[l['source']]
  if 'frames'in l:l['frames']=[names[f] for f in l['frames']]
 for pants in [None,147,168]:
  pd=copy.deepcopy(d);pd['layers']=copy.deepcopy(keep)
  if pants:
   pr=next(r for r in i['independentPants']['records'] if r['direction']==direction and r['equipment']=={'pants':pants})
   assert pr['pack']['directions'][direction]['clip']==d['clip']
   extras=copy.deepcopy(pr['pack']['directions'][direction]['layers'][1:])
   for n,l in enumerate(extras):l['depth']=5+n*.1
   pd['layers']+=extras
  record={'id':f'approved-female151-v64-walk-{direction}-pants{pants or "none"}','body':'female','direction':direction,'action':'walk','equipment':{'torso':151,**({'pants':pants}if pants else{})},'approvedAppearance':{'hair':'original','hairColor':'brown','face':'original','eyeColor':'brown','skin':'light'},'slotComposition151':True,'sourceRevision':'F151-v64-native-12','approvalMessage':'Sentinel_680f67052cb08191ab1715e7af335f3e','pack':{'density':4,'frame':p['frame'],'pivot':p['pivot'],'directions':{direction:pd}},'sourceRefs':sorted({f for l in pd['layers'] for f in l.get('frames',[l['source']])})}
  records.append(record)
assert not any(r.get('slotComposition151') for r in i['records']);i['records']+=records
# All116 approved source PNGs already exist in published archives. Reuse them.
for h,data in assets.items():
 assert h in ai['sources'] and ai['sources'][h]['bytes']==len(data),('Missing prior original source',h)
for r in records:
 deps=sorted({ai['sources'][h]['archive'] for h in r['sourceRefs']});ai['recordDependencies'].append({'id':r['id'],'action':'walk','archives':deps,'pngBytes':sum(ai['sources'][h]['bytes']for h in r['sourceRefs']),'coldBytes':sum(x['bytes']for x in ai['archives']if x['file']in deps)})
for path,obj in [(out/'index.json',i),(out/'archives/archive-index.json',ai)]:path.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'records':len(records),'assets':len(assets),'newProductionPNGs':0}))

(out/'slot151-provenance.json').write_text(json.dumps({'sourceSHA256':hashlib.sha256(Path(a.source_zip).read_bytes()).hexdigest(),'approvalMessage':'Sentinel_680f67052cb08191ab1715e7af335f3e','members':provenance},indent=2,sort_keys=True)+'\n')
# Keep the existing integrity-checked gzip transport synchronized.
import gzip
manifest_path=root/'tools/native-index-transport.json';manifest=json.loads(manifest_path.read_bytes())
for e in manifest['indexes']:
 if e['target']=='tools/rework-modular-outfits-hd/index.json':
  data=(root/e['target']).read_bytes();packed=gzip.compress(data,compresslevel=9,mtime=0);(root/e['source']).write_bytes(packed);e.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),compressedBytes=len(packed),compressedSha256=hashlib.sha256(packed).hexdigest())
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
