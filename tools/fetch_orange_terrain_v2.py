"""Download already-authorized tilesets; no paid requests or image changes."""
import json,re,urllib.request,sys
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];RUN=ROOT/'pixellab-pip-generations/orange-terrain-v2-20261020';RUN.mkdir(exist_ok=True)
sources={'water-sand':'d83d622a-7fe1-48e9-8ebf-130b8cee9a57','sand-grass':'640a8d3f-0916-462c-83f8-f0905bfb78c6'}
for call in json.loads((RUN/'calls.json').read_text(encoding='utf-8')):
    if call['tool']=='create_topdown_tileset':
        text='\n'.join(c['text'] for c in call['response']['content'] if c['type']=='text');sources[call['name']]=re.search(r'^id: (\S+)',text).group(1)
for name,identifier in sources.items():
    if len(sys.argv)>1 and name not in sys.argv[1:]:continue
    base='https://api.pixellab.ai/mcp/tilesets/'+identifier
    for suffix,url in [('.png',base+'/image?inline=true'),('-metadata.json',base+'/metadata')]:
        with urllib.request.urlopen(url,timeout=60) as r:(RUN/(name+suffix)).write_bytes(r.read())
    im=Image.open(RUN/(name+'.png')).convert('RGBA');meta=json.loads((RUN/(name+'-metadata.json')).read_text());tiles=meta['tileset_data']['tiles'];assert len(tiles)==16 and im.size==(128,128)
    grid=im.resize((512,512),Image.Resampling.NEAREST);draw=ImageDraw.Draw(grid)
    for n in [128,256,384]:draw.line((n,0,n,511),fill='#ff00ff');draw.line((0,n,511,n),fill='#ff00ff')
    grid.save(RUN/(name+'-inspection.png'))
    if name in ['sand-grass','grass-stone']:
        for material,mask in ([('sand',0),('grass',15)] if name=='sand-grass' else [('stone',15)]):
            t=next(t for t in tiles if int(t['corners']['NW']=='upper')*8+int(t['corners']['NE']=='upper')*4+int(t['corners']['SW']=='upper')*2+int(t['corners']['SE']=='upper')==mask);b=t['bounding_box'];im.crop((b['x'],b['y'],b['x']+b['width'],b['y']+b['height'])).save(RUN/(material+'-reference.png'))
    print(name,'downloaded',identifier,flush=True)
