"""Compose verified real Walk/south layers; reuse the four-view Idle unchanged."""
import hashlib,json,shutil
from pathlib import Path
from PIL import Image
from audit_body import main as audit_body
from inspect_layer import inspect
from plan_attachment import main as plan_attachment

HERE=Path(__file__).resolve().parent
OLD=HERE.parent/'paper-doll-expansion-20261021'
def write(name,value):(HERE/name).write_text(json.dumps(value,indent=2)+'\n')
def normalized(im):return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
def padded(im):
    canvas=Image.new('RGBA',(84,84));canvas.paste(im,(10,13));return canvas

def main():
    inputs=json.loads((HERE/'input-preparation.json').read_text())
    original=Image.open(HERE/'body-input.png').convert('RGBA')
    for i,source in enumerate(inputs['files']):
        path=HERE/source['file']
        if hashlib.sha256(path.read_bytes()).hexdigest()!=source['sha256']:raise ValueError('Original source changed')
        x,y=(i%4)*64,(i//4)*64
        if normalized(original.crop((x,y,x+64,y+64)))!=normalized(Image.open(path)):raise ValueError('Original order changed')
    quality=json.loads((HERE/'quality-review.json').read_text())
    if not all(quality[s]['prototype_gate_passed'] for s in ['body','hair','outfit','weapon']):raise ValueError('Incomplete visual review')
    audit_body()
    if not json.loads((HERE/'body-audit.json').read_text())['passed']:raise ValueError('Invalid body edit')
    for slot in ['hair','outfit']:
        if not inspect(slot)['passed']:raise ValueError('Invalid layer: '+slot)
    plan_attachment()
    attachment=json.loads((HERE/'attachment-audit.json').read_text())
    pack=json.loads((OLD/'review-pack.json').read_text())
    for slot in ['body','hair','outfit']:shutil.copy2(OLD/f'{slot}-idle.png',HERE/f'{slot}-idle.png')
    for d in ['south','north','west','east']:shutil.copy2(OLD/f'weapon-{d}.png',HERE/f'weapon-{d}.png')
    sheets={s:Image.new('RGBA',(672,84)) for s in ['body','hair','outfit']}
    weapon=Image.open(HERE/'rigid-weapon.png').convert('RGBA');combined=[];records=[]
    for i in range(8):
        frames={'body':padded(Image.open(HERE/f'body-corrected-{i+1:02}.png').convert('RGBA'))}
        for s in ['hair','outfit']:frames[s]=padded(Image.open(HERE/s/f'frame-{i+1:02}.png').convert('RGBA'))
        for s in sheets:sheets[s].paste(frames[s],(i*84,0))
        socket=attachment['frames'][i]['socket'];arm=Image.new('RGBA',(84,84))
        arm.paste(weapon,(socket['x']-20,socket['y']-36))
        full=Image.alpha_composite(arm,frames['body'])
        for s in ['outfit','hair']:full=Image.alpha_composite(full,frames[s])
        combined.append(full)
        records.append({'frame':i,'padding':[10,13],'pivot':[42,65],'body_sha256':hashlib.sha256(normalized(frames['body'])).hexdigest(),'socket':socket})
    for s,im in sheets.items():im.save(HERE/f'{s}-walk.png')
    clip={**pack['rig']['animations']['walk'],'directions':['south'],'frameWidth':84,'frameHeight':84}
    for piece in pack['pieces']:
        s=piece['slot']
        if s=='weapon':
            piece['animations']['walk']={**clip,'url':'rigid-weapon.png','kind':'rigid-attachment','source':{'width':64,'height':64,'anchorX':20,'anchorY':36},'sockets':{'south':[f['socket'] for f in attachment['frames']]},'zIndex':10}
        else:piece['animations']['walk']={**clip,'url':s+'-walk.png'}
    pack.update(status='Review only: Idle four directions and real Walk/south; other Walk and all Attack use fallback',reviewOnly=True,full_character_artwork_approved=False,coverage={'idle':['south','north','west','east'],'walk':['south'],'attack-sword':[]})
    write('review-pack.json',pack)
    combined[0].save(HERE/'walk-south.png',save_all=True,append_images=combined[1:],duration=125,loop=0,disposal=0,blend=0)
    with Image.open(HERE/'walk-south.png') as check:
        assert check.n_frames==8
        for i,im in enumerate(combined):check.seek(i);assert normalized(check.convert('RGBA'))==normalized(im)
    comparison=Image.new('RGBA',(672,252))
    for i,full in enumerate(combined):
        comparison.paste(padded(Image.open(HERE/f'body-source-{i+1:02}.png').convert('RGBA')),(i*84,0))
        comparison.paste(sheets['body'].crop((i*84,0,(i+1)*84,84)),(i*84,84))
        comparison.paste(full,(i*84,168))
    comparison.save(HERE/'comparison-native.png')
    write('assembly-audit.json',{'passed':True,'review_only':True,'frames':8,'slots':4,'no_rescaling':True,'body_outside_mask_changes':0,'frame_order':'original row-major; reference echo excluded and preserved elsewhere','foot_motion':'Original stride preserved; fixed padding, no per-frame stabilization','records':records,'coverage':pack['coverage']})
    print('Walk/south: eight real modular frames assembled, Idle unchanged, production disabled.')
if __name__=='__main__':main()
