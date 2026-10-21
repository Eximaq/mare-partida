"""Native frame assembly and binary controls only. No artwork is drawn or repaired."""
from pathlib import Path
import hashlib,json,shutil
from PIL import Image,ImageDraw

HERE=Path(__file__).resolve().parent
PREVIOUS=HERE.parent/'paper-doll-sword-fit-20261021'
LOOK=HERE.parent/'paper-doll-human-idle-south-20261021/outfit-raw-01.png'
atlas=Image.new('RGBA',(128,128))
masks={slot:Image.new('RGB',(128,128)) for slot in ['weapon','hair','outfit']}
records=[]
for i in range(1,5):
    name=f'body-source-{i:02}.png';shutil.copy2(PREVIOUS/name,HERE/name)
    body=Image.open(HERE/name).convert('RGBA');assert body.size==(64,64)
    x,y=((i-1)%2)*64,((i-1)//2)*64
    atlas.paste(body,(x,y))
    weapon=Image.open(PREVIOUS/f'weapon-mask-{i:02}.png').convert('RGB')
    masks['weapon'].paste(weapon,(x,y))
    top=body.getbbox()[1]
    hair=Image.new('RGB',(64,64));draw=ImageDraw.Draw(hair)
    draw.rectangle((25,5,39,top+3),fill='white')
    draw.rectangle((25,top+2,28,top+7),fill='white')
    draw.rectangle((36,top+2,39,top+7),fill='white')
    draw.rectangle((29,top+3,35,top+10),fill='black')
    masks['hair'].paste(hair,(x,y))
    outfit=Image.new('RGB',(64,64));draw=ImageDraw.Draw(outfit)
    draw.polygon([(25,20),(28,20),(28,24),(35,24),(35,20),(38,20),
                  (42,27),(39,28),(39,34),(25,34),(25,28),(21,28),(23,22)],fill='white')
    # Preserve the original blue shorts even where the garment ROI reaches its rim.
    for py in range(64):
        for px in range(64):
            r,g,b,a=body.getpixel((px,py))
            if a and b>r+3 and b>g:outfit.putpixel((px,py),(0,0,0))
    masks['outfit'].paste(outfit,(x,y))
    records.append({'frame':i,'source':name,'sha256':hashlib.sha256((HERE/name).read_bytes()).hexdigest(),
                    'cell':[x,y,64,64],'head_top':top,'scale':False})
atlas.save(HERE/'body-atlas-input.png')
for slot,mask in masks.items():
    assert set(mask.get_flattened_data())=={(0,0,0),(255,255,255)}
    mask.save(HERE/f'{slot}-mask-input.png')
for name,source in [('weapon',PREVIOUS/'composite-01.png'),('look',LOOK)]:
    reference=HERE/f'{name}-reference-source.png';shutil.copy2(source,reference)
    image=Image.open(reference).convert('RGBA');assert image.size==(64,64)
    context=Image.new('RGBA',(192,128));context.paste(atlas,(0,0));context.paste(image,(128,32))
    context.save(HERE/f'{name}-context-input.png')
inspection=Image.new('RGBA',(128*4,128));inspection.paste(atlas,(0,0))
for i,(slot,mask) in enumerate(masks.items(),1):inspection.paste(mask.convert('RGBA'),(i*128,0))
inspection.save(HERE/'input-guides-inspection.png')
(HERE/'input-preparation.json').write_text(json.dumps({'status':'inputs only; no paid calls',
 'native_cell':[64,64],'native_atlas':[128,128],'order':[1,2,3,4],
 'mapping':'row-major: top-left, top-right, bottom-left, bottom-right',
 'contexts':{'size':[192,128],'source_bbox':[0,0,128,128],'reference_position':[128,32]},
 'masks':'generation controls, not character artwork','frames':records},indent=2)+'\n')
print(json.dumps({'inputs_ready':True,'frames':4,'atlas':[128,128],'no_resampling':True}))
