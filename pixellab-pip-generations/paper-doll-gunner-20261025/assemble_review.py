"""Native pixel extraction and measured attachments for the gunner review.

No synthesized anatomy, interpolation, mirrored directions or new damage events.
The source images and masks remain auditable beside this script.
"""
from pathlib import Path
from PIL import Image
import json, copy, shutil

P=Path(__file__).resolve().parent
BASE=P.parent/'paper-doll-navy-starter-20261023'
dirs=['south','north','west','east']
base=json.loads((BASE/'review-pack.json').read_text(encoding='utf-8'))
pilot=json.loads((P/'review-pack.json').read_text(encoding='utf-8'))
cloth={(48,48,70),(29,28,44),(81,83,105),(247,240,205),(211,197,168),
       (32,32,53),(53,53,76),(247,242,207),(217,189,154),(82,83,105)}
outline={(5,2,3),(8,5,5),(2,1,5),(4,4,5),(6,2,2)}
sheets={s:Image.new('RGBA',(672,336)) for s in ['body','hair','outfit']}
audit=[]
for row,d in enumerate(dirs):
    original=Image.open(P/f'body-{d}-reference.png').convert('RGBA')
    original_head=original.crop((0,0,64,18)).getbbox()
    hair=Image.open(BASE/'hair-idle.png').convert('RGBA').crop((10,row*84+13,74,row*84+77))
    hair.save(P/f'hair-{d}.png')
    for i in range(8):
        body=Image.open(P/(f'body-east-corrected-raw/{i+1:02}.png' if d=='east' else f'body-{d}-raw/{i+1:02}.png')).convert('RGBA')
        head=body.crop((0,0,64,18)).getbbox()
        dx=round((head[0]+head[2]-original_head[0]-original_head[2])/2);dy=head[1]-original_head[1]
        if d=='east':
            body84=Image.open(P/'pilot-body.png').convert('RGBA').crop((i*84,0,(i+1)*84,84))
            outfit84=Image.open(P/'pilot-outfit.png').convert('RGBA').crop((i*84,0,(i+1)*84,84))
        else:
            dressed=Image.open(P/f'outfit-{d}-{i:02}.png').convert('RGBA');outfit=Image.new('RGBA',(64,64))
            selected={(x,y) for y in range(18,34) for x in range(16,46) if dressed.getpixel((x,y))[3] and dressed.getpixel((x,y))[:3] in cloth}
            edges={(x+ox,y+oy) for x,y in selected for ox,oy in [(1,0),(-1,0),(0,1),(0,-1)] if 16<=x+ox<46 and 18<=y+oy<34 and dressed.getpixel((x+ox,y+oy))[3] and dressed.getpixel((x+ox,y+oy))[:3] in outline}
            for xy in selected|edges:outfit.putpixel(xy,dressed.getpixel(xy))
            body84=Image.new('RGBA',(84,84));body84.paste(body,(10,13))
            outfit84=Image.new('RGBA',(84,84));outfit84.paste(outfit,(10,13))
        hair84=Image.new('RGBA',(84,84));hair84.paste(hair,(10+dx,13+dy))
        for slot,im in [('body',body84),('outfit',outfit84),('hair',hair84)]:sheets[slot].paste(im,(84*i,84*row))
        audit.append({'direction':d,'frame':i,'hair_offset':[dx,dy]})
for s,im in sheets.items():im.save(P/f'{s}-firearm.png')

# Anatomical pixels from the edit are never copied into weapon layers.
# These masks select the fitted firearm only; rejected extra fragments stay raw.
regions={'south':(27,16,36,25),'north':(30,6,34,35),'west':(2,18,29,26)}
for d,region in regions.items():
    source=Image.open(P/('musket-north-corrected-raw.png' if d=='north' else f'musket-{d}-raw.png')).convert('RGBA')
    layer=Image.new('RGBA',(64,64))
    for y in range(region[1],region[3]):
        for x in range(region[0],region[2]):
            px=source.getpixel((x,y));r,g,b,a=px
            # Skin excluded, metal/wood/outline copied verbatim from source.
            if a and not (r>150 and r>g*1.15 and g>b*1.15):layer.putpixel((x,y),px)
    layer.save(P/f'musket-{d}-layer.png')

sockets={
 'south':[(21,34),(30,26),(31,25),(31,25),(31,25),(31,27),(22,34),(21,35)],
 'north':[(41,34),(35,23),(35,23),(35,23),(35,23),(35,23),(41,34),(41,35)],
 'west':[(27,31),(22,28),(17,26),(16,28),(17,27),(22,28),(27,33),(29,34)],
 'east':[(39,29),(41,25),(43,23),(43,25),(43,24),(41,25),(39,29),(31,33)]}
anchors={'south':(31,23),'north':(32,24),'west':(22,23),'east':(43,24)}
m=copy.deepcopy(base);m['classId']='gunner';m['previewEquipment']={'weapon':4}
m['rig']['animations']['attack-firearm']=m['rig']['animations'].pop('attack-sword')
m['coverage']={a:dirs for a in ['idle','walk','attack-firearm']}
m['categoryWeapons']={'firearm':'gunner-weapon'}
m['bindings']={'weapon':{'slot':'weapon','items':{'4':'gunner-weapon'}},'coat':{'slot':'outfit','items':{'6':'gunner-outfit'}}}
for piece in m['pieces']:
    slot=piece['slot'];piece['id']='gunner-'+slot;m['appearance']['pieces'][slot]=piece['id']
    if slot!='weapon':
        for action in ['idle','walk']:shutil.copyfile(BASE/piece['animations'][action]['url'],P/piece['animations'][action]['url'])
        c=piece['animations'].pop('attack-sword');c={**m['rig']['animations']['attack-firearm'],'kind':'sheet','url':slot+'-firearm.png','frameWidth':84,'frameHeight':84,'zIndex':{'body':20,'outfit':30,'hair':40}[slot]}
        if slot=='hair':
            c.update(kind='rigid-attachment',url='hair-south.png',sources={d:{'url':f'hair-{d}.png','width':64,'height':64,'anchorX':32,'anchorY':52} for d in dirs},sockets={d:[{'x':42+v['hair_offset'][0],'y':65+v['hair_offset'][1]} for v in audit if v['direction']==d] for d in dirs})
        piece['animations']['attack-firearm']=c
    else:
        previous=copy.deepcopy(piece['animations']);piece['animations']={}
        for action in ['idle','walk','attack-firearm']:
            c={**m['rig']['animations'][action],'frameWidth':84,'frameHeight':84,'kind':'rigid-attachment','url':'musket-east-layer.png','zIndex':10}
            if action=='attack-firearm':
                c['directionOverrides']={'south':{'zIndex':50}}
                c['sources']={d:{'url':f'musket-{d}-layer.png','width':64,'height':64,'anchorX':anchors[d][0],'anchorY':anchors[d][1]} for d in dirs}
                c['sockets']={d:[{'x':x+10,'y':y+13,**({'quarterTurns':1} if d=='east' and i==7 else {})} for i,(x,y) in enumerate(sockets[d])] for d in dirs}
            else:
                c['source']={'width':64,'height':64,'anchorX':43,'anchorY':24}
                c['sockets']={d:[{**v,'quarterTurns':1} for v in previous[action]['sockets'][d]] for d in dirs}
            piece['animations'][action]=c
(P/'review-pack.json').write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
(P/'layer-audit.json').write_text(json.dumps({'frames':audit,'mask_regions':regions,'productionEnabled':False,'source_pixels_only':True},indent=2)+'\n',encoding='utf-8')
