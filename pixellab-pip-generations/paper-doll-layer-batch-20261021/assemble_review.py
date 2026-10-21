"""Preserve generated pixels and expose the failed artistic gate for review."""
from pathlib import Path
import hashlib,json,sys
from PIL import Image

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from inspect_result import main as inspect

def visible(image):
    return [(r,g,b,a) if a else (0,0,0,0) for r,g,b,a in image.get_flattened_data()]

def pad(image):
    result=Image.new('RGBA',(84,84));result.paste(image,(10,13));return result

def main():
    inspect('weapon')
    audit=json.loads((HERE/'weapon-audit.json').read_text())
    if not audit['passed']:raise ValueError('Structural failure: do not assemble playable review')
    body=[];weapon=[];composites=[]
    for i in range(1,5):
        base=Image.open(HERE/f'body-source-{i:02}.png').convert('RGBA')
        layer=Image.open(HERE/f'weapon/frame-{i:02}.png').convert('RGBA')
        composite=Image.alpha_composite(base,layer)
        composite.save(HERE/f'composite-{i:02}.png')
        body.append(pad(base));weapon.append(pad(layer));composites.append(pad(composite))
    for name,frames in [('body-idle-south.png',body),('weapon-idle-south.png',weapon)]:
        sheet=Image.new('RGBA',(336,84))
        for i,frame in enumerate(frames):sheet.paste(frame,(i*84,0))
        sheet.save(HERE/name)
    # A native comparison, not a generated character or a repaired weapon.
    old=Image.open(HERE.parent/'paper-doll-sword-fit-20261021/weapon-idle-south.png').convert('RGBA')
    old.save(HERE/'previous-weapon-idle.png')
    comparison=Image.new('RGBA',(336,252))
    for i in range(4):
        comparison.paste(body[i],(i*84,0))
        previous=Image.alpha_composite(body[i],old.crop((i*84,0,(i+1)*84,84)))
        comparison.paste(previous,(i*84,84));comparison.paste(composites[i],(i*84,168))
    comparison.save(HERE/'comparison-sheet.png')
    colors=sorted({(r,g,b) for frame in composites for r,g,b,a in frame.get_flattened_data() if a})
    if len(colors)>255:raise ValueError('GIF would lose colors')
    table={c:i+1 for i,c in enumerate(colors)}
    palette=[0,0,0]+[v for c in colors for v in c];palette += [0]*(768-len(palette))
    indexed=[]
    for frame in composites:
        image=Image.new('P',(84,84));image.putpalette(palette)
        image.putdata([table[(r,g,b)] if a else 0 for r,g,b,a in frame.get_flattened_data()]);indexed.append(image)
    indexed[0].save(HERE/'weapon-batch-review.gif',save_all=True,append_images=indexed[1:],
                    duration=250,loop=0,disposal=2,transparency=0,optimize=False)
    decoded=Image.open(HERE/'weapon-batch-review.gif')
    assert decoded.n_frames==4 and decoded.info['loop']==0
    for i,frame in enumerate(composites):
        decoded.seek(i)
        assert decoded.disposal_method==2 and decoded.info['duration']==250
        assert visible(decoded.convert('RGBA'))==visible(frame)
    rig={'id':'weapon-batch-review-v1','frameWidth':84,'frameHeight':84,'pivotX':42,'pivotY':65,
         'scale':1,'requiredSlots':['body','weapon'],
         'animations':{'idle':{'frames':4,'fps':4,'loop':True,'directions':['south']}}}
    pieces=[{'id':'batch-'+slot,'slot':slot,'rigId':rig['id'],'approved':False,'available':True,'zIndex':z,
             'animations':{'idle':{**rig['animations']['idle'],'url':slot+'-idle-south.png',
                                   'frameWidth':84,'frameHeight':84}}}
            for slot,z in [('body',0),('weapon',10)]]
    data={'status':'artistic-gate-failed','structural_pass':True,'artwork_approved':False,
          'rig':rig,'pieces':pieces,'appearance':{'rigId':rig['id'],
          'pieces':{'body':'batch-body','weapon':'batch-weapon'}},'audits':audit['frames'],
          'not_generated':['hair','outfit'],'charged_generations':6,
          'reason':'Blade length, thickness and brass guard vary between the four breathing poses.',
          'scope':'diagnostic body and weapon only; not a complete human-v1 pack'}
    (HERE/'review.json').write_text(json.dumps(data,indent=2)+'\n')
    print('Review assembled without pixel edits; artistic gate FAILED; hair/outfit not generated.')

if __name__=='__main__':main()
