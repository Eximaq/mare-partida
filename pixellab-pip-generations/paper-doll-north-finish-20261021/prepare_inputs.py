"""Prepare four-pose native correction batches. No generation, resize or repaint."""
import hashlib,json,shutil
from pathlib import Path
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent
OLD=HERE.parent/'paper-doll-walk-north-20261021'
def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def write(name,data):(HERE/name).write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
def normalized(im):return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
def guide(im,name):
    bg=Image.new('RGBA',im.size,(25,56,58,255));c=Image.alpha_composite(bg,im).convert('RGB').resize((768,768),Image.Resampling.NEAREST);d=ImageDraw.Draw(c);d.line((384,0,384,768),fill='#e0b767');d.line((0,384,768,384),fill='#e0b767');c.save(HERE/name)
def main():
    receipt=json.loads((OLD/'body-job.json').read_text());records={}
    for i in range(1,9):
        name=f'body-raw-{i:02}.png'
        if digest(OLD/name)!=receipt['sha256'][name]:raise ValueError('Original body changed')
        shutil.copy2(OLD/name,HERE/name);records[name]=digest(HERE/name)
    for i in range(1,5):
        name=f'hair-preserved-{i:02}.png';shutil.copy2(OLD/'hair'/f'frame-{i:02}.png',HERE/name);records[name]=digest(HERE/name)
    # Rear-view look supplied by the already preserved native reference.
    shutil.copy2(OLD/'look-reference.png',HERE/'outfit-reference.png')
    first=Image.open(HERE/'body-raw-01.png').convert('RGBA');hair=Image.new('RGBA',(64,64));hair.paste(Image.open(HERE/'hair-preserved-01.png').convert('RGBA'),(16,4));Image.alpha_composite(first,hair).save(HERE/'hair-reference.png')
    for batch,indices in [('hair-repair',[5,6,7,8]),('outfit-first',[1,2,3,4]),('outfit-last',[5,6,7,8])]:
        atlas=Image.new('RGBA',(128,128));mask=Image.new('RGB',(128,128))
        for cell,index in enumerate(indices):
            im=Image.open(HERE/f'body-raw-{index:02}.png').convert('RGBA');top=im.getbbox()[1];x,y=(cell%2)*64,(cell//2)*64;atlas.paste(im,(x,y));native=Image.new('RGB',(64,64));d=ImageDraw.Draw(native)
            if batch=='hair-repair':d.rectangle((25,top-3,39,top+10),fill='white')
            else:
                d.rectangle((23,top+11,42,34),fill='white');d.rectangle((23,28,25,34),fill='black');d.rectangle((40,28,42,34),fill='black')
            mask.paste(native,(x,y))
        atlas.save(HERE/(batch+'-input.png'));mask.save(HERE/(batch+'-mask.png'))
        ref=Image.open(HERE/('hair-reference.png' if batch=='hair-repair' else 'outfit-reference.png')).convert('RGBA');context=Image.new('RGBA',(192,128));context.paste(atlas,(0,0));context.paste(ref,(128,32));context.save(HERE/(batch+'-context.png'))
        guide(atlas,batch+'-inspection-grid.png')
    records.update({p.name:digest(p) for p in HERE.glob('*.png') if 'inspection' not in p.name})
    write('inputs.json',{'native_frame':[64,64],'batch_atlas':[128,128],'cell_order':{'hair-repair':[5,6,7,8],'outfit-first':[1,2,3,4],'outfit-last':[5,6,7,8]},'fixed_padding':[10,13],'pivot':[42,65],'preserved_hair_origin':[16,4],'files':records})
    print('Native inputs prepared; original eight body PNGs and first four hair files copied byte-for-byte.')
if __name__=='__main__':main()
