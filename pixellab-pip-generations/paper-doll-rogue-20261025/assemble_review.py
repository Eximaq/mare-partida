"""Extract PixelLab garment/dagger pixels and compose measured attachments.

All visible pixels come from archived source PNGs. Only masks, translations,
quarter-turn weapon rotations and transparent padding are applied locally.
No body painting, resampling, mirrored anatomy or synthetic animation frames.
"""
from pathlib import Path
from PIL import Image
import json,copy,shutil
P=Path(__file__).resolve().parent
B=P.parent/'paper-doll-navy-starter-20261023'
dirs=['south','north','west','east']
base=json.loads((B/'review-pack.json').read_text(encoding='utf-8'))
old_weapon=next(p for p in base['pieces'] if p['slot']=='weapon')
regions={'south':(14,37,22,47),'north':(44,18,49,34),'west':(17,33,28,39),'east':(33,33,45,40)}
anchors={'south':(20,38),'north':(46,30),'west':(27,36),'east':(34,36)}
hands={
 'south':[(21,34),(21,34),(21,29),(23,26),(21,29),(22,34),(21,35),(21,35)],
 'north':[(40,34),(40,33),(37,27),(36,23),(37,25),(40,32),(40,34),(40,35)],
 'west':[(28,34),(24,30),(21,27),(18,28),(21,29),(24,29),(27,34),(28,35)],
 'east':[(31,33),(36,30),(41,25),(43,23),(41,25),(37,30),(31,34),(31,34)]}
other_hands={
 'south':[(42,34),(36,28),(32,28),(33,29),(32,28),(36,29),(40,33),(42,35)],
 'north':[(23,34),(23,33),(26,27),(26,24),(25,26),(23,33),(23,35),(23,35)]}
knives={}
for d in dirs:
 source=Image.open(P/f'dagger-{d}-raw/00.png').convert('RGBA');layer=Image.new('RGBA',(64,64))
 x0,y0,x1,y1=regions[d]
 for y in range(y0,y1):
  for x in range(x0,x1):
   px=source.getpixel((x,y));r,g,b,a=px
   if a and not (r>120 and r>g*1.35 and g>b*1.2):layer.putpixel((x,y),px)
 layer.save(P/f'dagger-{d}-layer.png');knives[d]=layer

def attach(dst,d,hand,q=0):
 im=knives[d];ax,ay=anchors[d]
 for _ in range(q%4):im=im.transpose(Image.Transpose.ROTATE_270);ax,ay=63-ay,ax
 dst.alpha_composite(im,(round(hand[0]+10-ax),round(hand[1]+13-ay)))

def clothing(source):
 layer=Image.new('RGBA',(64,64));selected=set()
 for y in range(18,35):
  for x in range(14,49):
   r,g,b,a=source.getpixel((x,y))
   if a and ((b>r+8 and b>g+8 and r<120) or (r>=180 and g>=170 and b>=120 and r-g<45)):
    selected.add((x,y))
 edges=set()
 for x,y in selected:
  for ox,oy in [(0,1),(0,-1),(1,0),(-1,0)]:
   xy=(x+ox,y+oy)
   if 14<=xy[0]<49 and 18<=xy[1]<35:
    r,g,b,a=source.getpixel(xy)
    if a and max(r,g,b)<28:edges.add(xy)
 for xy in selected|edges:layer.putpixel(xy,source.getpixel(xy))
 return layer

def dressed(d,i):
 if d=='south':return Image.open(P/f'outfit-south-raw/{i:02}.png').convert('RGBA')
 j=dirs[1:].index(d)*8+i
 return Image.open(P/f'outfit-batch-{j//12}-raw/{j%12:02}.png').convert('RGBA')

m=copy.deepcopy(base);m.update(classId='rogue',previewEquipment={'weapon':12},status='Four-direction dagger attack, shared locomotion; DEV review only.')
m['rig']['animations']['attack-daggers']=m['rig']['animations'].pop('attack-sword')
m['coverage']={a:dirs for a in ['idle','walk','attack-daggers']}
m['categoryWeapons']={'daggers':'rogue-weapon'}
m['bindings']={'weapon':{'slot':'weapon','items':{'12':'rogue-weapon'}},'coat':{'slot':'outfit','items':{'6':'rogue-outfit'}}}
sheets={slot:Image.new('RGBA',(672,336)) for slot in ['body','outfit','hair','weapon']}
audit=[]
for row,d in enumerate(dirs):
 ref=Image.open(P/f'body-{d}-reference.png').convert('RGBA');refhead=ref.crop((0,0,64,18)).getbbox()
 hair=Image.open(B/'hair-idle.png').convert('RGBA').crop((10,row*84+13,74,row*84+77))
 hair.save(P/f'hair-{d}.png')
 for i in range(8):
  body=Image.open(P/f'body-{d}-raw/{i+1:02}.png').convert('RGBA');head=body.crop((0,0,64,18)).getbbox()
  dx=round((head[0]+head[2]-refhead[0]-refhead[2])/2);dy=head[1]-refhead[1]
  layers={s:Image.new('RGBA',(84,84)) for s in sheets}
  layers['body'].paste(body,(10,13));layers['outfit'].paste(clothing(dressed(d,i)),(10,13));layers['hair'].paste(hair,(10+dx,13+dy))
  q=(1 if d=='east' else 3) if d in ['west','east'] and i in [0,6,7] else 0
  attach(layers['weapon'],d,hands[d][i],q)
  if d in other_hands:attach(layers['weapon'],d,other_hands[d][i],3 if d=='south' else 0)
  for slot,im in layers.items():sheets[slot].paste(im,(i*84,row*84))
  audit.append({'direction':d,'frame':i,'primary_hand':hands[d][i],'secondary_hand':other_hands[d][i] if d in other_hands else 'occluded in profile','weapon_quarter_turns':q,'hair_offset':[dx,dy]})
for s,im in sheets.items():im.save(P/f'{s}-daggers.png')

for piece in m['pieces']:
 slot=piece['slot'];piece['id']='rogue-'+slot;m['appearance']['pieces'][slot]=piece['id']
 piece['name']={'body':'Corpo humano comum','hair':'Cabelo curto preto','outfit':'Camisa clara e colete azul','weapon':'Adagas da Bruma'}[slot]
 piece['animations'].pop('attack-sword')
 piece['animations']['attack-daggers']={**m['rig']['animations']['attack-daggers'],'kind':'sheet','url':slot+'-daggers.png','frameWidth':84,'frameHeight':84,'zIndex':{'body':20,'outfit':30,'hair':40,'weapon':10}[slot]}
 if slot!='weapon':
  for action in ['idle','walk']:shutil.copyfile(B/piece['animations'][action]['url'],P/piece['animations'][action]['url'])
  if slot=='hair':
   piece['animations']['attack-daggers'].update(kind='rigid-attachment',url='hair-south.png',sources={d:{'url':f'hair-{d}.png','width':64,'height':64,'anchorX':32,'anchorY':52} for d in dirs},sockets={d:[{'x':42+v['hair_offset'][0],'y':65+v['hair_offset'][1]} for v in audit if v['direction']==d] for d in dirs})
 else:
  piece['animations']['attack-daggers']['directionOverrides']={'south':{'zIndex':50}}
  sources={d:{'url':f'dagger-{d}-layer.png','width':64,'height':64,'anchorX':anchors[d][0],'anchorY':anchors[d][1]} for d in dirs}
  piece['animations']['attack-daggers'].update(kind='rigid-attachment',url='dagger-south-layer.png',sources=sources,sockets={d:[{'x':v['primary_hand'][0]+10,'y':v['primary_hand'][1]+13,'quarterTurns':v['weapon_quarter_turns']} for v in audit if v['direction']==d] for d in dirs},secondarySockets={d:[{'x':h[0]+10,'y':h[1]+13,'quarterTurns':3 if d=='south' else 0} for h in other_hands[d]] if d in other_hands else [None]*8 for d in dirs})
  for action,count in [('idle',4),('walk',8)]:
   sheet=Image.new('RGBA',(84*count,336))
   bodies=Image.open(B/f'body-{action}.png').convert('RGBA')
   sockets={d:[] for d in dirs};secondary={d:[] for d in dirs}
   for row,d in enumerate(dirs):
    for i in range(count):
     layer=Image.new('RGBA',(84,84));s=old_weapon['animations'][action]['sockets'][d][i];hand=(s['x']-10,s['y']-13)
     attach(layer,d,hand,1 if d=='east' else 3 if d=='west' else 0)
     sockets[d].append({'x':s['x'],'y':s['y'],'quarterTurns':1 if d=='east' else 3 if d=='west' else 0});other=None
     if d in ['south','north']:
      body=bodies.crop((i*84+10,row*84+13,i*84+74,row*84+77));side=range(36,47) if d=='south' else range(17,27)
      points=[(x,y) for y in range(27,40) for x in side if (lambda p:p[3]>0 and p[0]>120 and p[0]>p[1]*1.2 and p[1]>p[2]*1.15)(body.getpixel((x,y)))]
      if points:
       ymax=max(y for x,y in points);ends=[x for x,y in points if y==ymax];other=(round(sum(ends)/len(ends)),ymax)
       attach(layer,d,other,3 if d=='south' else 0)
     secondary[d].append({'x':other[0]+10,'y':other[1]+13,'quarterTurns':3 if d=='south' else 0} if other else None)
     sheet.paste(layer,(84*i,84*row))
   sheet.save(P/f'weapon-{action}.png')
   piece['animations'][action]={**m['rig']['animations'][action],'kind':'rigid-attachment','url':'dagger-south-layer.png','sources':sources,'sockets':sockets,'secondarySockets':secondary,'frameWidth':84,'frameHeight':84,'zIndex':10}

(P/'review-pack.json').write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
(P/'layer-audit.json').write_text(json.dumps({'source_pixels_only':True,'weapon_regions':regions,'weapon_anchors':anchors,'frames':audit,'productionEnabled':False,'notes':['North edit changed the body: only isolated blade pixels are used; anatomy remains the original animation.','Far dagger is occluded in profile; front/back use two attachments.']},indent=2)+'\n',encoding='utf-8')
# Diagnostic only; individual layer PNGs are the actual runtime assets.
contact=Image.new('RGBA',(672,336))
for slot in ['weapon','body','outfit','hair']:contact.alpha_composite(sheets[slot])
contact.alpha_composite(sheets['weapon'].crop((0,0,672,84)),(0,0))
contact.resize((1344,672),Image.Resampling.NEAREST).save(P/'contact-inspection.png')
print('32 real attack poses, shared idle/walk, separate layers assembled for inspection.')
