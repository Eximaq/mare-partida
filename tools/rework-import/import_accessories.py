"""Import supplied, exact accessory matrices without changing their approval flags.
Usage: python tools/rework-import/import_accessories.py SOURCE_DIRECTORY OUTPUT_DIRECTORY
The source directory contains NORMALIZED_MANIFEST.json and its four packages.
"""
import hashlib,json,sys
from pathlib import Path

def sha(data): return hashlib.sha256(data).hexdigest()
def build(source,output):
 source,output=Path(source),Path(output);index=json.loads((source/'NORMALIZED_MANIFEST.json').read_text());result={'schema':'rework-accessory-source-index-v1','runtimeIntegrated':False,'productionEnabled':False,'packages':[],'records':index['records'],'assets':{}}
 for package in index['packages']:
  name=package['name'];p=source/name;dest=output/name;dest.mkdir(parents=True,exist_ok=True)
  entry={'name':name,'previewOnly':package['previewOnly'],'productionReady':package['sourceReadyFlag'],'files':{},'adjustmentCount':package['adjustmentCount']}
  for filename in ['catalog.json','adjustments.json','asset-map.json','TARGET_MAP.json']:
   if filename=='TARGET_MAP.json' and not (p/filename).exists():continue
   data=(p/filename).read_bytes();(dest/filename).write_bytes(data);entry['files'][filename]=sha(data)
  for asset in sorted((p/'assets').glob('*.png')):
   data=asset.read_bytes();digest=sha(data)
   if digest!=asset.stem:raise ValueError('Asset integrity mismatch: '+str(asset))
   target=output/'assets'/asset.name;target.parent.mkdir(exist_ok=True)
   if target.exists() and target.read_bytes()!=data:raise ValueError('Digest collision')
   target.write_bytes(data);result['assets'][digest]={'file':'assets/'+asset.name,'sha256':digest,'bytes':len(data)}
  result['packages'].append(entry)
 for record in result['records']:
  record['directionContract']['catalog']=record['package']+'/catalog.json'
 result['counts']={'adjustments':len(result['records']),'hideHair':sum(r['adjustment'].get('hideHair') is True for r in result['records']),'assets':len(result['assets'])}
 output.mkdir(parents=True,exist_ok=True);(output/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 return result
if __name__=='__main__':
 r=build(sys.argv[1],sys.argv[2]);print(json.dumps(r['counts']))
