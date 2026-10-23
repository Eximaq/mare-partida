"""Derive solid fort geometry from the approved projection; never modify its artwork."""
import json
from collections import deque
from pathlib import Path
from PIL import Image, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'assets/world-maps/conchas'
WALLS=['36a93476-fbe2-49db-83f6-2aa8d96f65a4','76a7682f-2c3d-433d-ba02-72e77e0f1911','462a05bd-2976-4f16-8d29-e94b3126f750']

def build():
    manifest=json.loads((ASSETS/'projection.json').read_text())
    terrain=set(manifest['terrainPalette'])
    colors=set()
    for asset in WALLS:
        with Image.open(ASSETS/'objects'/f'{asset}.png') as image:
            colors.update((r,g,b) for r,g,b,a in image.convert('RGBA').get_flattened_data() if a==255 and r*65536+g*256+b not in terrain)
    with Image.open(ASSETS/'projection.png') as image:
        image=image.convert('RGB')
        mask=Image.new('L',image.size)
        mask.putdata([255 if rgb in colors else 0 for rgb in image.get_flattened_data()])
    # Close the painted doors and mortar gaps, while preserving the wide southern entrance.
    step=4
    mask=mask.filter(ImageFilter.MaxFilter(3)).resize((1120,864),Image.Resampling.NEAREST)
    mask=mask.filter(ImageFilter.MaxFilter(17)).filter(ImageFilter.MinFilter(17))
    pixels=bytearray(mask.tobytes());width,height=mask.size;kept=bytearray(len(pixels))
    components=[]
    for start in range(len(pixels)):
        if not pixels[start]:continue
        queue=deque([start]);pixels[start]=0;component=[]
        while queue:
            i=queue.popleft();component.append(i);x,y=i%width,i//width
            for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0<=nx<width and 0<=ny<height:
                    n=ny*width+nx
                    if pixels[n]:pixels[n]=0;queue.append(n)
        xs=[i%width for i in component];ys=[i//width for i in component]
        bounds=(min(xs),min(ys),max(xs)+1,max(ys)+1)
        if len(component)<100 or max(bounds[2]-bounds[0],bounds[3]-bounds[1])<48:continue
        # The fort is north of the southern beach; boats are separate scenery.
        if bounds[1]*step>2500:continue
        for i in component:kept[i]=255
        components.append([v*step for v in bounds])
    rectangles=[];active={}
    for y in range(height):
        spans=[];x=0
        while x<width:
            if not kept[y*width+x]:x+=1;continue
            left=x
            while x<width and kept[y*width+x]:x+=1
            spans.append((left,x))
        current={}
        for span in spans:
            if span in active:
                rect=active[span];rect['h']+=step
            else:
                rect={'x':span[0]*step,'y':y*step,'w':(span[1]-span[0])*step,'h':step}
                rectangles.append(rect)
            current[span]=rect
        active=current
    output=ROOT/'conchas-structures.js'
    output.write_text("'use strict';\n((root)=>{const data="+json.dumps({'projectionSha256':manifest['sha256'],'step':step,'components':components,'colliders':rectangles},separators=(',',':'))+";root.MareConchasStructures=data;if(typeof module!=='undefined')module.exports=data;})(globalThis);\n",encoding='utf-8')
    debug=Image.frombytes('L',mask.size,bytes(kept)).resize((4480,3456),Image.Resampling.NEAREST)
    import tempfile
    debug.save(Path(tempfile.gettempdir())/'conchas-structure-mask.png')
    print(f'{len(rectangles)} solid rectangles; component bounds: {components}')

if __name__=='__main__':build()
