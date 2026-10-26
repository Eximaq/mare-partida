from pathlib import Path
from urllib.request import urlretrieve
from PIL import Image
import argparse,json,hashlib
p=Path(__file__).resolve().parent
a=argparse.ArgumentParser();a.add_argument('name');a.add_argument('url');a.add_argument('count',type=int);v=a.parse_args()
raw=p/(v.name+'-gallery.png');urlretrieve(v.url,raw)
im=Image.open(raw).convert('RGBA');out=p/(v.name+'-raw');out.mkdir(exist_ok=True)
assert im.size==((256,192) if v.count==12 else (64,64))
for i in range(v.count):im.crop(((i%4)*64,(i//4)*64,(i%4+1)*64,(i//4+1)*64)).save(out/f'{i:02}.png') if v.count>1 else im.save(out/'00.png')
im.resize((im.width*3,im.height*3),Image.Resampling.NEAREST).save(p/(v.name+'-inspection.png'))
(p/(v.name+'-audit.json')).write_text(json.dumps({'source':'gallery recovery; original job result expired','sha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'frame_count':v.count,'columns':4 if v.count>1 else 1,'no_generation_repeated':True},indent=2))
print(v.name,'recovered',v.count)
