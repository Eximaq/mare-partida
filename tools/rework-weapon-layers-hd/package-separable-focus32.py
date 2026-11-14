from pathlib import Path
import json,zipfile,hashlib,copy,shutil,io,argparse
from PIL import Image
parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True);args=parser.parse_args();p=args.source_dir;o=args.output_dir;o.mkdir(parents=True,exist_ok=True);spec=json.loads((p/'candidate.json').read_text());proof=json.loads((p/'proof.json').read_text());assert hashlib.sha256((p/'source-approved.zip').read_bytes()).hexdigest()=='feadc7e006834551bc7122ceeed4780bd9c2d5e9cf9e264e410d0d62d28f9da3';source=zipfile.ZipFile(p/'source-approved.zip');assert json.loads(source.read('TIMING.json'))=={'frames':8,'fps':12,'loop':False,'contactFrame':4};assets={}
def descriptor(h):
 b=(p/'assets'/(h+'.png')).read_bytes();assert hashlib.sha256(b).hexdigest()==h;im=Image.open(io.BytesIO(b));assert im.size==(640,640)and im.mode=='RGBA';assets[h]=b;return {'url':'assets/'+h+'.png','sha256':h,'size':[640,640]}
for d,parts in spec['directions'].items():
 parts['base']=[descriptor(h)for h in parts['base']]
 for slot in ['coats','weapons']:
  for item,frames in parts[slot].items():parts[slot][item]=[descriptor(h)for h in frames]
spec['approvedAppearance']={'hair':'original','hairColor':'brown','face':'original','eyeColor':'brown','skin':'light'};spec['scope']='Independent gear32 and optional coats151/158/165/179 on original male focus8 rig only; no punch clock or arbitrary extra slots.';spec['sourceProvenance']={'archive':'art-approved/weapons/clothing-batch-20261112/32_EW_M/Relicario32_Masculino_EAST_WEST_4Trajes_Editavel.zip','sha256':spec['sourceZIPsha256'],'commit':spec['sourceRef'],'clock':'TIMING.json plus original/RECIPE_AND_VERIFY.json clip:8frames12fps no hold','appearance':'Independent visual inspection of original/base-frames/00.png: original brown hair/face/brown eyes/light skin/blue shorts/no additional equipped slots; not pixel-identical punch rig.','west':'Literal approved-source mirror, per user direction; no historical WEST approval claimed.'}
name='separable-focus32-native-eight.zip'
with zipfile.ZipFile(o/name,'w',compression=zipfile.ZIP_STORED)as z:
 for h,b in sorted(assets.items()):
  info=zipfile.ZipInfo(h+'.png',date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_STORED;z.writestr(info,b)
a={'file':name,'sha256':hashlib.sha256((o/name).read_bytes()).hexdigest(),'bytes':(o/name).stat().st_size,'pngCount':len(assets),'compression':'stored'};(o/'rig.json').write_text(json.dumps(spec,indent=2)+'\n');(o/'archive-additions.json').write_text(json.dumps({'archives':[a],'sources':{h:{'archive':name,'path':h+'.png','bytes':len(b)}for h,b in assets.items()}},indent=2)+'\n');shutil.copyfile(p/'proof.json',o/'proof.json');print(a)
