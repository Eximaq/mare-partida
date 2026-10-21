"""Prepare a native eight-frame masked forearm correction; no paid tool calls."""
import hashlib,json,shutil
from pathlib import Path
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent
SOURCE=HERE.parent/'paper-doll-expansion-20261021'

def main():
    receipt=json.loads((SOURCE/'walk-minimax-job.json').read_text())
    sheet=Image.new('RGBA',(256,128));mask=Image.new('RGB',sheet.size);draw=ImageDraw.Draw(mask)
    records=[]
    for i in range(8):
        name=f'body-walk-minimax-raw-{i+1:02}.png';original=SOURCE/name
        if hashlib.sha256(original.read_bytes()).hexdigest()!=receipt['sha256'][name]:raise ValueError('Source changed')
        target=HERE/f'body-source-{i+1:02}.png'
        if target.exists() and target.read_bytes()!=original.read_bytes():raise ValueError('Refusing to overwrite existing source')
        shutil.copy2(original,target);im=Image.open(target).convert('RGBA');assert im.size==(64,64)
        x,y=(i%4)*64,(i//4)*64;sheet.paste(im,(x,y))
        polygon=[(25,22),(28,24),(26,28),(25,32),(25,37),(24,39),(19,39),(18,35),(19,30),(21,25)]
        draw.polygon([(x+a,y+b) for a,b in polygon],fill='white')
        records.append({'file':target.name,'source':name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    sheet.save(HERE/'body-input.png');mask.save(HERE/'arm-mask.png')
    (HERE/'input-preparation.json').write_text(json.dumps({'frames':8,'frame_size':[64,64],'atlas':[256,128],'frame_order':'row-major; generated frames1-8, source reference excluded','files':records},indent=2)+'\n')
    print('Prepared native256x128 source and right-forearm mask. No generations submitted.')

def layers():
    if not json.loads((HERE/'body-audit.json').read_text())['passed']:raise ValueError('Body gate failed')
    source=Image.open(HERE/'body-corrected-raw.png').convert('RGBA')
    hair=Image.new('RGB',source.size);outfit=hair.copy();hd=ImageDraw.Draw(hair);od=ImageDraw.Draw(outfit)
    for i in range(8):
        x,y=(i%4)*64,(i//4)*64;im=Image.open(HERE/f'body-corrected-{i+1:02}.png').convert('RGBA');top=im.getbbox()[1]
        hd.rectangle((x+25,y+top-3,x+40,y+top+3),fill='white')
        for a,b in [(25,29),(36,40)]:hd.rectangle((x+a,y+top+3,x+b,y+top+9),fill='white')
        hd.rectangle((x+29,y+top+4,x+35,y+top+12),fill='black')
        od.rectangle((x+24,y+top+11,x+41,y+34),fill='white')
        od.rectangle((x+24,y+28,x+26,y+34),fill='black');od.rectangle((x+39,y+28,x+41,y+34),fill='black')
    hair.save(HERE/'hair-mask.png');outfit.save(HERE/'outfit-mask.png')
    reference=HERE.parent/'paper-doll-hair-outfit-20261021/look-reference-source.png';shutil.copy2(reference,HERE/'look-reference.png');look=Image.open(reference).convert('RGBA');assert look.size==(64,64)
    context=Image.new('RGBA',(320,128));context.paste(source,(0,0));context.paste(look,(256,32));context.save(HERE/'look-context.png')
    files=['body-corrected-raw.png','hair-mask.png','outfit-mask.png','look-context.png','look-reference.png']
    (HERE/'layer-inputs.json').write_text(json.dumps({'files':{name:hashlib.sha256((HERE/name).read_bytes()).hexdigest() for name in files},'frame_count':8,'columns':4,'rows':2,'cell':64,'source_box':[0,0,256,128],'style_reference_box':[256,32,64,64]},indent=2)+'\n')
    print('Prepared independent hair/outfit inputs, protected face and carrying hand.')

if __name__=='__main__':
    import sys
    layers() if '--layers' in sys.argv else main()
