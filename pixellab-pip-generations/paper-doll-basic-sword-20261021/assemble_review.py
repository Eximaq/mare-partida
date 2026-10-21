"""Compose inspected real attack poses with one existing rigid blade per view."""
import json,shutil
from PIL import Image
from pipeline import HERE,OLD,digest,normalized,write,inspect,guide,body_path
def save_exact_gif(frames,path):
    if len(frames)!=8:raise ValueError('Eight real poses required')
    colors=sorted({c[:3] for f in frames for c in f.get_flattened_data() if c[3]})
    if len(colors)>255 or any(c[3] not in (0,255) for f in frames for c in f.get_flattened_data()):raise ValueError('GIF would lose source pixels; keep PNG/Canvas')
    lookup={color:i+1 for i,color in enumerate(colors)};palette=[0,0,0]+[v for c in colors for v in c];palette+=[0]*(768-len(palette));indexed=[]
    for f in frames:
        p=Image.new('P',f.size);p.putpalette(palette);p.putdata([lookup[c[:3]] if c[3] else 0 for c in f.get_flattened_data()]);indexed.append(p)
    durations=[80,90,80,80,90,80,80,90]
    indexed[0].save(path,save_all=True,append_images=indexed[1:],duration=durations,loop=0,transparency=0,disposal=2,optimize=False)
    with Image.open(path) as check:
        if check.n_frames!=8:raise ValueError('GIF changed frame count')
        for i,f in enumerate(frames):
            check.seek(i)
            if normalized(check.convert('RGBA'))!=normalized(f) or check.info['duration']!=durations[i]:raise ValueError('GIF differs from source composition')
    return len(colors)

def pad(im,origin):
    canvas=Image.new('RGBA',(84,84));canvas.paste(im,origin);return canvas

def weapon_frame(source,socket):
    image=Image.open(HERE/source['url']).convert('RGBA');w,h=image.size
    turn=socket.get('quarterTurns',0)
    if turn not in [0,1,2,3]:raise ValueError('Only exact quarter-turns are supported')
    anchors=[(source['anchorX'],source['anchorY']),(h-1-source['anchorY'],source['anchorX']),(w-1-source['anchorX'],h-1-source['anchorY']),(source['anchorY'],w-1-source['anchorX'])]
    if turn:image=image.transpose([Image.Transpose.ROTATE_270,Image.Transpose.ROTATE_180,Image.Transpose.ROTATE_90][turn-1])
    result=pad(image,(socket['x']-anchors[turn][0],socket['y']-anchors[turn][1]))
    if sum(c[3]>0 for c in result.get_flattened_data())!=sum(c[3]>0 for c in image.get_flattened_data()):raise ValueError('Grip placement would crop visible blade pixels')
    return result

def main():
    quality=json.loads((HERE/'quality-review.json').read_text());pack=json.loads((OLD/'review-pack.json').read_text())
    dirs=[d for d in ['south','north','west','east'] if all(quality.get(s,{}).get(d,{}).get('prototype_gate_passed') for s in ['body','hair','outfit','weapon'])]
    names={c['url'] for p in pack['pieces'] for c in p['animations'].values()}
    names.update(s['url'] for p in pack['pieces'] for c in p['animations'].values() for s in c.get('sources',{}).values())
    for name in names:shutil.copy2(OLD/name,HERE/name)
    sheets={s:Image.new('RGBA',(672,84*len(dirs))) for s in ['body','hair','outfit']}
    weapon=next(p for p in pack['pieces'] if p['slot']=='weapon')
    base=pack['rig']['animations']['attack-sword'];clip={**base,'frameWidth':84,'frameHeight':84,'directions':dirs,'kind':'rigid-attachment','url':'weapon-south.png','sources':{},'sockets':{},'directionOverrides':{},'poseOverrides':{}}
    records=[];gif_records={}
    for row,d in enumerate(dirs):
        inputs=json.loads((HERE/f'inputs-{d}.json').read_text());receipt=json.loads((HERE/f'body-{d}-job.json').read_text())
        for name,sha in receipt['sha256'].items():
            if digest(HERE/name)!=sha:raise ValueError('Original body changed')
        for s in ['hair','outfit']:
            if not inspect(s,d)['passed']:raise ValueError('Layer failed '+s+'/'+d)
        clip['sources'][d]=next(p for p in pack['pieces'] if p['slot']=='weapon')['animations']['walk']['sources'][d]
        clip['sockets'][d]=quality['weapon'][d]['sockets'];clip['directionOverrides'][d]={'zIndex':quality['weapon'][d]['zIndex']}
        clip['poseOverrides'][d]=quality['weapon'][d].get('poseOverrides',[{} for _ in range(8)])
        frames=[]
        for i in range(8):
            layers={'body':pad(Image.open(body_path(d,i+1)).convert('RGBA'),tuple(inputs['body_padding']))}
            for s in ['hair','outfit']:layers[s]=pad(Image.open(HERE/f'{s}-{d}/frame-{i+1:02}.png').convert('RGBA'),tuple(inputs['layer_padding']))
            for s,frame in layers.items():sheets[s].paste(frame,(i*84,row*84))
            socket=clip['sockets'][d][i];blade=weapon_frame(clip['sources'][d],socket)
            z=clip['poseOverrides'][d][i].get('zIndex',clip['directionOverrides'][d]['zIndex'])
            body=layers['body'];hand=[(x,y) for y in range(84) for x in range(84) if body.getpixel((x,y))[3] and max(abs(x-socket['x']),abs(y-socket['y']))<=2]
            contact=sum(any(max(abs(x-a),abs(y-b))<=1 for a,b in hand) for y in range(84) for x in range(84) if blade.getpixel((x,y))[3] and (z>20 or not body.getpixel((x,y))[3]))
            if not contact:raise ValueError('Detached or fully occluded blade '+d+'/'+str(i))
            full=Image.alpha_composite(blade,body) if z<20 else body
            for s in ['outfit','hair']:full=Image.alpha_composite(full,layers[s])
            if z>=20:full=Image.alpha_composite(full,blade)
            frames.append(full);records.append({'direction':d,'frame':i,'socket':socket,'contact_pixels':contact,'zIndex':z,'original_body_sha256':digest(body_path(d,i+1))})
        sheet=Image.new('RGBA',(672,84))
        for i,frame in enumerate(frames):sheet.paste(frame,(84*i,0))
        sheet.save(HERE/f'attack-{d}-sheet.png');guide(sheet,f'attack-{d}-inspection-grid.png',84)
        # Exact-palette preview; timing rounded to GIF10ms while total remains670ms.
        gif_records[d]=save_exact_gif(frames,HERE/f'attack-{d}.gif')
    if dirs:
        for s,sheet in sheets.items():sheet.save(HERE/f'{s}-attack-sword.png')
        for p in pack['pieces']:
            p['animations']['attack-sword']=clip if p['slot']=='weapon' else {**base,'directions':dirs,'frameWidth':84,'frameHeight':84,'url':p['slot']+'-attack-sword.png','zIndex':{'body':20,'outfit':50,'hair':60}[p['slot']]}
            p['approved']=False
    pack.update(status='Review: shared basic sword attack plus existing four-view locomotion',reviewOnly=True,full_character_artwork_approved=False)
    pack['coverage']['attack-sword']=dirs
    pack['sharedAction']={'id':'attack-sword','factionIndependent':True,'style':'short basic cut','weaponMotion':'existing rigid source with measured grips and exact quarter-turns','productionEnabled':False}
    write('review-pack.json',pack)
    write('assembly-audit.json',{'passed':True,'coverage':pack['coverage'],'source_pack':'../'+OLD.name+'/review-pack.json','rig':[84,84],'pivot':[42,65],'records':records,'gif_colors':gif_records,'production_enabled':False,'full_character_artwork_approved':False})
    print('Real shared sword attack review:',dirs)
if __name__=='__main__':main()
