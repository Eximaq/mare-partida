"""Import approved PixelLab HD pieces without reducing source detail.

--input=private.json: [{itemId,file,grip:{x,y},tip:{x,y},logicalLength,
generation:{tool:'pixellab',model:'pro',jobId,assetId,candidate},view?:south|north}]
The shared rig uses logicalLength only for fit. Raster density preserves the HD
source inside the same wardrobe, occlusion masks, animation clock and emitter.
"""
import argparse,hashlib,json,math
from io import BytesIO
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'tools/paper-doll-96-v3'
sha=lambda raw:hashlib.sha256(raw).hexdigest()

def install(plan):
 catalog=json.loads((BASE/'weapons.json').read_text(encoding='utf8'))
 for entry in json.loads(plan.read_text(encoding='utf8')):
  item=next(i for i in catalog['items'] if i['itemId']==entry['itemId'])
  if item['itemId']<109:raise ValueError('Legacy materials are outside this importer')
  raw=(plan.parent/entry['file']).read_bytes();im=Image.open(BytesIO(raw)).convert('RGBA')
  if im.width>128 or im.height>128:raise ValueError('HD source exceeds shared material canvas')
  if set(im.getchannel('A').tobytes())-{0,255}:raise ValueError('Source has alpha halos')
  grip,tip=entry['grip'],entry['tip']
  for p in [grip,tip]:
   if not im.getpixel((p['x'],p['y']))[3]:raise ValueError('Socket must be occupied')
  if not 8<=entry['logicalLength']<=64:raise ValueError('Invalid fit length')
  generation=entry['generation']
  if generation['tool']!='pixellab' or generation['model']!='pro':raise ValueError('Selected PixelLab Pro source required')
  left,top=(128-im.width)//2,(128-im.height)//2;tile=Image.new('RGBA',(128,128));tile.paste(im,(left,top));box=tile.getbbox()
  direction=entry.get('view');suffix='-'+direction if direction else ''
  if direction and direction not in ['south','north']:raise ValueError('Invalid view')
  source=f"assets/weapon-item-{item['itemId']}{suffix}.png";dest=BASE/source;tile.save(dest)
  g={k:grip[k]+(left if k=='x' else top) for k in ['x','y']};t={k:tip[k]+(left if k=='x' else top) for k in ['x','y']}
  material=dict(source=source,sha256=sha(dest.read_bytes()),grip=g,tip=t,
    axisAngle=entry.get('axisAngle',math.atan2(t['y']-g['y'],t['x']-g['x'])+math.pi/2),
    bounds=dict(x0=box[0],y0=box[1],x1=box[2]-1,y1=box[3]-1),
    materialScale=entry['logicalLength']/max(box[2]-box[0],box[3]-box[1]),renderDensity=3,
    visibleHeight=entry['logicalLength'],generation={**generation,
      'nativeCanvas':dict(width=im.width,height=im.height),'nativeSha256':sha(raw),
      'processing':'Source pixels preserved; logical hand fit with 3x composition, no colour downsampling'})
  if direction:item.setdefault('views',{})[direction]=material
  else:item.update(material)
 catalog['revision']='weapons96-hd-batch1-'+sha(json.dumps(catalog['items'],sort_keys=True).encode())[:10]
 (BASE/'weapons.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 release=json.loads((BASE/'player-pack.json').read_text());release['weaponRevision']=catalog['revision']
 (BASE/'player-pack.json').write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print('Imported',len(json.loads(plan.read_text(encoding='utf8'))),'HD materials; run player96_release.py --write')

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--input',required=True,type=Path);args=parser.parse_args();install(args.input)
