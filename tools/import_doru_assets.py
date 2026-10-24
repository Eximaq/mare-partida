"""Copy owner-supplied Doru PNG/JSON and embed animation metadata for file:// support.

Usage: python tools/import_doru_assets.py supplied-art-folder
"""
import hashlib,json,shutil,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
out=root/'assets/akuma/doru'
source=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
manifest={'source':'Owner-supplied Doru Doru item, icons and PixelLab VFX exports; no new generation','assets':[]}
for original,target in [('Doru Doru no Mi.png','fruit.png'),('Skill 1.png','skill-1.png'),('Skill 2 (1).png','skill-2.png'),('effect-take-1.png','effect-take-1.png'),('effect-take-1.json','effect-take-1.json'),('firelight-take-1.png','firelight-take-1.png'),('firelight-take-1.json','firelight-take-1.json')]:
    shutil.copyfile(source/original,out/target)
    manifest['assets'].append({'asset':target,'sha256':hashlib.sha256((out/target).read_bytes()).hexdigest()})
animations={}
for key,name in [('1','effect-take-1'),('2','firelight-take-1')]:
    data=json.loads((out/(name+'.json')).read_text())
    animations[key]={'image':f'assets/akuma/doru/{name}.png','anchor':data['meta']['anchor'],'frames':[{**f['frame'],'duration':f['duration']} for f in data['frames']]}
rules=json.loads((out/'rules.json').read_text(encoding='utf8'))
(root/'doru-data.js').write_text("'use strict';\nglobalThis.MareDoruData="+json.dumps({'rules':rules,'animations':animations},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
(out/'manifest.json').write_bytes((json.dumps(manifest,indent=2)+'\n').encode('utf8'))
print('Copied seven supplied files byte-for-byte; embedded both JSON animation sequences')
