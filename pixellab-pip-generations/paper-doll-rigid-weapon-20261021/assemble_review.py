"""Approved rigid reuse: one existing weapon, four real body frames, integer sockets."""
from pathlib import Path
import hashlib,json,shutil
from PIL import Image

HERE=Path(__file__).resolve().parent
PREVIOUS=HERE.parent/'paper-doll-layer-batch-20261021'

def digest(file):return hashlib.sha256(file.read_bytes()).hexdigest()
def visible(image):return [(r,g,b,a) if a else (0,0,0,0) for r,g,b,a in image.get_flattened_data()]

def main():
    audit=json.loads((PREVIOUS/'attachment-plan-audit.json').read_text())
    source=PREVIOUS/audit['candidate_weapon_source']
    if digest(source)!=audit['candidate_weapon_sha256']:raise ValueError('Candidate changed')
    shutil.copy2(source,HERE/'rigid-weapon.png')
    shutil.copy2(PREVIOUS/'body-idle-south.png',HERE/'body-idle-south.png')
    shutil.copy2(PREVIOUS/'weapon-idle-south.png',HERE/'previous-weapon-idle.png')
    body_sheet=Image.open(HERE/'body-idle-south.png').convert('RGBA')
    weapon=Image.open(HERE/'rigid-weapon.png').convert('RGBA')
    comparison=Image.new('RGBA',(336,168));frames=[];records=[]
    for i,row in enumerate(audit['frames']):
        if not row['geometry_fits'] or digest(PREVIOUS/row['body_source'])!=row['body_sha256']:
            raise ValueError('Source changed or contact failed')
        base=body_sheet.crop((i*84,0,(i+1)*84,84))
        expected=Image.new('RGBA',(84,84))
        expected.paste(Image.open(PREVIOUS/row['body_source']).convert('RGBA'),(10,13))
        if visible(base)!=visible(expected):raise ValueError('Body sheet does not match the original native frame')
        offset=[row['hand_anchor'][0]-20+10,row['hand_anchor'][1]-36+13]
        layer=Image.new('RGBA',(84,84));layer.paste(weapon,tuple(offset))
        combined=Image.alpha_composite(base,layer)
        for a,b in zip(base.get_flattened_data(),combined.get_flattened_data()):
            if a[3] and a!=b:raise ValueError('Body was occluded')
        combined.save(HERE/f'composite-{i+1:02}.png');frames.append(combined)
        comparison.paste(base,(i*84,0));comparison.paste(combined,(i*84,84))
        records.append({**row,'socket':{'x':row['hand_anchor'][0]+10,'y':row['hand_anchor'][1]+13},
                        'source_rect':[0,0,64,64],'native_translation':offset,'body_pixel_changes':0,
                        'visible_weapon_pixels':79,'same_source_sha256':digest(source)})
    comparison.save(HERE/'comparison-sheet.png')
    colors=sorted({(r,g,b) for frame in frames for r,g,b,a in frame.get_flattened_data() if a})
    if len(colors)>255:raise ValueError('GIF palette loss')
    palette=[0,0,0]+[v for c in colors for v in c];palette += [0]*(768-len(palette))
    indices={c:i+1 for i,c in enumerate(colors)};indexed=[]
    for frame in frames:
        item=Image.new('P',frame.size);item.putpalette(palette)
        item.putdata([indices[(r,g,b)] if a else 0 for r,g,b,a in frame.get_flattened_data()]);indexed.append(item)
    indexed[0].save(HERE/'rigid-weapon-review.gif',save_all=True,append_images=indexed[1:],
                    duration=250,loop=0,disposal=2,transparency=0,optimize=False)
    decoded=Image.open(HERE/'rigid-weapon-review.gif')
    assert decoded.n_frames==4 and decoded.info['loop']==0
    for i,frame in enumerate(frames):
        decoded.seek(i)
        assert decoded.disposal_method==2 and decoded.info['duration']==250 and visible(decoded.convert('RGBA'))==visible(frame)
    anim={'frames':4,'fps':4,'loop':True,'directions':['south']}
    rig={'id':'rigid-weapon-review-v1','frameWidth':84,'frameHeight':84,'pivotX':42,'pivotY':65,
         'scale':1,'requiredSlots':['body','weapon'],'animations':{'idle':anim}}
    clip={**anim,'frameWidth':84,'frameHeight':84}
    pieces=[{'id':'review-body','slot':'body','rigId':rig['id'],'approved':False,'zIndex':0,
             'animations':{'idle':{**clip,'url':'body-idle-south.png'}}},
            {'id':'review-weapon','slot':'weapon','rigId':rig['id'],'approved':False,'zIndex':50,
             'animations':{'idle':{**clip,'kind':'rigid-attachment','url':'rigid-weapon.png',
               'source':{'width':64,'height':64,'anchorX':20,'anchorY':36},
               'sockets':{'south':[row['socket'] for row in records]}}}}]
    review={'status':'rigid weapon technical prototype; full-character art incomplete','rig':rig,'pieces':pieces,
            'appearance':{'rigId':rig['id'],'pieces':{'body':'review-body','weapon':'review-weapon'}},
            'audits':records,'scope':'one rigid weapon and four real body frames, Idle/south only',
            'artwork_approved':False,'new_generations':0,'missing':['hair','outfit','north','west','east','walk','attack']}
    (HERE/'review.json').write_text(json.dumps(review,indent=2)+'\n')
    manifest={'status':review['status'],'approval':'User replied Prossiga after the explicit rigid-weapon proposal; no paid calls authorized or submitted.',
              'new_generations':0,'weapon_origin':{'job_id':'c41dbbaa-b5bf-482c-bd5c-a3e6a8278763',
              'native_cell':1,'file':'rigid-weapon.png','sha256':digest(source),'historic_job_charge_generations':6,
              'note':'Historical charge from the previous atlas, not a new charge.'},
              'body_origin':'Four existing generated Idle/south frames; originals preserved in prior pilot.',
              'inputs':[{'file':n,'sha256':digest(HERE/n)} for n in ['rigid-weapon.png','body-idle-south.png','previous-weapon-idle.png']],
              'assembly':'One native64x64 weapon image reused at four integer hand sockets in84x84 body frames. No rotation, scaling, repainting, mirrored art, independent generated weapon frames or new motion.',
              'output':'Single weapon PNG, four composite inspection PNGs, comparison sheet and exact transparent GIF4FPS/loop0/disposal2.',
              'production':'No production art activated; human-v1 still requires body, hair, outfit and weapon. Saves and combat unchanged.'}
    (HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('Rigid weapon review assembled: one unchanged79px image, four sockets, no body changes, no new generations.')

if __name__=='__main__':main()
