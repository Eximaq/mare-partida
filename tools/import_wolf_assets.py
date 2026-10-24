"""Import an existing PixelLab Wolf ZIP and the owner's supplied icons/VFX.

Usage: python tools/import_wolf_assets.py character.zip supplied-art-folder
"""
import hashlib,io,json,shutil,sys,zipfile
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];out=root/'assets/akuma/wolf'
archive,source=Path(sys.argv[1]),Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
manifest={'character_id':'992eb999-b9fa-41d4-9bd4-ec32a142efbf','source':'Existing PixelLab Wolf export and owner-supplied art; no generation','zip_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'assets':[]}
for original,target in [('Inu Inu no Mi.png','fruit.png'),('Skill 1.png','skill-1.png'),('Skill 2.png','skill-2.png'),('firelight-take-2.png','firelight-take-2.png'),('firelight-take-2.json','firelight-take-2.json'),('firelight-take-4.png','firelight-take-4.png'),('firelight-take-4.json','firelight-take-4.json')]:
    shutil.copyfile(source/original,out/target)
    manifest['assets'].append({'asset':target,'sha256':hashlib.sha256((out/target).read_bytes()).hexdigest()})
clips={}
with zipfile.ZipFile(archive) as z:
    folders=sorted(set(n.split('/')[2] for n in z.namelist() if n.startswith('Idle/animations/')))
    attack=next(f for f in folders if f.startswith('Wind_back_'));charge=next(f for f in folders if f.startswith('Drop_down_'))
    for action,folder in [('idle',None),('attack',attack),('charge',charge)]:
        clips[action]={}
        for direction in ['south','north','east','west']:
            names=[f'Idle/rotations/{direction}.png'] if folder is None else sorted(n for n in z.namelist() if n.startswith(f'Idle/animations/{folder}/{direction}/') and n.endswith('.png'))
            frames=[Image.open(io.BytesIO(z.read(n))).convert('RGBA') for n in names];size=max(96,max(max(im.size) for im in frames))
            sheet=Image.new('RGBA',(size*len(frames),size));feet=[];hashes=[];sizes=[]
            for i,im in enumerate(frames):
                x,y=(size-im.width)//2,(size-im.height)//2;sheet.paste(im,(i*size+x,y))
                assert sheet.crop((i*size+x,y,i*size+x+im.width,y+im.height)).tobytes()==im.tobytes()
                feet.append(im.getbbox()[3]+y);hashes.append(hashlib.sha256(im.tobytes()).hexdigest());sizes.append(list(im.size))
            file=f'{action}-{direction}.png';sheet.save(out/file)
            clips[action][direction]={'image':f'assets/akuma/wolf/{file}','frames':len(frames),'size':size,'feet':feet,'fps':12,'source':names,'source_sizes':sizes,'rgba_sha256':hashes}
shutil.copyfile(out/'idle-south.png',out/'preview-south.png')
effects={}
for key,name in [('aura','firelight-take-2'),('bleed','firelight-take-4')]:
    data=json.loads((out/(name+'.json')).read_text())
    effects[key]={'image':f'assets/akuma/wolf/{name}.png','anchor':data['meta']['anchor'],'frames':[{**f['frame'],'duration':f['duration']} for f in data['frames']]}
    effects[key]['duration']=sum(f['duration'] for f in effects[key]['frames'])
for name,data in [('clips.json',clips),('manifest.json',manifest)]:
    (out/name).write_bytes((json.dumps(data,indent=2)+'\n').encode('utf8'))
rules=json.loads((out/'rules.json').read_text(encoding='utf8'))
(root/'wolf-data.js').write_text("'use strict';\nglobalThis.MareWolfData="+json.dumps({'rules':rules,'clips':clips,'effects':effects},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
print('Imported',sum(c['frames'] for dirs in clips.values() for c in dirs.values()),'original Wolf frames and seven supplied files')
