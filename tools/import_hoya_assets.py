"""Import the existing Genio Hoya ZIP and supplied VFX/icons, without generation."""
import hashlib,io,json,shutil,sys,zipfile
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];archive=Path(sys.argv[1]);source=Path(sys.argv[2]);out=root/'assets/akuma/hoya';out.mkdir(parents=True,exist_ok=True);assets=[];clips={};effects={}
for original,target in [('Hoya Hoya no Mi.png','fruit.png'),('Skill 1.png','skill-1.png'),('Skill 2.png','skill-2.png')]+[(n+ext,n+ext) for n in ['power-aura-take-6','power-aura-take-7'] for ext in ['.png','.json']]:
 shutil.copyfile(source/original,out/target);assets.append({'asset':target,'sha256':hashlib.sha256((out/target).read_bytes()).hexdigest()})
with zipfile.ZipFile(archive) as z:
 folders=sorted(set(n.split('/')[2] for n in z.namelist() if n.startswith('Idle/animations/')))
 for action,folder in [('idle',None),('walk',next(n for n in folders if n.startswith('Glide_forward'))),('attack',next(n for n in folders if n.startswith('Wind_up')))]:
  clips[action]={}
  for direction in ['south','north','east','west']:
   idle=Image.open(io.BytesIO(z.read(f'Idle/rotations/{direction}.png'))).convert('RGBA');foot=idle.getbbox()[3]
   names=[f'Idle/rotations/{direction}.png'] if folder is None else sorted(n for n in z.namelist() if n.startswith(f'Idle/animations/{folder}/{direction}/') and n.endswith('.png'))
   frames=[Image.open(io.BytesIO(z.read(n))).convert('RGBA') for n in names];size=max(max(im.size) for im in frames);sheet=Image.new('RGBA',(size*len(frames),size))
   for i,im in enumerate(frames):sheet.paste(im,(size*i+(size-im.width)//2,(size-im.height)//2))
   name=f'{action}-{direction}.png';sheet.save(out/name);clips[action][direction]={'image':'assets/akuma/hoya/'+name,'size':size,'frames':len(frames),'foot':foot+(size-64)/2,'fps':12,'source':names,'rgba_sha256':[hashlib.sha256(im.tobytes()).hexdigest() for im in frames]}
for kind,n in [('buff','power-aura-take-6'),('summoner','power-aura-take-7')]:
 j=json.loads((out/(n+'.json')).read_text());effects[kind]={'image':f'assets/akuma/hoya/{n}.png','frames':[{**f['frame'],'duration':f['duration']} for f in j['frames']]};effects[kind]['duration']=sum(f['duration'] for f in effects[kind]['frames'])
manifest={'character_id':'5d3f6ff4-657d-4668-865a-1f677a4f279b','zip_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'assets':assets,'clips':clips};(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8');rules=json.loads((out/'rules.json').read_text(encoding='utf8'))
(root/'hoya-data.js').write_text("'use strict';\nglobalThis.MareHoyaData="+json.dumps({'rules':rules,'clips':clips,'effects':effects},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
print('Imported seven supplied files and',sum(c['frames'] for ds in clips.values() for c in ds.values()),'original Genie frames')
