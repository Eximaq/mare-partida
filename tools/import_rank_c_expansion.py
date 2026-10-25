"""Import existing Bison PixelLab export and owner-supplied art; no generation."""
import hashlib,io,json,shutil,sys,zipfile
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];archive=Path(sys.argv[1]);source=Path(sys.argv[2]);manifest=[];effects={};clips={}
for key,folder,fruit,icons,vfx in [('bison','Ushi Ushi no Mi','Ushi Ushi no Mi Bisao.png',['Skill 1.png','Skill 2.png'],[('shell','heal-pillar-take-1')]),('bomu','Bomu Bomu no Mi','Bomu Bomu no Mi.png',['Skill 3.png','Skill 4.png'],[('breath','explosion-take-1'),('bomb','explosion-take-2')]),('kobu','Kobu Kobu no Mi','Kobu Kobu no Mi.png',['Skill 5.png','Skill 6.png'],[('revolution','firelight-take-10'),('deposition','firelight-take-12')])]:
 out=root/'assets/akuma'/key;out.mkdir(parents=True,exist_ok=True)
 for original,target in [(fruit,'fruit.png'),(icons[0],'skill-1.png'),(icons[1],'skill-2.png')]+[(n+ext,n+ext) for kind,n in vfx for ext in ['.png','.json']]:
  shutil.copyfile(source/folder/original,out/target);manifest.append({'asset':str((out/target).relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256((out/target).read_bytes()).hexdigest()})
 for kind,n in vfx:
  data=json.loads((out/(n+'.json')).read_text());effects[kind]={'image':f'assets/akuma/{key}/{n}.png','frames':[{**f['frame'],'duration':f['duration']} for f in data['frames']]};effects[kind]['duration']=sum(f['duration'] for f in effects[kind]['frames'])
with zipfile.ZipFile(archive) as z:
 folders=sorted(set(n.split('/')[2] for n in z.namelist() if n.startswith('Idle/animations/')))
 for action,folder in [('idle',None),('walk','Running'),('attack',next(n for n in folders if n.startswith('Lower_the_head'))),('dash','Jump_Attack')]:
  clips[action]={}
  for direction in ['south','north','east','west']:
   names=[f'Idle/rotations/{direction}.png'] if folder is None else sorted(n for n in z.namelist() if n.startswith(f'Idle/animations/{folder}/{direction}/') and n.endswith('.png'))
   frames=[Image.open(io.BytesIO(z.read(n))).convert('RGBA') for n in names];size=max(max(im.size) for im in frames);sheet=Image.new('RGBA',(size*len(frames),size));feet=[]
   for i,im in enumerate(frames):
    dx,dy=(size-im.width)//2,(size-im.height)//2;sheet.paste(im,(size*i+dx,dy));feet.append(im.getbbox()[3]+dy)
   name=f'{action}-{direction}.png';sheet.save(root/'assets/akuma/bison'/name);clips[action][direction]={'image':'assets/akuma/bison/'+name,'size':size,'frames':len(frames),'feet':feet,'fps':12,'source':names,'hitFrameRatio':.5}
shutil.copyfile(root/'assets/akuma/bison/idle-south.png',root/'assets/akuma/bison/preview-south.png')
rules=json.loads((root/'assets/akuma/rank-c-expansion-rules.json').read_text(encoding='utf8'))
(root/'assets/akuma/rank-c-expansion-manifest.json').write_text(json.dumps({'character_id':'85edd3a5-c083-4fe2-9062-819e765f4314','zip_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'assets':manifest,'clips':clips},indent=2)+'\n',encoding='utf8')
(root/'rank-c-expansion-data.js').write_text("'use strict';\nglobalThis.MareRankCExpansionData="+json.dumps({'rules':rules,'effects':effects,'clips':clips},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
print('Imported',len(manifest),'supplied files and',sum(c['frames'] for ds in clips.values() for c in ds.values()),'original Bison frames')
