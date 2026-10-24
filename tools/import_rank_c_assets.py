"""Copy owner-supplied Rank C art unchanged and embed its frame metadata."""
import hashlib,json,shutil,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]);effects={};manifest=[]
for key,folder,fruit,icons,vfx in [('horu','Horu Horu no Mi','Horu Horu no Mi.png',['Skill 1 .png','Skill 2 .png'],[('heal','firelight-take-6'),('mutation','firelight-take-7')]),('mato','Mato Mato no Mi','Mato Mato no Mi.png',['Skill 1.png','Skill 2.png'],[('axe','firelight-take-8'),('mark','firelight-take-9')])]:
 out=root/'assets/akuma'/key;out.mkdir(parents=True,exist_ok=True)
 names=[(fruit,'fruit.png'),(icons[0],'skill-1.png'),(icons[1],'skill-2.png')]+[(name+ext,name+ext) for kind,name in vfx for ext in ['.png','.json']]
 for original,target in names:
  shutil.copyfile(source/folder/original,out/target);manifest.append({'asset':str((out/target).relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256((out/target).read_bytes()).hexdigest()})
 for kind,name in vfx:
  data=json.loads((out/(name+'.json')).read_text());effects[kind]={'image':'assets/akuma/'+key+'/'+name+'.png','anchor':data['meta']['anchor'],'frames':[{**f['frame'],'duration':f['duration']} for f in data['frames']]};effects[kind]['duration']=sum(f['duration'] for f in effects[kind]['frames'])
(root/'assets/akuma/rank-c-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
rules=json.loads((root/'assets/akuma/rank-c-rules.json').read_text(encoding='utf8'))
(root/'rank-c-data.js').write_text("'use strict';\nglobalThis.MareRankCData="+json.dumps({'rules':rules,'effects':effects},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
print('Copied 14 original files and four animation sequences')
