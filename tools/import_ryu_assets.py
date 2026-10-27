"""Import original Ryu PixelLab frames and owner's three icons, without resampling."""
import hashlib,io,json,shutil,sys,zipfile
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def main(archive,source):
 out=ROOT/'assets/akuma/ryu';out.mkdir(parents=True,exist_ok=True)
 manifest={'character_id':'dc1eb4bb-f3bb-4f6f-861b-f635c8b02f64','source':'Existing PixelLab character and owner supplied icons','zip_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'assets':[]}
 for original,target in [('Ryu Ryu no Mi.png','fruit.png'),('Skill 1.png','skill-1.png'),('Skill 2.png','skill-2.png')]:
  shutil.copyfile(source/original,out/target);manifest['assets'].append({'file':target,'sha256':hashlib.sha256((out/target).read_bytes()).hexdigest()})
 clips={}
 with zipfile.ZipFile(archive) as z:
  folders=sorted({n.split('/')[2] for n in z.namelist() if n.startswith('Idle/animations/')})
  mapping={'idle':None,'walk':next(f for f in folders if f.startswith('The_dinosaur_initiates')),'attack':next(f for f in folders if f.startswith('The_dinosaur_tilts')),'bite':next(f for f in folders if f.startswith('Infuse_the_teeth')),'tail':next(f for f in folders if f.startswith('Wind_up'))}
  for action,folder in mapping.items():
   clips[action]={}
   for direction in ['south','north','east','west']:
    names=[f'Idle/rotations/{direction}.png'] if folder is None else sorted(n for n in z.namelist() if n.startswith(f'Idle/animations/{folder}/{direction}/') and n.endswith('.png'))
    frames=[Image.open(io.BytesIO(z.read(n))).convert('RGBA') for n in names];size=max(max(im.size) for im in frames);sheet=Image.new('RGBA',(size*len(frames),size));feet=[];hashes=[];sizes=[]
    for i,im in enumerate(frames):
     x,y=(size-im.width)//2,(size-im.height)//2;sheet.paste(im,(i*size+x,y));assert sheet.crop((i*size+x,y,i*size+x+im.width,y+im.height)).tobytes()==im.tobytes();feet.append(im.getbbox()[3]+y);hashes.append(hashlib.sha256(im.tobytes()).hexdigest());sizes.append(list(im.size))
    file=f'{action}-{direction}.png';sheet.save(out/file)
    clips[action][direction]={'image':f'assets/akuma/ryu/{file}','size':size,'frames':len(frames),'fps':12,'feet':feet,'impact_frame':12 if action in ['bite','tail'] else 10 if action=='attack' else 0,'source':names,'source_sizes':sizes,'rgba_sha256':hashes}
 shutil.copyfile(out/'idle-south.png',out/'preview-south.png')
 for name,data in [('clips.json',clips),('manifest.json',manifest)]: (out/name).write_text(json.dumps(data,indent=2)+'\n',encoding='utf8')
 rules=json.loads((out/'rules.json').read_text(encoding='utf8'))
 (ROOT/'ryu-data.js').write_text("'use strict';\nglobalThis.MareRyuData="+json.dumps({'rules':rules,'clips':clips},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
 print('Imported',sum(c['frames'] for ds in clips.values() for c in ds.values()),'original frames, 3 owner icons.')
if __name__=='__main__':main(Path(sys.argv[1]),Path(sys.argv[2]))
