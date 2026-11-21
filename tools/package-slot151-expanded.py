"""Append twelve exact F151 combinations using already approved immutable layers.
Run on the published twelfth-lot parent. No image writing or runtime changes.
"""
import argparse,copy,gzip,hashlib,json
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('--root',default='.');a=ap.parse_args();root=Path(a.root);out=root/'tools/rework-modular-outfits-hd';i=json.loads((out/'index.json').read_bytes());ai=json.loads((out/'archives/archive-index.json').read_bytes())
ids=[21,22,133,161,175,182];added=[]
for direction in ['east','west']:
 base=next(r for r in i['records'] if r.get('slotComposition151') and r['direction']==direction and 'pants'not in r['equipment'])
 for pants in ids:
  pr=next(r for r in i['independentPants']['records'] if r['direction']==direction and r['equipment']=={'pants':pants});r=copy.deepcopy(base);d=r['pack']['directions'][direction];pd=pr['pack']['directions'][direction];assert d['clip']==pd['clip'];assert r['pack']['pivot']==pr['pack']['pivot'];r.update(id=f'approved-female151-v64-walk-{direction}-pants{pants}',equipment={'torso':151,'pants':pants},slotComposition151Expansion=True,pantsSourceRevision=pr['approvedSourceRevision'],pantsSourceArchive=pr['sourceArchive']);assert not any(v['id']==r['id']for v in i['records'])
  for n,l in enumerate(copy.deepcopy(pd['layers'][1:])):l['depth']=5+n*.1;d['layers'].append(l)
  r['sourceRefs']=sorted({f for l in d['layers'] for f in l.get('frames',[l['source']])});assert all(h in ai['sources']for h in r['sourceRefs']);i['records'].append(r);added.append(r)
  deps=sorted({ai['sources'][h]['archive']for h in r['sourceRefs']});ai['recordDependencies'].append({'id':r['id'],'action':'walk','archives':deps,'pngBytes':sum(ai['sources'][h]['bytes']for h in r['sourceRefs']),'coldBytes':sum(x['bytes']for x in ai['archives']if x['file']in deps)})
for p,v in [(out/'index.json',i),(out/'archives/archive-index.json',ai)]:p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'))+'\n')
mp=root/'tools/native-index-transport.json';m=json.loads(mp.read_bytes())
for e in m['indexes']:
 if e['target']=='tools/rework-modular-outfits-hd/index.json':
  b=(root/e['target']).read_bytes();z=gzip.compress(b,compresslevel=9,mtime=0);(root/e['source']).write_bytes(z);e.update(bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),compressedBytes=len(z),compressedSha256=hashlib.sha256(z).hexdigest())
mp.write_text(json.dumps(m,indent=2)+'\n');print('12 records appended; zero new source pixels or archives')
