import json,hashlib,glob
from pathlib import Path
import argparse
a=argparse.ArgumentParser();a.add_argument('--sources',required=True);a=a.parse_args()
ROOT=Path(__file__).resolve().parents[1]; out=ROOT/'tools/rework-accessories/head-layer-index.json'; records=[]
manifest=json.load(open(ROOT/'tools/rework-accessories/manifest.json'))
for path in glob.glob(str(Path(a.sources)/'*/catalog.json')):
 package=Path(path).parent.name; cat=json.load(open(path))
 for e in cat['entries']:
  for direction,d in e['pack']['directions'].items():
   adjustments=[r for r in manifest['records'] if r['package']==package and r['target']['snapshot']==e['id'] and r['target']['direction']==direction]
   status='approved-adjustment' if adjustments else 'adjustment-zero-candidate'
   if not adjustments:
    adjustment=({'x':0,'y':0,'scale':100,'hideHair':False,'layers':{}} if 'hair_user' in package else {'gearX':0,'gearY':0,'gearScale':100,'hairX':0,'hairY':0,'hairScale':100,'lineOffset':0,'policy':'calibrated','hideHair':False})
    adjustments=[{'package':package,'target':{'snapshot':e['id'],'packSHA256':e['packSHA256'],'body':e['body'],'style':e['style'],'direction':direction,**({'item':e['item']} if e.get('item') else {})},'adjustment':adjustment}]
   layers=[l for l in d['layers'] if l['slot'] in ('headBase','face','hair') or l['id']==d.get('headgearPolicy',{}).get('gearId')]
   sources=sorted(set(l['source'] for l in layers));
   for src in sources:
    data=(ROOT/'tools/rework-accessories/assets'/f'{src}.png').read_bytes();assert hashlib.sha256(data).hexdigest()==src
   records.append({'status':status,'package':package,'snapshot':e['id'],'packSHA256':e['packSHA256'],'body':e['body'],'style':e['style'],'item':e.get('item'),'direction':direction,'density':4,'frame':e['pack']['frame'],'pivot':e['pack']['pivot'],'rest':{k:v for k,v in d['rest'].items() if k in ('NECK','NOSE')},'layers':layers,'headgearPolicy':d.get('headgearPolicy'),'adjustmentRecord':adjustments[0],'sourceRefs':sources,'entry':{**{k:v for k,v in e.items() if k not in ('pack','rawHair')},'pack':{**e['pack'],'directions':{direction:{**d,'layers':layers}}}}})
json.dump({'schema':'rework-head-layer-index-v1','sourcePixelPolicy':'all source PNGs unchanged, density4; excludes torso/body/arms/pants','coverage':'exact adjusted targets; not arbitrary headgear/hair pairing','productionEnabled':False,'records':records},open(out,'w'),separators=(',',':'))
print(out,len(records))
