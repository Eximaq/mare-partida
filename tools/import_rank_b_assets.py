"""Copy owner-supplied Rank B images/JSON unchanged and embed timing metadata."""
import hashlib,json,shutil,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1]);beta_aura=Path(sys.argv[2]) if len(sys.argv)>2 else source/'Beta Beta no Mi';manifest=[];effects={}
for key,folder,fruit,icons,vfx in [('beta','Beta Beta no Mi','Beta-Beta no Mi.png',['Skill 1.png','Skill 2.png'],[('burst','power-aura-take-3'),('slime','energy-orb-take-3'),('tether','power-aura-take-6')]),('hana','Hana Hana no Mi','Hana Hana no Mi.png',['Skill 3.png','Skill 4.png'],[('punch','power-aura-take-7'),('choke','power-aura-take-8')])]:
 out=root/'assets/akuma'/key;out.mkdir(parents=True,exist_ok=True)
 for original,target in [(fruit,'fruit.png'),(icons[0],'skill-1.png'),(icons[1],'skill-2.png')]+[(n+ext,n+ext) for k,n in vfx for ext in ['.png','.json']]:
  supplied=source/folder/original
  if key=='beta' and original in ['energy-orb-take-3.png','energy-orb-take-3.json']:supplied=beta_aura/original
  shutil.copyfile(supplied,out/target);manifest.append({'asset':(out/target).relative_to(root).as_posix(),'sha256':hashlib.sha256((out/target).read_bytes()).hexdigest()})
 for kind,n in vfx:
  j=json.loads((out/(n+'.json')).read_text());effects[kind]={'image':f'assets/akuma/{key}/{n}.png','frames':[{**f['frame'],'duration':f['duration']} for f in j['frames']]};effects[kind]['duration']=sum(f['duration'] for f in effects[kind]['frames'])
rules=json.loads((root/'assets/akuma/rank-b-rules.json').read_text(encoding='utf8'))
(root/'assets/akuma/rank-b-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
(root/'rank-b-data.js').write_text("'use strict';\nglobalThis.MareRankBData="+json.dumps({'rules':rules,'effects':effects},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
print('Imported',len(manifest),'supplied files and',len(effects),'animation sequences')
