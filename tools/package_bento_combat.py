"""Assemble generated combat frames with fixed canvas pivots, never pose-height scaling."""
import io,json,sys,urllib.request,zipfile,statistics,re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'pixellab-pip-generations/bento-combat-production-20261018'
CHARACTER='1c0b995e-67da-4baf-b6e7-f210bd709ef4'
DIRS=['south','north','west','east']
CLIPS={'combat-idle':(4,5,True),'attack':(8,12,False),'corte-de-mare':(12,14,False),'hurt':(4,14,False),'death':(8,8,False)}

def fetch(url,path):
    if not path.exists():path.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=90).read())

def gif_exact(frames,path,delay):
    colors=sorted({pixel[:3] for im in frames for pixel in im.get_flattened_data() if pixel[3]})
    if len(colors)>255:return {'created':False,'reason':'More than 255 visible colors; original PNG sheet retained without quantization.'}
    palette=[0,0,0]+[v for c in colors for v in c];palette.extend([0]*(768-len(palette)))
    lookup={c:i+1 for i,c in enumerate(colors)};indexed=[]
    for im in frames:
        p=Image.new('P',im.size);p.putpalette(palette);p.putdata([lookup[c[:3]] if c[3] else 0 for c in im.get_flattened_data()]);p.info['transparency']=0;indexed.append(p)
    indexed[0].save(path,save_all=True,append_images=indexed[1:],duration=delay,loop=0,disposal=2,optimize=False)
    out=Image.open(path);assert out.n_frames==len(frames) and out.info['loop']==0
    for i,source in enumerate(frames):
        out.seek(i);assert out.disposal_method==2
        assert all(a[3]==b[3] and (not a[3] or a[:3]==b[:3]) for a,b in zip(out.convert('RGBA').get_flattened_data(),source.get_flattened_data()))
    return {'created':True,'exact_visible_pixels':True,'frames':len(frames),'disposal':2,'loop':0}

def download():
    fetch(f'https://api.pixellab.ai/mcp/characters/{CHARACTER}/download',RUN/'character.zip')
    with zipfile.ZipFile(RUN/'character.zip') as z:
        meta=json.loads(z.read('metadata.json'));(RUN/'zip-metadata.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
        state=meta['states'][0];frames=state['frames'];print(json.dumps({'frame_keys':list(frames),'animations':list(frames.get('animations',{}))}))
        mapping={}
        for action in CLIPS:
            mapping[action]={}
            for direction in DIRS:
                paths=frames['animations'][action][direction];mapping[action][direction]=[]
                for i,member in enumerate(paths):
                    name=f'{action}-{direction}-{i:02}.png';(RUN/name).write_bytes(z.read(member));mapping[action][direction].append(name)
        (RUN/'animation-files.json').write_text(json.dumps(mapping,indent=2),encoding='utf-8')

def partial(statusfile):
    data=json.loads((RUN/statusfile).read_text(encoding='utf-8'))
    text='\n'.join(c.get('text','') for c in data['content'])
    mapfile=RUN/'animation-files.json';mapping=json.loads(mapfile.read_text()) if mapfile.exists() else {}
    action=None
    for line in text.splitlines():
        heading=re.match(r'  ([\w-]+) — ',line)
        if heading:action=heading.group(1)
        item=re.match(r'    (south|north|west|east): (https://\S+) \(i=0\.\.(\d+)\)',line)
        if item and action in CLIPS:
            d,url,last=item.groups();paths=[]
            paths=[f'{action}-{d}-{i:02}.png' for i in range(int(last)+1)]
            with ThreadPoolExecutor(max_workers=5) as pool:
                list(pool.map(lambda item:fetch(url.replace('{i}',str(item[0])),RUN/item[1]),enumerate(paths)))
            mapping.setdefault(action,{})[d]=paths
            frames=[Image.open(RUN/name).convert('RGBA') for name in paths]
            width=max(im.width for im in frames);height=max(im.height for im in frames)
            strip=Image.new('RGBA',(width*len(frames),height))
            for i,im in enumerate(frames):strip.paste(im,(i*width,0))
            strip.save(RUN/f'{action}-{d}-sheet.png')
            grid=strip.resize((strip.width*3,height*3),Image.Resampling.NEAREST);draw=ImageDraw.Draw(grid)
            for x in range(width*3,grid.width,width*3):draw.line((x,0,x,grid.height),fill='#eeb953')
            grid.save(RUN/f'{action}-{d}-inspection-grid.png')
            gif_exact(frames,RUN/f'{action}-{d}-preview.gif',round(1000/CLIPS[action][1]))
    mapfile.write_text(json.dumps(mapping,indent=2),encoding='utf-8')
    print({action:list(rows) for action,rows in mapping.items()})

def package():
    mapping=json.loads((RUN/'animation-files.json').read_text(encoding='utf-8'))
    opened={action:{d:[Image.open(RUN/name).convert('RGBA') for name in rows[d]] for d in DIRS} for action,rows in mapping.items()}
    allframes=[im for rows in opened.values() for images in rows.values() for im in images]
    cw=max(im.width for im in allframes)+8;ch=max(im.height for im in allframes)+8
    anchor=[cw//2,ch//2+23] # Original reference footline: y=55 on a 64px canvas.
    destination=ROOT/'assets/classes/pirate-sword';destination.mkdir(parents=True,exist_ok=True)
    metadata={'display_name':'Bento Maré-Livre · Espadachim','class_id':'sword','faction':'pirate','frame_size':[cw,ch],
      'directions':DIRS,'anchor':anchor,'reference_height':46,'render_height':70,'render_scale':70/46,'animations':{},'source':'PixelLab MCP','production_approved':False}
    audit={}
    for action,rows in opened.items():
        expected,fps,loop=CLIPS[action];assert all(len(images)==expected for images in rows.values()),(action,{d:len(v) for d,v in rows.items()})
        sheet=Image.new('RGBA',(cw*expected,ch*4));placements=[]
        for row,d in enumerate(DIRS):
            for index,im in enumerate(rows[d]):
                bounds=im.getchannel('A').getbbox();assert bounds,(action,d,index)
                dx=(cw-im.width)//2;dy=(ch-im.height)//2
                sheet.paste(im,(index*cw+dx,row*ch+dy))
                assert sheet.crop((index*cw+dx,row*ch+dy,index*cw+dx+im.width,row*ch+dy+im.height)).tobytes()==im.tobytes()
                placements.append({'direction':d,'index':index,'offset':[dx,dy],'bounds':bounds,'size':im.size})
            originals=rows[d];strip=Image.new('RGBA',(cw*expected,ch))
            for i in range(expected):strip.paste(sheet.crop((i*cw,row*ch,(i+1)*cw,(row+1)*ch)),(i*cw,0))
            strip.save(RUN/f'{action}-{d}-sheet.png')
            grid=strip.resize((strip.width*2,strip.height*2),Image.Resampling.NEAREST);draw=ImageDraw.Draw(grid)
            for x in range(cw*2,grid.width,cw*2):draw.line((x,0,x,grid.height),fill='#eeb953')
            grid.save(RUN/f'{action}-{d}-inspection-grid.png')
            gif_frames=[sheet.crop((i*cw,row*ch,(i+1)*cw,(row+1)*ch)) for i in range(expected)]
            audit[f'{action}/{d}']={'gif':gif_exact(gif_frames,RUN/f'{action}-{d}-preview.gif',round(1000/fps)),
              'unique_frames':len({im.tobytes() for im in originals}),'bounds':[im.getchannel('A').getbbox() for im in originals]}
        sheet.save(destination/f'{action}.png');sheet.save(RUN/f'{action}-sheet.png')
        gameaction='skill' if action=='corte-de-mare' else action
        metadata['animations'][gameaction]={'url':f'assets/classes/pirate-sword/{action}.png','frames':expected,'fps':fps,'loop':loop,
          'impact_frame':5 if gameaction=='skill' else 3 if gameaction=='attack' else 0,
          'visible_height':{d:46 for d in DIRS}}
        audit[action]={'placements':placements,'exact_original_pixels':True,'fixed_canvas_pivot':True}
    # Static approved directional source, used explicitly when a generated clip fails facing review.
    guard=Image.new('RGBA',(cw,ch*4))
    for row,d in enumerate(DIRS):
        im=Image.open(RUN/f'rotation-{d}.png').convert('RGBA')
        guard.paste(im,((cw-im.width)//2,row*ch+(ch-im.height)//2))
    guard.save(destination/'guard.png')
    metadata['animations']['guard']={'url':'assets/classes/pirate-sword/guard.png','frames':1,'fps':1,'loop':True,'visible_height':{d:46 for d in DIRS}}
    (destination/'metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
    (RUN/'assembly-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
    (RUN/'proposed-config.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{len(allframes)} frames packaged unchanged, fixed anchor {anchor}, cell {cw}x{ch}; not yet production approved.')

if __name__=='__main__':
    if sys.argv[1]=='download':download()
    elif sys.argv[1]=='package':package()
    elif sys.argv[1]=='partial':partial(sys.argv[2])
