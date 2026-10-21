"""Compose complete north walk only after all three real edit batches pass review."""
import json,shutil
from PIL import Image
from prepare_inputs import HERE,OLD,digest,write,normalized
from inspect_batch import inspect
def pad(im,offset=(10,13)):
    result=Image.new('RGBA',(84,84));result.paste(im,offset);return result
def save_exact_gif(frames,path):
    if len(frames)!=8 or any(frame.size!=frames[0].size for frame in frames):raise ValueError('Exactly eight equal native frames required')
    if any(c[3] not in (0,255) for frame in frames for c in frame.get_flattened_data()):raise ValueError('GIF cannot preserve partial alpha')
    colors=sorted({c[:3] for frame in frames for c in frame.get_flattened_data() if c[3]})
    if len(colors)>255:raise ValueError('Too many colours for a lossless GIF; retain PNG originals, do not silently quantize')
    palette=[(0,0,0)]+colors;lookup={c:i+1 for i,c in enumerate(colors)};flat=[v for c in palette for v in c];flat += [0]*(768-len(flat));indexed=[]
    for frame in frames:
        out=Image.new('P',frame.size);out.putpalette(flat);out.putdata([lookup[c[:3]] if c[3] else 0 for c in frame.get_flattened_data()]);indexed.append(out)
    indexed[0].save(path,save_all=True,append_images=indexed[1:],duration=[120,130]*4,loop=0,transparency=0,disposal=2,optimize=False)
    with Image.open(path) as check:
        if check.n_frames!=8:raise ValueError('GIF changed frame count')
        for i,frame in enumerate(frames):check.seek(i);assert check.info['duration']==[120,130][i%2];assert normalized(check.convert('RGBA'))==normalized(frame)
    return len(colors)
def main():
    quality=json.loads((HERE/'quality-review.json').read_text())
    if not all(quality[b]['prototype_gate_passed'] for b in ['hair-repair','outfit-remaining']) or quality['outfit-first'].get('valid_pose_indices')!=[1,2]:raise ValueError('Visual review incomplete')
    inputs=json.loads((HERE/'inputs.json').read_text())
    for name,expected in inputs['files'].items():
        if digest(HERE/name)!=expected:raise ValueError('Frozen input changed: '+name)
    for batch in ['hair-repair','outfit-first','outfit-remaining']:
        if not inspect(batch)['passed']:raise ValueError('Invalid batch: '+batch)
    pack=json.loads((OLD/'review-pack.json').read_text());sheets={s:Image.new('RGBA',(672,168)) for s in ['hair','outfit']}
    for slot,sheet in sheets.items():sheet.paste(Image.open(OLD/f'{slot}-walk.png'),(0,0))
    for name in ['body-walk.png','body-idle.png','hair-idle.png','outfit-idle.png','rigid-weapon.png','weapon-south.png','weapon-north.png','weapon-west.png','weapon-east.png']:shutil.copy2(OLD/name,HERE/name)
    weapon=Image.open(HERE/'weapon-north.png').convert('RGBA');sockets=next(p for p in pack['pieces'] if p['slot']=='weapon')['animations']['walk']['sockets']['north'];combined=[];records=[]
    for i in range(8):
        hair=pad(Image.open(HERE/f'hair-preserved-{i+1:02}.png').convert('RGBA'),(26,17)) if i<4 else pad(Image.open(HERE/'hair-repair'/f'frame-{i-3:02}.png').convert('RGBA'))
        batch='outfit-first' if i<2 else 'outfit-remaining';index=i+1 if i<2 else i-1;outfit_padding=(10,13) if i<2 else (26,13);outfit=pad(Image.open(HERE/batch/f'frame-{index:02}.png').convert('RGBA'),outfit_padding)
        sheets['hair'].paste(hair,(i*84,84));sheets['outfit'].paste(outfit,(i*84,84))
        body=pad(Image.open(HERE/f'body-raw-{i+1:02}.png').convert('RGBA'));layer=Image.new('RGBA',(84,84));socket=sockets[i];layer.paste(weapon,(socket['x']-42,socket['y']-35));full=Image.alpha_composite(layer,body)
        assert all(a==b for a,b in zip(body.get_flattened_data(),full.get_flattened_data()) if a[3]),'Sword must remain behind body'
        full=Image.alpha_composite(Image.alpha_composite(full,outfit),hair);combined.append(full)
        records.append({'frame':i,'hair_source':f'hair-preserved-{i+1:02}.png' if i<4 else f'hair-repair/frame-{i-3:02}.png','hair_padding':[26,17] if i<4 else [10,13],'outfit_source':batch+f'/frame-{index:02}.png','outfit_padding':outfit_padding,'body_sha256':digest(HERE/f'body-raw-{i+1:02}.png'),'socket':socket})
    for slot,sheet in sheets.items():sheet.save(HERE/f'{slot}-walk.png')
    for piece in pack['pieces']:
        if piece['slot'] in ['hair','outfit']:piece['animations']['walk']['directions']=['south','north']
        piece['approved']=False
    pack.update(status='Review only: Idle four directions, complete Walk south/north; profiles and attacks remain fallback',coverage={'idle':['south','north','west','east'],'walk':['south','north'],'attack-sword':[]},partialCoverage={},reviewOnly=True,full_character_artwork_approved=False)
    write('review-pack.json',pack)
    sheet=Image.new('RGBA',(672,84))
    for i,frame in enumerate(combined):sheet.paste(frame,(i*84,0))
    sheet.save(HERE/'walk-north-sheet.png');palette_count=save_exact_gif(combined,HERE/'walk-north.gif')
    write('assembly-audit.json',{'passed':True,'scope':'complete north walk prototype, not full character approval','coverage':pack['coverage'],'frames':8,'original_body_reused':True,'preserved_hair_frames':[1,2,3,4],'corrected_hair_frames':[5,6,7,8],'frame_order':'original eight poses; no temporal trimming or duplication','pivot':[42,65],'rig':[84,84],'source_scale_changes':0,'gif_palette_colors':palette_count,'gif_durations_ms':[120,130]*4,'gif_loop_ms':1000,'native_playback_fps':8,'records':records,'artwork_approved':False})
    print('Complete north walk assembled for review, exact GIF colours:',palette_count)
if __name__=='__main__':main()
