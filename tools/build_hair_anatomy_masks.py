import pathlib,json,zipfile,io,numpy as np
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1];d=root/'tools/rework-modular-outfits-hd';a=json.loads((d/'archives/archive-index.json').read_text());x=json.loads((d/'index.json').read_text());sources={}
def load(s):
 e=a['sources'][s]
 with zipfile.ZipFile(d/'archives'/e['archive'])as z:return np.array(Image.open(io.BytesIO(z.read(e['path']))).convert('RGBA'))
for r in x['records']:
 if not r.get('paletteSourceMasks'):continue
 for l in r['pack']['directions'][r['direction']]['layers']:
  if l['slot']!='hair':continue
  s=l['source'];ms=r['paletteSourceMasks'].get(s,{}).get('skin')
  if not ms:continue
  mask=load(ms)[:,:,0];sources[s]=(mask,r['direction'])
# Base east512 hair is exactly the640 source with64 transparent padding removed.
e640=next(s for s,(m,dr)in sources.items()if dr=='east'and m.shape==(640,640));sources['bc1e1701bfa4ebeef48a107262cf17e707a0393a0708e8072bd46b1d3b552d2f']=(sources[e640][0][64:576,64:576], 'east')
data={}
for s,(m,dr)in sources.items():
 flat=m.flatten();runs=[];i=0
 while i<len(flat):
  if flat[i]==0:i+=1;continue
  j=i+1
  while j<len(flat)and flat[j]==flat[i]:j+=1
  runs.append([i,j-i,int(flat[i])]);i=j
 data[s]={'width':m.shape[1],'height':m.shape[0],'direction':dr,'skinRuns':runs}
(root/'tools/hair-anatomy-source-masks.json').write_text(json.dumps(data,separators=(',',':')))
module='''/* Verified skin fragments embedded in original male hair cutouts. Source PNGs are immutable. */
(function(root){'use strict';
const records=DATA;
function masks(source,data,appearanceAPI){const r=records[source];if(!r)return null;if(data.length!==r.width*r.height*4)throw Error('Hair anatomy source geometry mismatch');const hair=appearanceAPI.materialMask(data,'hair'),skin=new Uint8Array(r.width*r.height);for(const [start,count,tone]of r.skinRuns)for(let p=start;p<start+count;p++){skin[p]=tone;hair[p]=0;}return {hair,skin};}
function recolor(source,data,appearance,appearanceAPI){const m=masks(source,data,appearanceAPI);if(!m)return null;let out=new Uint8ClampedArray(data);const hair=appearance.hairColor,skin=appearance.skin||appearance.skinColor;if(hair&&hair!=='original'){const ramp=appearanceAPI.hairs[hair]?.ramp;if(!ramp)throw Error('Unsupported hair palette');out=appearanceAPI.recolor(out,m.hair,ramp);}if(skin&&skin!=='original'){const ramp=appearanceAPI.skins[skin]?.ramp;if(!ramp)throw Error('Unsupported skin palette');out=appearanceAPI.recolor(out,m.skin,ramp);}return out;}
const api={masks,recolor,records};root.MareHairAnatomyHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
'''.replace('DATA',json.dumps(data,separators=(',',':')))
(root/'player-rework-hair-anatomy-hd.js').write_text(module);print(len(data),'known hair sources',len(module),'bytes')
