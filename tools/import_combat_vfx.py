"""Copy owner-supplied sheets/JSON intact and rebuild normalized runtime data."""
import hashlib,json,shutil,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/combat-vfx'
def main(source):
 manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf8'));data=json.loads((OUT/'rules.json').read_text(encoding='utf8'))
 for item in manifest['assets']:
  key=item['id']
  for asset in item['files']:
   suffix=Path(asset['file']).suffix;raw=(source/(item['source']+suffix)).read_bytes();(OUT/asset['file']).write_bytes(raw);asset['sha256']=hashlib.sha256(raw).hexdigest()
  sheet=json.loads((OUT/(key+'.json')).read_text(encoding='utf8'));frames=sheet['frames'];frames=frames if isinstance(frames,list) else list(frames.values());frames=[dict(f['frame'],duration=f.get('duration',83)) for f in frames]
  data['effects'][key]['frames']=frames;data['effects'][key]['duration']=sum(f['duration'] for f in frames)
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8');(OUT/'rules.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8');(ROOT/'combat-vfx-data.js').write_text("'use strict';\nglobalThis.MareCombatVfxData="+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
if __name__=='__main__':main(Path(sys.argv[1]))
