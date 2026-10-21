"""Review-only masking/padding of PixelLab pixels; no painting or motion repair."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent

def rgba_pixels(image):
    return [(r,g,b,a) if a else (0,0,0,0) for r,g,b,a in image.get_flattened_data()]

def gif(name, frames):
    colors = sorted({(r,g,b) for image in frames for r,g,b,a in image.get_flattened_data() if a})
    if len(colors) > 255:
        raise ValueError('Exact GIF palette would exceed 255 visible colors')
    lookup = {rgb:i+1 for i,rgb in enumerate(colors)}
    palette = [0,0,0] + [v for color in colors for v in color]
    palette += [0] * (768-len(palette))
    output = []
    for image in frames:
        frame = Image.new('P', image.size)
        frame.putpalette(palette)
        frame.putdata([lookup[(r,g,b)] if a else 0 for r,g,b,a in image.get_flattened_data()])
        output.append(frame)
    path = ROOT/name
    output[0].save(path,save_all=True,append_images=output[1:],duration=250,
                   loop=0,disposal=2,transparency=0,optimize=False)
    decoded = Image.open(path)
    assert decoded.n_frames == 4 and decoded.info['loop'] == 0
    for i, original in enumerate(frames):
        decoded.seek(i)
        assert decoded.disposal_method == 2 and decoded.info['duration'] == 250
        assert rgba_pixels(decoded.convert('RGBA')) == rgba_pixels(original)

def pad(image):
    result = Image.new('RGBA',(84,84))
    result.paste(image,(10,13))
    return result

body = [Image.open(ROOT/f'body-raw-{i:02}.png').convert('RGBA') for i in range(5)]
looks = [Image.open(ROOT/f'outfit-raw-{i:02}.png').convert('RGBA') for i in range(5)]
gif('body-idle-preview.gif',body[1:])
gif('outfit-idle-preview.gif',looks[1:])
layers = {slot:[] for slot in ['body','hair','outfit','weapon']}
drafts = []
audit = []
for index in range(1,5):
    base,look = body[index],looks[index]
    masks = {}
    # Explicit inspection regions, not inferred final semantic segmentation.
    head_top = base.getbbox()[1]
    hair = Image.new('L',(64,64))
    ImageDraw.Draw(hair).rectangle((25,6,39,head_top+3),fill=255)
    masks['hair'] = hair
    outfit = Image.new('L',(64,64))
    ImageDraw.Draw(outfit).polygon([(25,20),(28,20),(28,24),(35,24),(35,20),
        (38,20),(42,27),(39,28),(39,35),(25,35),(25,28),(21,28),(23,22)],fill=255)
    masks['outfit'] = outfit
    weapon = Image.new('L',(64,64))
    ImageDraw.Draw(weapon).polygon([(19,34),(22,34),(25,42),(17,45),(4,51),
                                   (1,51),(1,47),(18,38)],fill=255)
    # Do not copy the generator's replacement hand as part of a sword layer.
    ImageDraw.Draw(weapon).rectangle((22,35,25,40),fill=0)
    masks['weapon'] = weapon
    result = base.copy()
    layers['body'].append(pad(base))
    record = {'source_index':index,'head_top':head_top,'copied':{},'raw_outside_masks':0}
    for slot,mask in masks.items():
        mask.save(ROOT/f'{slot}-mask-{index:02}.png')
        layer = Image.new('RGBA',(64,64))
        copied = 0
        for y in range(64):
            for x in range(64):
                color = look.getpixel((x,y))
                if mask.getpixel((x,y)) and color[3] and color != base.getpixel((x,y)):
                    layer.putpixel((x,y),color)
                    copied += 1
        record['copied'][slot] = copied
        result = Image.alpha_composite(result,layer)
        layers[slot].append(pad(layer))
    union = Image.new('L',(64,64))
    for y in range(64):
        for x in range(64):
            permitted = any(mask.getpixel((x,y)) for mask in masks.values())
            union.putpixel((x,y),255 if permitted else 0)
            if not permitted:
                assert result.getpixel((x,y)) == base.getpixel((x,y))
                a,b = base.getpixel((x,y)),look.getpixel((x,y))
                if (a[3] or b[3]) and a != b: record['raw_outside_masks'] += 1
    padded = pad(result)
    padded.save(ROOT/f'draft-composite-{index:02}.png')
    drafts.append(padded)
    audit.append(record)
for slot,frames in layers.items():
    sheet = Image.new('RGBA',(336,84))
    for index,frame in enumerate(frames):sheet.paste(frame,(index*84,0))
    sheet.save(ROOT/f'{slot}-idle-draft.png')
sheet = Image.new('RGBA',(336,252))
for index in range(4):
    for row,frame in enumerate([pad(body[index+1]),pad(looks[index+1]),drafts[index]]):
        sheet.paste(frame,(index*84,row*84))
sheet.save(ROOT/'review-sheet.png')
sheet.resize((1344,1008),Image.Resampling.NEAREST).save(ROOT/'review-inspection-4x.png')
gif('draft-idle-preview.gif',drafts)
(ROOT/'extraction-audit.json').write_text(json.dumps({
    'status':'inspection drafts; not approved; contact alignment requires review',
    'source_frames':[1,2,3,4],'reference_frame':0,'resize':False,
    'padding':[10,13],'pivot':[42,65],'outside_mask_changes_in_drafts':0,
    'frames':audit},indent=2),encoding='utf-8')
print(json.dumps(audit))
