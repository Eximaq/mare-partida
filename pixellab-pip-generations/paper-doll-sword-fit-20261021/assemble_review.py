"""Assemble verified original frames only; refuse missing or invalid gear frames."""
from pathlib import Path
import hashlib,json,shutil,sys
from PIL import Image,ImageDraw

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from paper_doll_fit_audit import audit_changes_layer

def pad(image):
    result=Image.new('RGBA',(84,84));result.paste(image,(10,13));return result

def visible(image):
    return [(r,g,b,a) if a else (0,0,0,0) for r,g,b,a in image.get_flattened_data()]

def preview_gif(frames):
    colors=sorted({(r,g,b) for image in frames for r,g,b,a in image.get_flattened_data() if a})
    if len(colors)>255:raise ValueError('Cannot produce an exact GIF without palette loss')
    table={color:i+1 for i,color in enumerate(colors)}
    palette=[0,0,0]+[v for c in colors for v in c];palette += [0]*(768-len(palette))
    converted=[]
    for image in frames:
        item=Image.new('P',image.size);item.putpalette(palette)
        item.putdata([table[(r,g,b)] if a else 0 for r,g,b,a in image.get_flattened_data()]);converted.append(item)
    output=HERE/'sword-fit-preview.gif'
    converted[0].save(output,save_all=True,append_images=converted[1:],duration=250,
                      loop=0,disposal=2,transparency=0,optimize=False)
    decoded=Image.open(output)
    assert decoded.n_frames==4 and decoded.info['loop']==0
    for i,image in enumerate(frames):
        decoded.seek(i);assert decoded.disposal_method==2 and decoded.info['duration']==250
        assert visible(decoded.convert('RGBA'))==visible(image)

def main():
    preparation=json.loads((HERE/'input-preparation.json').read_text())
    audits=[];bodies=[];weapons=[];composites=[];hashes=[]
    # Audit all inputs BEFORE publishing any complete sheet or cycle.
    for index,frame in enumerate(preparation['frames'],1):
        source=HERE/frame['source'];weapon=HERE/f'weapon-raw-{index:02}.png'
        if hashlib.sha256(source.read_bytes()).hexdigest()!=frame['source_sha256']:
            raise ValueError(f'Source frame{index} changed since input preparation')
        if not weapon.is_file():raise ValueError(f'Missing generated frame{index}; no duplicate or empty frame allowed')
        report=audit_changes_layer(source,weapon,HERE/frame['mask'],frame['hand_contact_anchor'])
        (HERE/f'audit-{index:02}.json').write_text(json.dumps(report,indent=2)+'\n')
        if not report['passed']:raise ValueError(f'Frame{index} failed the strict contact audit')
        base=Image.open(source).convert('RGBA');layer=Image.open(weapon).convert('RGBA')
        composite=Image.alpha_composite(base,layer);composite.save(HERE/f'composite-{index:02}.png')
        bodies.append(pad(base));weapons.append(pad(layer));composites.append(pad(composite));audits.append(report)
        hashes.append({'source':source.name,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                       'generated':weapon.name,'generated_sha256':hashlib.sha256(weapon.read_bytes()).hexdigest()})
    for name,frames in [('body-idle-south.png',bodies),('weapon-idle-south.png',weapons)]:
        sheet=Image.new('RGBA',(336,84))
        for i,frame in enumerate(frames):sheet.paste(frame,(i*84,0))
        sheet.save(HERE/name)
    comparison=Image.new('RGBA',(336,168))
    for i in range(4):
        comparison.paste(bodies[i],(i*84,0));comparison.paste(composites[i],(i*84,84))
    comparison.save(HERE/'comparison-sheet.png')
    guide=comparison.copy();draw=ImageDraw.Draw(guide)
    for x in [84,168,252]:draw.line((x,0,x,167),fill=(248,210,110,255))
    draw.line((0,84,335,84),fill=(248,210,110,255));guide.save(HERE/'comparison-inspection-grid.png')
    preview_gif(composites)
    old=HERE.parent/'paper-doll-human-idle-south-20261021/weapon-idle-draft.png'
    shutil.copy2(old,HERE/'old-weapon-idle.png')
    rig={'id':'sword-contact-review-v1','frameWidth':84,'frameHeight':84,'pivotX':42,'pivotY':65,
         'scale':1,'requiredSlots':['body','weapon'],
         'animations':{'idle':{'frames':4,'fps':4,'loop':True,'directions':['south']}}}
    pieces=[{'id':'review-'+slot,'slot':slot,'rigId':rig['id'],'approved':False,'available':True,'zIndex':z,
             'animations':{'idle':{**rig['animations']['idle'],'url':file,'frameWidth':84,'frameHeight':84}}}
            for slot,z,file in [('body',0,'body-idle-south.png'),('weapon',10,'weapon-idle-south.png')]]
    review={'status':'four structural contact passes; artistic approval pending','rig':rig,'pieces':pieces,
            'appearance':{'rigId':rig['id'],'pieces':{'body':'review-body','weapon':'review-weapon'}},
            'scope':'inspection of body and weapon only, not a complete human-v1 pack',
            'audits':audits,'hashes':hashes,'artwork_approved':False}
    (HERE/'review.json').write_text(json.dumps(review,indent=2)+'\n')
    print(json.dumps({'frames':4,'contact_passes':sum(r['passed'] for r in audits),
                      'body_pixel_changes':sum(r['changed_body_pixels'] for r in audits),
                      'gif':'four original frames,4FPS,disposal2,loop0,decoded RGBA verified'}))

if __name__=='__main__':main()
