"""Import the owner-supplied Zoan transition PNG/JSON byte-for-byte."""
import hashlib,json,shutil,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1]);out=root/'assets/akuma/zoan-transition';out.mkdir(parents=True,exist_ok=True);manifest=[]
for ext in ['.png','.json']:
 name='explosion-take-2'+ext;shutil.copyfile(source/name,out/name);manifest.append({'asset':name,'sha256':hashlib.sha256((out/name).read_bytes()).hexdigest()})
j=json.loads((out/'explosion-take-2.json').read_text(encoding='utf8'));frames=[{**f['frame'],'duration':f['duration']} for f in j['frames']];im=Image.open(out/'explosion-take-2.png').convert('RGBA')
for f in frames:
 if f['duration']<=0 or min(f['x'],f['y'])<0 or f['x']+f['w']>im.width or f['y']+f['h']>im.height:raise ValueError('Invalid frame')
f=frames[0];x,y,right,bottom=im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).getbbox();data={'image':'assets/akuma/zoan-transition/explosion-take-2.png','frames':frames,'duration':sum(f['duration'] for f in frames),'cover':{'x':x,'y':y,'w':right-x,'h':bottom-y},'padding':1.2}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8',newline='\n');(root/'zoan-transition-data.js').write_text("'use strict';\nglobalThis.MareZoanTransitionData="+json.dumps(data,separators=(',',':'))+';\n',encoding='utf8');print('Imported',len(frames),'frames;',data['duration'],'ms')
