"""Extend the existing review pack only with individually inspected real poses."""
import json,shutil,sys
from PIL import Image
from pipeline import HERE,OLD,digest,normalized,write,inspect,guide
NORTH=HERE.parent/'paper-doll-north-finish-20261021'
sys.path.insert(0,str(NORTH))
from assemble_review import save_exact_gif

def pad(im,origin):
    out=Image.new('RGBA',(84,84));out.paste(im,origin);return out

def main():
    quality=json.loads((HERE/'quality-review.json').read_text(encoding='utf-8'))
    pack=json.loads((NORTH/'review-pack.json').read_text(encoding='utf-8'))
    complete=[d for d in ['west','east'] if all(quality.get(s,{}).get(d,{}).get('prototype_gate_passed') for s in ['body','hair','outfit','weapon'])]
    directions=['south','north']+complete;rows=len(directions)
    sheets={slot:Image.new('RGBA',(672,84*rows)) for slot in ['body','hair','outfit']}
    for slot,sheet in sheets.items():sheet.paste(Image.open(NORTH/f'{slot}-walk.png'),(0,0))
    for name in ['body-idle.png','hair-idle.png','outfit-idle.png','rigid-weapon.png']+[f'weapon-{d}.png' for d in ['south','north','west','east']]:shutil.copy2(NORTH/name,HERE/name)
    records=[];weapon_piece=next(p for p in pack['pieces'] if p['slot']=='weapon');clip=weapon_piece['animations']['walk']
    for row,d in enumerate(directions[2:],2):
        for slot in ['hair','outfit']:
            if not inspect(slot,d)['passed']:raise ValueError('Invalid native layer: '+slot+'/'+d)
        receipt=json.loads((HERE/f'body-{d}-job.json').read_text())
        for name,expected in receipt['sha256'].items():
            if digest(HERE/name)!=expected:raise ValueError('Original body changed')
        source={'url':f'weapon-{d}.png','width':64,'height':64,'anchorX':26 if d=='west' else 29,'anchorY':36 if d=='west' else 37}
        clip['sources'][d]=source;clip['sockets'][d]=quality['weapon'][d]['sockets'];clip.setdefault('directionOverrides',{})[d]={'zIndex':quality['weapon'][d]['zIndex']}
        for i in range(8):
            frames={'body':pad(Image.open(HERE/f'body-{d}-raw-{i+1:02}.png').convert('RGBA'),(10,10))}
            for slot in ['hair','outfit']:frames[slot]=pad(Image.open(HERE/f'{slot}-{d}/frame-{i+1:02}.png').convert('RGBA'),(26,10))
            for slot,frame in frames.items():sheets[slot].paste(frame,(i*84,row*84))
            socket=clip['sockets'][d][i];weapon=pad(Image.open(HERE/f'weapon-{d}.png').convert('RGBA'),(socket['x']-source['anchorX'],socket['y']-source['anchorY']))
            body=frames['body'];hand=[(x,y) for y in range(84) for x in range(84) if body.getpixel((x,y))[3] and max(abs(x-socket['x']),abs(y-socket['y']))<=2]
            foreground=quality['weapon'][d]['zIndex']>20
            visible=[(x,y) for y in range(84) for x in range(84) if weapon.getpixel((x,y))[3] and (foreground or not body.getpixel((x,y))[3])]
            contact=sum(any(max(abs(x-a),abs(y-b))<=1 for a,b in hand) for x,y in visible)
            if not contact:raise ValueError('Sword detached from original hand: '+d+'/'+str(i))
            records.append({'direction':d,'frame':i,'socket':socket,'contact_pixels':contact,'body_sha256':digest(HERE/f'body-{d}-raw-{i+1:02}.png'),'body_padding':[10,10],'layer_padding':[26,10]})
    for slot,sheet in sheets.items():sheet.save(HERE/f'{slot}-walk.png')
    for piece in pack['pieces']:piece['animations']['walk']['directions']=directions;piece['approved']=False
    pack.update(status='Review only: Idle four views and inspected Walk directions; attacks remain legacy',coverage={'idle':['south','north','west','east'],'walk':directions,'attack-sword':[]},partialCoverage={},reviewOnly=True,full_character_artwork_approved=False)
    write('review-pack.json',pack);all_frames=[];gif_colors={}
    for row,d in enumerate(directions):
        frames=[]
        for i in range(8):
            body=sheets['body'].crop((i*84,row*84,(i+1)*84,(row+1)*84));s=clip['sources'][d];socket=clip['sockets'][d][i];weapon=pad(Image.open(HERE/s['url']).convert('RGBA'),(socket['x']-s['anchorX'],socket['y']-s['anchorY']))
            # Existing south/north clip both put the weapon behind the body.
            behind=clip.get('directionOverrides',{}).get(d,{}).get('zIndex',clip.get('zIndex',weapon_piece['zIndex']))<20
            full=Image.alpha_composite(weapon,body) if behind else body
            for slot in ['outfit','hair']:full=Image.alpha_composite(full,sheets[slot].crop((i*84,row*84,(i+1)*84,(row+1)*84)))
            if not behind:full=Image.alpha_composite(full,weapon)
            frames.append(full)
        all_frames.append(frames)
        if d in complete:
            sheet=Image.new('RGBA',(672,84))
            for i,frame in enumerate(frames):sheet.paste(frame,(i*84,0))
            sheet.save(HERE/f'walk-{d}-sheet.png');gif_colors[d]=save_exact_gif(frames,HERE/f'walk-{d}.gif');guide(sheet,f'walk-{d}-inspection-grid.png',84)
    combined=[]
    for i in range(8):
        frame=Image.new('RGBA',(84*rows,84))
        for row,frames in enumerate(all_frames):frame.paste(frames[i],(row*84,0))
        combined.append(frame)
    combined_colours={c[:3] for frame in combined for c in frame.get_flattened_data() if c[3]}
    if len(combined_colours)<=255:gif_colors['combined']=save_exact_gif(combined,HERE/'walk-views.gif')
    else:
        gif_colors['combined']={'omitted':'Exact palette exceeds255; separate direction GIFs preserve original colours','colours':len(combined_colours)}
        previous=HERE/'walk-views.gif'
        if previous.exists():
            # Preserve an earlier partial review, but never publish it as the
            # current complete preview after the palette grows past GIF limits.
            with Image.open(previous) as old:views=old.width//84
            suffix=digest(previous)[:8];target=HERE/f'walk-{views}-views-study-{suffix}.gif';n=1
            while target.exists():n+=1;target=HERE/f'walk-{views}-views-study-{suffix}-{n}.gif'
            previous.rename(target)
    write('assembly-audit.json',{'passed':True,'coverage':pack['coverage'],'frames_per_walk':8,'native_rig':[84,84],'pivot':[42,65],'recorded_sockets':records,'gif_palette_colors':gif_colors,'gif_durations_ms':[120,130]*4,'full_character_artwork_approved':False,'production_enabled':False})
    print('Review Walk coverage:',directions)
if __name__=='__main__':main()
