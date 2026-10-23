"""Import owner-provided item art without resampling or repainting."""
import argparse,hashlib,json,shutil
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('folder',type=Path)
SOURCE=parser.parse_args().folder
DEST=ROOT/'assets/ui/items-pixellab'
files={'Adaga de Cristal.png':'adaga-de-cristal.png','Punhal de Netuno.png':'punhal-de-netuno.png','Punhal Flamejante.png':'punhal-flamejante.png','Lamina das Trevas.png':'lamina-das-trevas-animation.png'}
records=[]
for original,target in files.items():
    source=SOURCE/original;destination=DEST/target
    shutil.copyfile(source,destination)
    with Image.open(destination) as image:
        expected=(256,256) if 'animation' in target else (64,64)
        assert image.size==expected,(original,image.size)
        assert image.mode=='RGBA',(original,image.mode)
        print(original,image.size,image.getextrema()[-1])
        if 'animation' in target:image.crop((0,0,64,64)).save(DEST/'lamina-das-trevas.png')
    records.append({'source':original,'asset':target,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()})
(DEST/'gatuno-weapons.json').write_text(json.dumps({'source':'Owner-provided PNG attachments','assets':records,'animation':{'columns':4,'rows':4,'frameSize':64,'order':'row-major','frames':16}},indent=2)+'\n',encoding='utf-8')
