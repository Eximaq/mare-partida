"""Download known completed outputs and prepare native inspection inputs; never generates art."""
import argparse,hashlib,json,urllib.request
from pathlib import Path
from PIL import Image,ImageDraw

HERE=Path(__file__).resolve().parent

def download(direction):
    path=HERE/f'idle-{direction}-job.json';receipt=json.loads(path.read_text())
    if receipt['status']!='completed':raise ValueError('Confirm job completion first; never resubmit generation on a download error.')
    images=[]
    for i in range(5):
        target=HERE/f'body-idle-{direction}-raw-{i:02}.png'
        if not target.exists():
            data=urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{receipt["job_id"]}/download?index={i}',timeout=60).read()
            target.write_bytes(data)
        image=Image.open(target).convert('RGBA')
        if image.size!=(64,64) or not image.getbbox():raise ValueError('Wrong native output dimensions or empty frame')
        images.append(image)
    if len({im.tobytes() for im in images[1:]})<2:raise ValueError('Static body rejected')
    atlas=Image.new('RGBA',(128,128))
    for i,im in enumerate(images[1:]):atlas.paste(im,((i%2)*64,(i//2)*64))
    atlas.save(HERE/f'body-{direction}-atlas.png')
    atlas.resize((768,768),Image.Resampling.NEAREST).save(HERE/f'body-{direction}-inspection.png')
    receipt['outputs']=[f'body-idle-{direction}-raw-{i:02}.png' for i in range(5)]
    receipt['playback']={'input_echo':0,'generated_frames':[1,2,3,4],'fps':4,'no_reorder':True}
    receipt['sha256']={name:hashlib.sha256((HERE/name).read_bytes()).hexdigest() for name in receipt['outputs']}
    path.write_text(json.dumps(receipt,indent=2)+'\n')
    print(direction,[im.getbbox() for im in images])

def masks(direction):
    frames=[Image.open(HERE/f'body-idle-{direction}-raw-{i:02}.png').convert('RGBA') for i in range(1,5)]
    hair=Image.new('RGB',(128,128));outfit=hair.copy()
    hd=ImageDraw.Draw(hair);od=ImageDraw.Draw(outfit)
    for i,im in enumerate(frames):
        x,y=(i%2)*64,(i//2)*64;left,top,right,bottom=im.getbbox()
        # Technical masks only. Review the generated contours; these rectangles are not artwork.
        if direction=='north':hd.rectangle((x+24,y+top-2,x+40,y+top+12),fill='white')
        else:
            hd.rectangle((x+23,y+top-2,x+40,y+top+4),fill='white')
            a,b=(33,40) if direction=='west' else (23,29)
            hd.rectangle((x+a,y+top+4,x+b,y+top+12),fill='white')
        od.rectangle((x+left,y+top+10,x+right-1,y+34),fill='white')
    hair.save(HERE/f'hair-{direction}-mask.png');outfit.save(HERE/f'outfit-{direction}-mask.png')
    source=Image.open(HERE/f'body-{direction}-atlas.png').convert('RGBA')
    reference=Image.open(HERE.parent/'paper-doll-hair-outfit-20261021/look-reference-source.png').convert('RGBA')
    assert reference.size==(64,64)
    context=Image.new('RGBA',(192,128));context.paste(source,(0,0));context.paste(reference,(128,32));context.save(HERE/f'context-{direction}.png')
    print('Prepared masks and context:',direction)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['download','masks']);parser.add_argument('direction',choices=['north','west','east'])
    args=parser.parse_args();globals()[args.action](args.direction)
