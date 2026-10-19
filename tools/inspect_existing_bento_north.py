"""Read-only reuse check of already-existing PixelLab clips; never generates."""
import json,urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];RUN=ROOT/'pixellab-pip-generations/bento-direction-fixes-20261018'
items=json.loads((RUN/'existing-north-versions.json').read_text())
for item in items:
    folder=RUN/'existing-north'/item['id'];folder.mkdir(parents=True,exist_ok=True)
    def fetch(i):
        path=folder/f'{i:02}.png'
        if not path.exists():path.write_bytes(urllib.request.urlopen(urllib.request.Request(item['url'].replace('{i}',str(i)),headers={'User-Agent':'Mozilla/5.0'}),timeout=60).read())
        return Image.open(path).convert('RGBA')
    with ThreadPoolExecutor(max_workers=5) as pool:frames=list(pool.map(fetch,range(item['count'])))
    w,h=frames[0].size;sheet=Image.new('RGBA',(w*len(frames),h))
    for i,im in enumerate(frames):sheet.paste(im,(i*w,0))
    sheet.save(folder/'sheet.png');inspect=sheet.resize((sheet.width*2,h*2),Image.Resampling.NEAREST);draw=ImageDraw.Draw(inspect)
    for x in range(w*2,inspect.width,w*2):draw.line((x,0,x,inspect.height),fill='#eeb953')
    inspect.save(folder/'inspection-grid.png')
    print(item['group']+' '+item['id']+' '+str(len(frames))+' frames',flush=True)
