"""Directional review packaging. All sprite pixels are copied from PixelLab or Bento."""
from pathlib import Path
import json,sys,hashlib,shutil
from PIL import Image,ImageDraw

HERE=Path(__file__).resolve().parent
SOUTH=HERE.parent/'paper-doll-bento-skeleton-20261021'
sys.path.insert(0,str(SOUTH))
from extract_visible_pieces import select

DIRECTIONS=['south','north','west','east']
SLOTS=['body','pants','boots','outfit','hair','weapon']
WEST_GRIP=[(21,35),(19,25),(29,25),(29,26),(29,25),(21,29),(26,42),(29,42)]
WEST_WEAPON_OFFSETS=[(0,0),(0,2),(0,0),(0,0),(0,0),(1,4),(4,6),(-1,0)]

def read(name):return json.loads((HERE/name).read_text(encoding='utf-8'))
def write(name,data):(HERE/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def normalized(im):return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
def padded(im,offset):
    result=Image.new('RGBA',(84,84));result.paste(im,offset);return result

def save_gif(frames,path):
    colors=sorted({c[:3] for im in frames for c in im.get_flattened_data() if c[3]})
    if len(colors)>255:raise ValueError('Exact GIF palette exceeds255 colours')
    lookup={c:i+1 for i,c in enumerate(colors)};palette=[0,0,0]+[v for c in colors for v in c];palette+=[0]*(768-len(palette));indexed=[]
    for frame in frames:
        out=Image.new('P',(84,84));out.putpalette(palette);out.putdata([lookup[c[:3]] if c[3] else 0 for c in frame.get_flattened_data()]);indexed.append(out)
    durations=[80,90,80,80,90,80,80,90]
    indexed[0].save(path,save_all=True,append_images=indexed[1:],duration=durations,loop=0,disposal=2,transparency=0,optimize=False)
    with Image.open(path) as gif:
        assert gif.n_frames==8 and gif.info['loop']==0
        for i,frame in enumerate(frames):
            gif.seek(i);assert normalized(gif.convert('RGBA'))==normalized(frame)
            assert gif.info['duration']==durations[i] and gif.disposal_method==2

def west_pieces(i):
    source=Image.open(HERE/'west'/f'bento-{i:02}.png').convert('RGBA')
    hair=select(source,lambda r,g,b:max(r,g,b)<=55 or (g>r*1.4 and b>r*1.4),[(25,7),(40,7),(40,14),(38,20),(34,20),(34,15),(25,15)])
    tail=select(source,lambda r,g,b:g>r*1.4 and b>r*1.4,[(35,12),(53,12),(53,25),(35,25)])
    hair=Image.alpha_composite(hair,tail)
    outfit=select(source,lambda r,g,b:(r>g*1.5 and b>g*1.1 and r<170) or (r>175 and g>r*.75 and r*.62<b<r*.85),[(25,22),(43,22),(44,40),(24,40)])
    pants=select(source,lambda r,g,b:b>r*1.5 and b>g*1.3,[(19,35),(47,35),(47,53),(19,53)])
    boots=select(source,lambda r,g,b:r>=g>=b and r>40,[(17,50),(50,50),(50,59),(17,59)])
    x,y=WEST_GRIP[i]
    weapon=select(source,lambda r,g,b:max(r,g,b)-min(r,g,b)<25 and max(r,g,b)>75,[(0,0),(63,0),(63,63),(0,63)])
    hilt=select(source,lambda r,g,b:r>70 and r*.65<=g<=r*.95 and b<g*.8 and g<150,[(x-3,y-3),(x+3,y-3),(x+3,y+3),(x-3,y+3)])
    weapon=Image.alpha_composite(weapon,hilt)
    return {'hair':hair,'outfit':outfit,'pants':pants,'boots':boots,'weapon':weapon}

def main():
    reviews=read('reviews.json');source=Image.open(HERE/'reference-bento-attack.png').convert('RGBA')
    south_pack=json.loads((SOUTH/'review-pack.json').read_text());sheets={};source_records=[];body_records={};grips=[]
    for d in DIRECTIONS:
        if d=='south':
            sheets[d]={p['slot']:Image.open(SOUTH/p['animations']['attack-sword']['url']).convert('RGBA') for p in south_pack['pieces']}
            shutil.copy2(SOUTH/'candidate-south-sheet.png',HERE/'body-candidate-south.png')
            shutil.copy2(SOUTH/'modular-south.gif',HERE/'modular-south.gif')
            continue
        controls=read(d+'/controls.json');offset=controls['padding'];body_offset=[10,9] if d=='west' else offset
        candidate=Image.new('RGBA',(672,84));body_records[d]=[]
        for i in range(8):
            path=HERE/d/f'body-{i:02}.png';im=Image.open(path).convert('RGBA')
            if im.size!=(64,64) or not im.getbbox():raise ValueError('Invalid native body '+d)
            if set(im.getchannel('A').get_flattened_data())-{0,255}:raise ValueError('Unexpected partial alpha '+d)
            if 0 not in set(im.getchannel('A').get_flattened_data()):raise ValueError('Body lost transparency '+d)
            frame=padded(im,body_offset);candidate.paste(frame,(i*84,0))
            original=source.crop((i*84,DIRECTIONS.index(d)*84,(i+1)*84,(DIRECTIONS.index(d)+1)*84))
            native=Image.open(HERE/d/f'bento-{i:02}.png');assert normalized(padded(native,offset))==normalized(original)
            body_records[d].append({'frame':i,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'native_bounds':im.getbbox(),'body_padding':body_offset,'source_padding':offset,'ground_line':body_offset[1]+im.getbbox()[3]})
        candidate.save(HERE/f'body-candidate-{d}.png');save_gif([candidate.crop((i*84,0,(i+1)*84,84)) for i in range(8)],HERE/f'body-{d}.gif')
        if d!='west':continue
        sheets[d]={slot:Image.new('RGBA',(672,84)) for slot in SLOTS};sheets[d]['body']=candidate
        composites=[]
        for i in range(8):
            selected=west_pieces(i);original=source.crop((i*84,168,(i+1)*84,252));body=Image.open(HERE/d/f'body-{i:02}.png').convert('RGBA')
            x,y=WEST_GRIP[i];dx,dy=WEST_WEAPON_OFFSETS[i]
            moved=Image.new('RGBA',(64,64));moved.paste(selected['weapon'],(dx,dy))
            assert sum(c[3]>0 for c in moved.get_flattened_data())==sum(c[3]>0 for c in selected['weapon'].get_flattened_data()),'Weapon offset crops source pixels'
            skin=[(a,c) for a in range(x-4,x+5) for c in range(y-4,y+5) if (lambda q:q[3]>0 and q[0]>q[1]>q[2] and q[0]>90)(body.getpixel((a,c)))]
            handle=[(a,c) for a in range(x-5,x+6) for c in range(y-5,y+6) if moved.getpixel((a,c))[3]]
            distance=min((max(abs(a-e),abs(c-f)) for a,c in skin for e,f in handle),default=99) if i not in [2,3,4] else None
            grips.append({'frame':i,'distance':distance,'grip_occluded':i in [2,3,4],'reference_hand':[x,y],'weapon_offset':[dx,dy]})
            layers=[(0,candidate.crop((i*84,0,(i+1)*84,84)))]
            for slot in SLOTS[1:]:
                image=padded(selected[slot],offset)
                assert all(not c[3] or c==s for c,s in zip(image.get_flattened_data(),original.get_flattened_data())),(d,slot,i)
                sheets[d][slot].paste(image,(i*84,0));z=SLOTS.index(slot)*10
                if slot=='weapon' and i in [2,3,4]:z=-10
                rendered=image
                if slot=='weapon':rendered=Image.new('RGBA',(84,84));rendered.paste(image,(dx,dy-1))
                layers.append((z,rendered));source_records.append({'direction':d,'slot':slot,'frame':i,'visible_pixels':sum(c[3]>0 for c in image.get_flattened_data())})
            frame=Image.new('RGBA',(84,84))
            for _,im in sorted(layers,key=lambda x:x[0]):frame=Image.alpha_composite(frame,im)
            composites.append(frame)
        diagnostic=Image.new('RGBA',(672,84))
        for i,im in enumerate(composites):diagnostic.paste(im,(i*84,0))
        diagnostic.save(HERE/'west-composite-inspection.png')
        for slot,sheet in sheets[d].items():sheet.save(HERE/f'west-{slot}-sheet.png')
        if reviews[d]['modular_fit_gate_passed']:
            if any(g['distance'] is not None and g['distance']>2 for g in grips):raise ValueError('West grip requires inspection')
            save_gif(composites,HERE/'modular-west.gif')
    ready=[d for d in DIRECTIONS if reviews[d]['modular_fit_gate_passed']]
    pack={'status':'Directional review only; unsupported/rejected clips use complete original fallback','reviewOnly':True,'productionEnabled':False,'full_character_artwork_approved':False,'coverage':{'attack-sword':ready},'bodyCoverage':[d for d in DIRECTIONS if reviews[d]['body_motion_gate_passed']],'rig':{**south_pack['rig'],'animations':{'attack-sword':{'frames':8,'fps':12,'loop':False,'directions':DIRECTIONS}}},'pieces':[],'appearance':{'rigId':'human-v1','pieces':{}},'reviews':reviews}
    for z,slot in enumerate(SLOTS):
        result=Image.new('RGBA',(672,84*len(ready)))
        for row,d in enumerate(ready):result.paste(sheets[d][slot],(0,row*84))
        url=f'{slot}-attack.png';result.save(HERE/url);identity='bento-directional-'+slot
        clip={'kind':'sheet','url':url,'frames':8,'fps':12,'loop':False,'frameWidth':84,'frameHeight':84,'directions':ready}
        if slot=='weapon':clip['poseOverrides']={'west':[{'offsetX':dx,'offsetY':dy-1,**({'zIndex':-10} if i in [2,3,4] else {})} for i,(dx,dy) in enumerate(WEST_WEAPON_OFFSETS)]} if 'west' in ready else {}
        pack['pieces'].append({'id':identity,'rigId':'human-v1','slot':slot,'available':True,'approved':False,'zIndex':z*10,'animations':{'attack-sword':clip}});pack['appearance']['pieces'][slot]=identity
    write('review-pack.json',pack)
    write('assembly-audit.json',{'coverage':ready,'body_records':body_records,'source_rgba_preserved':True,'source_crop_reversible':True,'source_piece_records':source_records,'west_grip_proxy':grips,'gif_exact_rgba':True,'production_enabled':False,'note':'Geometric checks do not approve artwork or reconstruct hidden pieces.'})
    calls=[read(d+'/manifest.json') for d in ['north','west','east']]
    write('manifest.json',{'status':'completed; directional review with explicit fallback','calls':calls,'charged_generations':sum(c['reported_usage']['generations'] for c in calls),'generation_ceiling':12,'seed':'omitted in all calls','pending_jobs':[],'source_south':'../paper-doll-bento-skeleton-20261021/','local_assembly':'Source-visible garment pixels, fixed transparent padding and exact-palette GIFs only. No locally painted anatomy, pose duplication, mirroring or hidden-pixel reconstruction.','production_enabled':False})
    print('Ready modular directions:',ready,'; native body studies:',pack['bodyCoverage'],'; west grip:',[g['distance'] for g in grips])

if __name__=='__main__':main()
