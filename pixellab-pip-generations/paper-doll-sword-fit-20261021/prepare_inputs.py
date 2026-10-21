"""Copy existing body frames; create only binary generation controls, never art."""
from pathlib import Path
import hashlib,json,shutil
from PIL import Image,ImageDraw

OUT=Path(__file__).resolve().parent
SOURCE=OUT.parent/'paper-doll-human-idle-south-20261021'
anchors=[(20,36),(18,35),(20,36),(19,35)]
records=[]
for index,(x,y) in enumerate(anchors,1):
    original=SOURCE/f'body-raw-{index:02}.png'
    target=OUT/f'body-source-{index:02}.png'
    shutil.copy2(original,target)
    image=Image.open(target).convert('RGBA')
    assert image.size==(64,64)
    mask=Image.new('RGB',image.size)
    # Down-left blade corridor and a small guard region, bounded inside the canvas.
    draw=ImageDraw.Draw(mask)
    draw.polygon([(x+2,y-3),(x+4,y),(x+1,y+4),
                  (max(1,x-17),y+14),(max(0,x-20),y+13),
                  (max(0,x-19),y+10),(x-4,y+1),(x-3,y-3)],fill='white')
    # Freeze every body pixel, not only the pixels outside a rectangular ROI.
    for py in range(64):
        for px in range(64):
            if image.getpixel((px,py))[3]:mask.putpixel((px,py),(0,0,0))
    mask_file=OUT/f'weapon-mask-{index:02}.png'
    mask.save(mask_file)
    white=sum(c==(255,255,255) for c in mask.get_flattened_data())
    assert white>0
    assert all(not(image.getpixel((px,py))[3] and mask.getpixel((px,py))==(255,255,255)) for py in range(64) for px in range(64))
    records.append({'source':target.name,'source_sha256':hashlib.sha256(original.read_bytes()).hexdigest(),
                    'mask':mask_file.name,'hand_contact_anchor':[x,y],
                    'native_size':[64,64],'white_pixels':white,
                    'all_body_pixels_frozen':True,'resize':False})
(OUT/'input-preparation.json').write_text(json.dumps({'status':'generation controls, not art','frames':records},indent=2)+'\n')
print(json.dumps(records))
