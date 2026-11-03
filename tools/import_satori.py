"""Pack the owner's current Satori clips without generating or resampling."""
import importlib.util,sys,json,zipfile,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'tools'))
import import_sprite_combat_v2 as importer
from server.monsters import CATALOG
source=ROOT/'.maintenance-local';importer.SOURCE=source
raw=urllib.request.urlopen('https://api.pixellab.ai/mcp/characters/ea69180d-a29c-4297-9ca3-8a0b7e34d88c/download',timeout=120).read();(source/'satori.zip').write_bytes(raw)
importer.category=lambda key,name:'walk' if name.startswith('Shift_') else 'hurt' if name.startswith('Clench_') else 'attack'
key,e=importer.import_one(dict(key='satori',id='ea69180d-a29c-4297-9ca3-8a0b7e34d88c',source='name: Satori'))
e.update(monster=True,worldHeight=120,world_scale=1)
for a,ds in e['clips'].items():
 for d,c in ds.items():
  c['anchor']=[c['size']/2,c['bounds'][0][3]]
  if a=='attack':c['impact_frame']=8
assert all(d in e['clips']['walk'] for d in ['north','south','east','west'])
p=ROOT/'sprite-combat-v2-data.js';s=p.read_text(encoding='utf8');tail=s.split('globalThis.MareSpriteCombatV2Data=',1)[1];data,end=json.JSONDecoder().raw_decode(tail);data['satori']=e;p.write_text("'use strict';\nglobalThis.MareSpriteCombatV2Data="+json.dumps(data,separators=(',',':'))+tail[end:],encoding='utf8')
(ROOT/'assets/sprites-combat-v2/satori/metadata.json').write_text(json.dumps(e,indent=2),encoding='utf8')
(ROOT/'monster-catalog.js').write_text("'use strict';((root)=>{const catalog="+json.dumps(CATALOG,separators=(',',':'))+";root.MareMonsterCatalog=catalog;if(typeof module!=='undefined')module.exports=catalog;})(globalThis);\n",encoding='utf8')
print('Satori imported',[(a,list(ds)) for a,ds in e['clips'].items()],CATALOG['satori'])
