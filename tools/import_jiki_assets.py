"""Import owner-supplied Jiki assets unchanged and embed original frame timing."""
import hashlib,json,shutil,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1]);out=root/'assets/akuma/jiki';out.mkdir(parents=True,exist_ok=True);manifest=[];effects={}
files=[('Jiki Jiki no Mi.png','fruit.png'),('Skill 1.png','skill-1.png'),('Skill 2.png','skill-2.png')]+[(n+ext,n+ext) for n in ['power-aura-take-5','explosion-take-1','explosion-take-3'] for ext in ['.png','.json']]
for original,target in files:
 shutil.copyfile(source/original,out/target);manifest.append({'asset':target,'sha256':hashlib.sha256((out/target).read_bytes()).hexdigest()})
for kind,name in [('charge','power-aura-take-5'),('blast','explosion-take-1'),('rocket','explosion-take-3')]:
 j=json.loads((out/(name+'.json')).read_text(encoding='utf8'));frames=[{**f['frame'],'duration':f['duration']} for f in j['frames']];effects[kind]={'image':'assets/akuma/jiki/'+name+'.png','frames':frames,'duration':sum(f['duration'] for f in frames)}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8',newline='\n');data={'rules':json.loads((out/'rules.json').read_text(encoding='utf8')),'effects':effects};(root/'jiki-data.js').write_text("'use strict';\nglobalThis.MareJikiData="+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8');print('Imported',len(files),'files and',len(effects),'Jiki sequences')
