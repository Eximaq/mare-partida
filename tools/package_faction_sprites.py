"""Assemble unchanged downloaded PixelLab frames into transparent runtime sheets."""
import json
import shutil
import statistics
from pathlib import Path
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'pixellab-pip-generations/faccoes-base-20261018'
DIRECTIONS=['south','north','west','east']
GAME_IDS={'revolucionario':'revolutionary','pirata':'pirate','marinheiro':'marine','governo_mundial':'government'}

def package(key,name):
    source=RUN/key
    data=json.loads((source/'animation-files.json').read_text(encoding='utf-8'))
    overrides=json.loads((source/'playback-overrides.json').read_text(encoding='utf-8')) if (source/'playback-overrides.json').exists() else {}
    for action,rows in overrides.items():
        for direction,options in rows.items():data[action][direction]=options['files']
    destination=ROOT/'assets/factions'/key
    destination.mkdir(parents=True,exist_ok=True)
    opened={action:{direction:[Image.open(source/path).convert('RGBA') for path in data[action][direction]] for direction in DIRECTIONS} for action in ['idle','walk']}
    for action,rows in opened.items():
        counts={len(frames) for frames in rows.values()}
        assert min(counts)>1,(key,action,counts)
    # Uniform transparent padding and recorded translations preserve every original pixel.
    all_frames=[im for rows in opened.values() for frames in rows.values() for im in frames]
    assert all(im.getbbox() for im in all_frames)
    cellw=max(im.width for im in all_frames)+8
    cellh=max(im.height for im in all_frames)+8
    anchor=(cellw//2,cellh-4)
    meta={'internal_name':key,'display_name':name,'faction':GAME_IDS[key],'frame_size':[cellw,cellh],
          'directions':DIRECTIONS,'anchor':anchor,'reference_height':48,'render_height':70,'render_scale':1.5,
          'render_offset':[0,0],'animations':{},'source':'PixelLab MCP',
          'integration_notes':'Original frames preserved separately. Transparent padding only; feet aligned by recorded frame offsets. No repainting, interpolation, mirroring or duplicated playback frames. Attack animation is outside this stage; idle pose is retained during attacks.'}
    audit={}
    if overrides:meta['approved_playback_overrides']=overrides
    for action,rows in opened.items():
        count=max(len(frames) for frames in rows.values());sheet=Image.new('RGBA',(cellw*count,cellh*4))
        placements=[]
        for row,direction in enumerate(DIRECTIONS):
            for index,im in enumerate(rows[direction]):
                bounds=im.getbbox()
                # Keep the frame canvas center horizontally; align its lowest visible foot vertically.
                dx=anchor[0]-im.width//2;dy=anchor[1]-bounds[3]
                assert dx+bounds[0]>=0 and dy+bounds[1]>=0,(key,action,direction,index,im.size,bounds)
                assert dx+bounds[2]<=cellw and dy+bounds[3]<=cellh
                crop=im.crop(bounds);px=index*cellw+dx+bounds[0];py=row*cellh+dy+bounds[1]
                sheet.paste(crop,(px,py))
                assert sheet.crop((px,py,px+crop.width,py+crop.height)).tobytes()==crop.tobytes()
                placements.append({'direction':direction,'frame':index,'offset':[dx,dy],'source_size':list(im.size),'source_bounds':list(bounds)})
        sheet.save(destination/(action+'.png'))
        sheet.save(source/(action+'-sheet.png'))
        inspection=sheet.copy();draw=ImageDraw.Draw(inspection)
        for x in range(cellw,sheet.width,cellw):draw.line((x,0,x,sheet.height),fill='#ff00ff')
        for y in range(cellh,sheet.height,cellh):draw.line((0,y,sheet.width,y),fill='#ff00ff')
        inspection.save(source/(action+'-inspection-grid.png'))
        # Animated inspection uses the original frame order and clears transparent frames.
        preview_frames=[]
        for index in range(len(rows['south'])):
            preview=sheet.crop((index*cellw,0,(index+1)*cellw,cellh))
            preview_frames.append(preview)
        fps=4 if action=='idle' else 8
        direction_fps={direction:overrides.get(action,{}).get(direction,{}).get('fps',fps) for direction in rows}
        preview_frames[0].save(source/(action+'-preview.gif'),save_all=True,append_images=preview_frames[1:],duration=round(1000/direction_fps['south']),loop=0,disposal=2,optimize=False)
        visible_heights={direction:statistics.median(im.getbbox()[3]-im.getbbox()[1] for im in frames) for direction,frames in rows.items()}
        meta['animations'][action]={'url':f'assets/factions/{key}/{action}.png','frames':count,'direction_frames':{direction:len(frames) for direction,frames in rows.items()},'fps':fps,'direction_fps':direction_fps,'visible_height':visible_heights,'loop':True}
        audit[action]=placements
    shutil.copyfile(source/'selected-base.png',destination/'preview.png')
    (destination/'metadata.json').write_text(json.dumps(meta,indent=2,ensure_ascii=False),encoding='utf-8')
    (source/'assembly-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
    return GAME_IDS[key],meta

if __name__=='__main__':
    requests=json.loads((RUN/'requests.json').read_text(encoding='utf-8'))
    config=dict(package(item['key'],item['name']) for item in requests)
    (ROOT/'faction-assets.js').write_text('MareFactionSprites.register('+json.dumps(config,ensure_ascii=False,separators=(',',':'))+');\n',encoding='utf-8')
    print('Four native-frame faction sprite packages assembled and pixel equality verified.')
