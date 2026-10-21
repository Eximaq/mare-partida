"""Review-only south/north walk composition from verified original PixelLab pixels."""
import hashlib,json,shutil
from pathlib import Path
from PIL import Image
from prepare_review import HERE,normalized,digest,inspect,write
PREVIOUS=HERE.parent/'paper-doll-walk-fit-20261021'
def padded(im,offset=(10,13)):
    frame=Image.new('RGBA',(84,84));frame.paste(im,offset);return frame
def main():
    review=json.loads((HERE/'quality-review.json').read_text())
    if not all(review[s]['prototype_gate_passed'] for s in ['body','weapon']):raise ValueError('Body/grip visual review incomplete')
    receipt=json.loads((HERE/'body-job.json').read_text())
    structure=json.loads((HERE/'body-structure.json').read_text())
    if not structure['echo_matches'] or structure['unique_frames']!=8 or structure['partial_alpha_pixels']:raise ValueError('Body structural review failed')
    for name,expected in receipt['sha256'].items():
        if digest(HERE/name)!=expected:raise ValueError('Original body changed')
    if not inspect('hair')['passed']:raise ValueError('Raw hair failed structural audit')
    if review['outfit']['prototype_gate_passed'] and not inspect('outfit')['passed']:raise ValueError('Outfit failed structural audit')
    pack=json.loads((PREVIOUS/'review-pack.json').read_text())
    sheets={s:Image.new('RGBA',(672,168 if s=='body' or review[s]['prototype_gate_passed'] else 84)) for s in ['body','hair','outfit']}
    for slot,sheet in sheets.items():sheet.paste(Image.open(PREVIOUS/f'{slot}-walk.png'),(0,0));shutil.copy2(PREVIOUS/f'{slot}-idle.png',HERE/f'{slot}-idle.png')
    for name in ['rigid-weapon.png','weapon-south.png','weapon-north.png','weapon-west.png','weapon-east.png']:shutil.copy2(PREVIOUS/name,HERE/name)
    sword=Image.open(HERE/'weapon-north.png').convert('RGBA');sockets=review['weapon']['sockets'];combined=[];drafts=[];records=[];hair_draft=Image.new('RGBA',(672,84))
    if len(sockets)!=8:raise ValueError('Eight distinct pose sockets required')
    for i,socket in enumerate(sockets):
        frames={'body':padded(Image.open(HERE/f'body-raw-{i+1:02}.png').convert('RGBA'))}
        for slot in ['hair','outfit']:
            if review[slot]['prototype_gate_passed']:frames[slot]=padded(Image.open(HERE/slot/f'frame-{i+1:02}.png').convert('RGBA'),(26,17))
        for slot,frame in frames.items():sheets[slot].paste(frame,(i*84,84))
        weapon=Image.new('RGBA',(84,84));weapon.paste(sword,(socket['x']-42,socket['y']-35))
        bp=list(frames['body'].get_flattened_data());wp=list(weapon.get_flattened_data())
        hand={n for n,c in enumerate(bp) if c[3] and max(abs(n%84-socket['x']),abs(n//84-socket['y']))<=2}
        visible={n for n,c in enumerate(wp) if c[3] and not bp[n][3]}
        contact=sum(any(abs(n%84-h%84)<=1 and abs(n//84-h//84)<=1 for h in hand) for n in visible)
        if not contact:raise ValueError('North sword has no exposed grip contact: '+str(i))
        full=Image.alpha_composite(weapon,frames['body'])
        if any(a!=b for a,b in zip(bp,full.get_flattened_data()) if a[3]):raise ValueError('Weapon changed body pixels')
        for slot in ['outfit','hair']:
            if slot in frames:full=Image.alpha_composite(full,frames[slot])
        raw_hair=padded(Image.open(HERE/'hair'/f'frame-{i+1:02}.png').convert('RGBA'),(26,17));hair_draft.paste(raw_hair,(i*84,0));drafts.append(Image.alpha_composite(full,raw_hair))
        combined.append(full);records.append({'frame':i,'socket':socket,'contact_pixels':contact,'source_anchor':[42,35],'zIndex':10,'body_pixel_changes':0})
    for slot,sheet in sheets.items():sheet.save(HERE/f'{slot}-walk.png')
    for piece in pack['pieces']:
        clip=piece['animations']['walk']
        if piece['slot'] in ['body','weapon'] or review[piece['slot']]['prototype_gate_passed']:clip['directions']=['south','north']
        if piece['slot']=='weapon':
            clip['sources']={'south':{'url':'rigid-weapon.png',**clip.pop('source')},'north':{'url':'weapon-north.png','width':64,'height':64,'anchorX':42,'anchorY':35}}
            clip['sockets']['north']=sockets
    complete=all(review[s]['prototype_gate_passed'] for s in ['body','weapon','hair','outfit'])
    pack.update(status='Review only: complete Walk/south; north body/grip candidate, failed hair and missing outfit use atomic fallback',coverage={'idle':['south','north','west','east'],'walk':['south','north'] if complete else ['south'],'attack-sword':[]},partialCoverage={'north':{'body':8,'weapon_sockets':8,'hair_registered':0,'outfit_registered':0}},reviewOnly=True,full_character_artwork_approved=False)
    write('review-pack.json',pack)
    combined[0].save(HERE/'walk-north-body.png',save_all=True,append_images=combined[1:],duration=125,loop=0,disposal=0,blend=0)
    drafts[0].save(HERE/'walk-north-hair-draft.png',save_all=True,append_images=drafts[1:],duration=125,loop=0,disposal=0,blend=0)
    hair_draft.save(HERE/'hair-north-draft.png')
    with Image.open(HERE/'walk-north-body.png') as check:
        assert check.n_frames==8
        for i,im in enumerate(combined):check.seek(i);assert normalized(im)==normalized(check.convert('RGBA'))
    comparison=Image.new('RGBA',(672,252))
    for i,full in enumerate(combined):comparison.paste(padded(Image.open(HERE/f'body-raw-{i+1:02}.png').convert('RGBA')),(i*84,0));comparison.paste(full,(i*84,84));comparison.paste(drafts[i],(i*84,168))
    comparison.save(HERE/'comparison-native.png')
    write('assembly-audit.json',{'passed':True,'scope':'partial body/grip structure only; not complete north artwork','coverage':pack['coverage'],'new_body_frames':8,'new_registered_north_layers':['body','weapon'],'rejected_north_layers':['hair'],'missing_north_layers':['outfit'],'native_body':[64,64],'compact_layer_cell':[32,52],'crop_offset':[16,4],'padding':[10,13],'layer_padding':[26,17],'pivot':[42,65],'rescaled_pixels':0,'sockets':records,'artwork_approved':False})
    print('Partial north study assembled: body/grip8, hair rejected, outfit absent. Complete Walk remains south; north atomic fallback.')
if __name__=='__main__':main()
