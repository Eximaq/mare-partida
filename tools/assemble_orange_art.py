"""Pixel-preserving packaging of approved PixelLab output; never paints final art."""
import json, shutil
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'pixellab-pip-generations/orange-town-20261020'
DEST=ROOT/'assets/orange-town'
DIRECTIONS=['south','north','west','east']

def facts(im):
    a=im.getchannel('A')
    return {'size':list(im.size),'alpha':list(a.getextrema()),'bounds':a.getbbox()}

def pack():
    DEST.mkdir(exist_ok=True)
    atlas=Image.open(RUN/'buildings.png').convert('RGBA');assert atlas.size==(256,256)
    grid=atlas.copy();draw=ImageDraw.Draw(grid);draw.line((128,0,128,255),fill='#ff00ff');draw.line((0,128,255,128),fill='#ff00ff');grid.save(RUN/'buildings-inspection-grid.png')
    report={'buildings':facts(atlas),'cells':[],'monsters':{}}
    for i,name in enumerate(['house','tavern','tent','warehouse']):
        cell=atlas.crop((i%2*128,i//2*128,i%2*128+128,i//2*128+128));cell.save(RUN/(name+'.png'));report['cells'].append(facts(cell))
    street=Image.open(RUN/'street.png').convert('RGBA');assert street.size==(64,64);report['street']=facts(street)
    for f in ['buildings.png','street.png']:shutil.copy2(RUN/f,DEST/f)
    manifest={'ready':False,'street':{'url':'assets/orange-town/street.png'},'buildings':{'url':'assets/orange-town/buildings.png','cell_size':128},'monsters':{}}
    for directory in sorted(RUN.glob('*/')):
        if not (directory/'frames.json').exists():continue
        data=json.loads((directory/'frames.json').read_text(encoding='utf-8'))
        actions={};checks={}
        for action in ['idle','walk']:
            rows=[[Image.open(directory/f).convert('RGBA') for f in data[action][d]] for d in DIRECTIONS]
            w=max(im.width for row in rows for im in row);h=max(im.height for row in rows for im in row);count=len(rows[0])
            assert count==(9 if action=='walk' else 1) and all(len(row)==count for row in rows)
            if action=='walk':
                for direction,row in zip(DIRECTIONS,rows):
                    idle=Image.open(directory/data['idle'][direction][0]).convert('RGBA');pw=(row[0].width-idle.width)//2;ph=(row[0].height-idle.height)//2
                    assert row[0].crop((pw,ph,pw+idle.width,ph+idle.height)).tobytes()==idle.tobytes(),'Reference pose changed'
            # Padding only: pixels unchanged, centered on common feet pivot.
            sheet=Image.new('RGBA',(w*count,h*4));observations=[]
            for y,row in enumerate(rows):
                for x,im in enumerate(row):
                    px=x*w+(w-im.width)//2;py=y*h+h-im.height
                    sheet.paste(im,(px,py));assert sheet.crop((px,py,px+im.width,py+im.height)).tobytes()==im.tobytes();observations.append(facts(im))
            filename=directory.name+'-'+action+'.png';sheet.save(RUN/filename);shutil.copy2(RUN/filename,DEST/filename)
            # Reference frame preserves the original feet position, including transparent canvas padding.
            foot=max(row[0].getchannel('A').getbbox()[3]+h-row[0].height for row in rows)-1
            actions[action]={'url':'assets/orange-town/'+filename,'frames':count,'fps':8,'frame_width':w,'frame_height':h,'anchor':[w/2,foot]}
            checks[action]=observations
            inspection=sheet.resize((sheet.width*2,sheet.height*2),Image.Resampling.NEAREST)
            overlay=ImageDraw.Draw(inspection)
            for gx in range(w*2,inspection.width,w*2):overlay.line((gx,0,gx,inspection.height-1),fill='#ff00ff')
            for gy in range(h*2,inspection.height,h*2):overlay.line((0,gy,inspection.width-1,gy),fill='#ff00ff')
            inspection.save(directory/(action+'-inspection-grid.png'))
            if action=='walk':
                # One lossless palette per direction, index zero reserved for transparency.
                for direction,row in zip(DIRECTIONS,rows):
                    pixels=set(pixel[:3] for im in row for pixel in im.getdata() if pixel[3]);assert len(pixels)<256,'GIF would lose colors'
                    colors=sorted(pixels);palette=[0,0,0]+[n for color in colors for n in color];palette += [0]*(768-len(palette));lookup={color:i+1 for i,color in enumerate(colors)}
                    gif=[]
                    for im in row:
                        frame=Image.new('P',im.size);frame.putpalette(palette);frame.putdata([lookup[p[:3]] if p[3] else 0 for p in im.getdata()]);gif.append(frame)
                    path=directory/(direction+'-walk.gif');gif[0].save(path,save_all=True,append_images=gif[1:],duration=125,loop=0,transparency=0,disposal=2,optimize=False)
                    check=Image.open(path);assert check.n_frames==count and check.info['loop']==0
                    for i,im in enumerate(row):
                        check.seek(i);assert check.disposal_method==2;actual=check.convert('RGBA');assert actual.getchannel('A').tobytes()==im.getchannel('A').tobytes()
                        assert all(a[:3]==s[:3] for a,s in zip(actual.getdata(),im.getdata()) if s[3]),'GIF source pixel mismatch'
        south=Image.open(directory/data['idle']['south'][0]);south.save(DEST/(directory.name+'-portrait.png'))
        manifest['monsters'][directory.name]={'directions':DIRECTIONS,'render_scale':1.5,'animations':actions}
        report['monsters'][directory.name]=checks
    manifest['ready']=len(manifest['monsters'])==4
    (DEST/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    (RUN/'inspection.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'ready':manifest['ready'],'monsters':list(manifest['monsters']),'buildings':report['cells']}))

if __name__=='__main__':pack()
