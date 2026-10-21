"""Assemble real direction-specific Idle layers; preserve all original art pixels."""
import hashlib,json,shutil,sys
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
PREVIOUS=HERE.parent/'paper-doll-hair-outfit-20261021'
sys.path.insert(0,str(HERE.parents[1]/'tools'))
from paper_doll_fit_audit import pixels
from inspect_layer import inspect

DIRS=['south','north','west','east']
PADDING={'south':(10,13),'north':(10,13),'west':(10,10),'east':(10,10)}
ANCHORS={'south':(20,36),'north':(42,35),'west':(26,36),'east':(29,37)}
HANDS={'south':[(20,36),(18,35),(20,36),(19,35)],'north':[(42,35),(41,35),(41,35),(41,35)],
       'west':[(26,36),(25,34),(26,36),(27,38)],'east':[(29,37),(29,37),(29,37),(29,37)]}

def normalized(im):return bytes(v for color in pixels(im) for v in (color if color[3] else (0,0,0,0)))
def pad(im,direction):
    result=Image.new('RGBA',(84,84));result.paste(im,PADDING[direction]);return result
def write(name,data):(HERE/name).write_text(json.dumps(data,indent=2)+'\n')

def main():
    quality=json.loads((HERE/'quality-review.json').read_text())
    rig=json.loads((PREVIOUS/'shared-rig.json').read_text())
    sheets={s:Image.new('RGBA',(336,336)) for s in ['body','hair','outfit']}
    source_records=[];weapons={};registered={};audits=[]
    for row,d in enumerate(DIRS):
        if d=='south':
            sources={s:Image.open(PREVIOUS/f'{s}-idle-south.png').convert('RGBA') for s in sheets}
            frames={s:[sources[s].crop((i*84,0,(i+1)*84,84)) for i in range(4)] for s in sheets}
            shutil.copy2(PREVIOUS/'rigid-weapon.png',HERE/'weapon-south.png');weapons[d]=Image.open(HERE/'weapon-south.png').convert('RGBA')
        else:
            if not all(quality[s].get(d,{}).get('prototype_gate_passed') for s in sheets):raise ValueError('Missing body/hair/outfit quality gate: '+d)
            receipt=json.loads((HERE/f'idle-{d}-job.json').read_text())
            for name,digest in receipt['sha256'].items():
                if hashlib.sha256((HERE/name).read_bytes()).hexdigest()!=digest:raise ValueError('Original body changed: '+name)
            for slot in ['hair','outfit']:
                if not inspect(slot,d)['passed']:raise ValueError('Layer structure failed')
            frames={'body':[pad(Image.open(HERE/f'body-idle-{d}-raw-{i+1:02}.png').convert('RGBA'),d) for i in range(4)]}
            for slot in ['hair','outfit']:frames[slot]=[pad(Image.open(HERE/f'{slot}-{d}/frame-{i+1:02}.png').convert('RGBA'),d) for i in range(4)]
            if quality['weapon'].get(d,{}).get('prototype_gate_passed'):
                receipt=json.loads((HERE/f'weapon-{d}-job.json').read_text())
                if hashlib.sha256((HERE/f'weapon-{d}-raw.png').read_bytes()).hexdigest()!=receipt['raw_sha256']:raise ValueError('Original weapon changed')
                shutil.copy2(HERE/f'weapon-{d}-raw.png',HERE/f'weapon-{d}.png');weapons[d]=Image.open(HERE/f'weapon-{d}.png').convert('RGBA')
        for s in sheets:
            for i,im in enumerate(frames[s]):sheets[s].paste(im,(i*84,row*84))
        px,py=PADDING[d]
        for i,body in enumerate(frames['body']):
            source_records.append({'direction':d,'frame':i,'body_rgba_sha256':hashlib.sha256(normalized(body)).hexdigest(),'padding':[px,py]})
            # A fixed per-view registration puts every body's foot line at native65.
            if body.getbbox()[3]!=65:raise ValueError('Foot baseline changed: '+d)
        if d in weapons:
            anchor=ANCHORS[d];registered[d]=[{'x':x+px,'y':y+py} for x,y in HANDS[d]]
            for i,body in enumerate(frames['body']):
                weapon=Image.new('RGBA',(84,84));hx,hy=HANDS[d][i]
                weapon.paste(weapons[d],(hx+px-anchor[0],hy+py-anchor[1]))
                bp=list(pixels(body));wp=list(pixels(weapon));visible={n for n,c in enumerate(wp) if c[3]}
                hand={n for n,c in enumerate(bp) if c[3] and max(abs(n%84-(hx+px)),abs(n//84-(hy+py)))<=2}
                contact=sum(any(abs(n%84-h%84)<=1 and abs(n//84-h//84)<=1 for h in hand) for n in visible)
                if not contact:raise ValueError('Sword lost hand contact: '+d+' frame '+str(i))
                audits.append({'direction':d,'frame':i,'socket':registered[d][i],'contact_pixels':contact,'source_anchor':anchor})
    for s,im in sheets.items():im.save(HERE/f'{s}-idle.png')
    clip={**rig['animations']['idle'],'directions':DIRS,'frameWidth':84,'frameHeight':84}
    pieces=[{'id':'expansion-'+s,'slot':s,'rigId':rig['id'],'available':True,'approved':False,'zIndex':z,'animations':{'idle':{**clip,'url':s+'-idle.png'}}} for s,z in [('body',20),('outfit',50),('hair',60)]]
    sources={d:{'url':f'weapon-{d}.png','width':64,'height':64,'anchorX':ANCHORS[d][0],'anchorY':ANCHORS[d][1]} for d in DIRS if d in weapons}
    pieces.append({'id':'expansion-weapon','slot':'weapon','rigId':rig['id'],'available':True,'approved':False,'zIndex':80,'animations':{'idle':{**clip,'directions':list(sources),'url':'weapon-south.png','kind':'rigid-attachment','sources':sources,'sockets':registered,'directionOverrides':{'north':{'zIndex':10},'west':{'zIndex':10}}}}})
    pack={'status':'Idle multi-direction prototype for review; Walk/Attack incomplete','rig':rig,'pieces':pieces,'appearance':{'rigId':rig['id'],'pieces':{s:'expansion-'+s for s in ['body','hair','outfit','weapon']}},'reviewOnly':True,'full_character_artwork_approved':False,'readyDirections':list(sources),'audits':audits,'sources':source_records}
    write('review-pack.json',pack)
    # Lossless animated PNG: original order, four generated frames, no palette reduction.
    combined=[]
    for i in range(4):
        canvas=Image.new('RGBA',(336,84))
        for row,d in enumerate(DIRS):
            body=sheets['body'].crop((i*84,row*84,(i+1)*84,(row+1)*84));frame=body.copy()
            weapon=Image.new('RGBA',(84,84))
            if d in weapons:
                px,py=PADDING[d];hx,hy=HANDS[d][i];ax,ay=ANCHORS[d];weapon.paste(weapons[d],(hx+px-ax,hy+py-ay))
            if d in ['north','west']:frame=Image.alpha_composite(weapon,frame)
            for s in ['outfit','hair']:frame=Image.alpha_composite(frame,sheets[s].crop((i*84,row*84,(i+1)*84,(row+1)*84)))
            if d not in ['north','west']:frame=Image.alpha_composite(frame,weapon)
            canvas.paste(frame,(row*84,0))
        combined.append(canvas)
    combined[0].save(HERE/'idle-four-directions.png',save_all=True,append_images=combined[1:],duration=250,loop=0,disposal=0,blend=0)
    with Image.open(HERE/'idle-four-directions.png') as decoded:
        assert decoded.n_frames==4
        for i,expected in enumerate(combined):decoded.seek(i);assert normalized(decoded.convert('RGBA'))==normalized(expected)
    combined[0].save(HERE/'comparison-native.png')
    write('assembly-audit.json',{'passed':True,'frames':16,'slots':4,'padding':PADDING,'foot_line':65,'rescaled_pixels':0,'source_records':source_records,'sockets':audits,'readyDirections':list(sources)})
    print('Assembled real Idle sheets. Complete directions:',list(sources))

if __name__=='__main__':main()
