"""Assemble source-pixel-only shared action categories; no new anatomy or paid calls."""
from pathlib import Path
from PIL import Image
import copy,json,shutil
P=Path(__file__).resolve().parent;OUT=P.parent/'paper-doll-complete-20261026';OUT.mkdir(exist_ok=True)
DIRS=['south','north','west','east']
def read(folder):return json.loads((folder/'review-pack.json').read_text(encoding='utf-8'))
BASE=P.parent/'paper-doll-navy-starter-20261023';base=read(BASE)
G=P.parent/'paper-doll-gunner-20261025';gunner=read(G)
folders={'sword':BASE,'unarmed':P.parent/'paper-doll-unarmed-combat-20261024','firearm':G,'daggers':P.parent/'paper-doll-rogue-20261025'}
# Copy only referenced pixels, renaming to a flat portable public pack.
def clone_clip(c,folder,prefix):
 c=copy.deepcopy(c)
 for target in [c,*c.get('sources',{}).values()]:
  src=target['url'];name=prefix+'-'+src;shutil.copyfile(folder/src,OUT/name);target['url']=name
 return c
m=copy.deepcopy(base);m.update(completeCategories=True,status='All six basic attack categories / seven classes; opt-in review only.',classId='sword',previewEquipment={'weapon':0})
m['rig']['requiredSlots']=['body','hair','outfit'];m['rig']['animations']={}
m['pieces']=[];m['categoryWeapons']={};m['bindings']={'weapon':{'slot':'weapon','items':{}},'coat':{'slot':'outfit','items':{'6':'complete-outfit'}}}
for slot in ['body','hair','outfit']:
 source=next(p for p in base['pieces'] if p['slot']==slot);piece=copy.deepcopy(source);piece.update(id='complete-'+slot,animations={});m['appearance']['pieces'][slot]=piece['id']
 for action in ['idle','walk']:piece['animations'][action]=clone_clip(source['animations'][action],BASE,'shared');m['rig']['animations'][action]=base['rig']['animations'][action]
 for category,folder in folders.items():
  pack=read(folder);action='attack-'+category;c=next(p for p in pack['pieces'] if p['slot']==slot)['animations'][action];piece['animations'][action]=clone_clip(c,folder,category);m['rig']['animations'][action]=pack['rig']['animations'][action]
 # The technology attack deliberately shares the validated aiming gesture.
 piece['animations']['attack-tech']=copy.deepcopy(piece['animations']['attack-firearm']);m['rig']['animations']['attack-tech']=copy.deepcopy(m['rig']['animations']['attack-firearm'])
 m['pieces'].append(piece)
for category,folder in folders.items():
 if category=='unarmed':continue
 pack=read(folder);piece=copy.deepcopy(next(p for p in pack['pieces'] if p['slot']=='weapon'));piece['id']='complete-'+category
 piece['animations']={a:clone_clip(c,folder,category) for a,c in piece['animations'].items()};m['pieces'].append(piece);m['categoryWeapons'][category]=piece['id']
 item={'sword':0,'firearm':4,'daggers':12}[category];m['bindings']['weapon']['items'][str(item)]=piece['id']
m['appearance']['pieces']['weapon']='complete-sword'
# Focus body/outfit: real eight-frame animation, no echo in the playback loop.
hands={'south':[(22,35),(23,34),(27,25),(26,24),(27,28),(28,32),(23,35),(22,35)],'north':[(41,34),(40,30),(39,23),(39,18),(41,21),(40,26),(41,31),(41,34)],'west':[(27,33),(21,28),(17,23),(13,25),(17,26),(21,28),(25,32),(27,33)],'east':[(35,30),(38,27),(42,21),(43,18),(44,19),(43,25),(38,29),(35,30)]}
sheets={s:Image.new('RGBA',(672,336)) for s in ['body','outfit']};hair_sockets={d:[] for d in DIRS}
def dress(d,i):
 if d=='south':return Image.open(P/f'outfit-south-raw/{i:02}.png').convert('RGBA')
 j=DIRS[1:].index(d)*8+i;return Image.open(P/f'outfit-batch-{j//12}-raw/{j%12:02}.png').convert('RGBA')
def garment(source):
 result=Image.new('RGBA',(64,64));pts=set()
 for y in range(18,35):
  for x in range(14,49):
   r,g,b,a=source.getpixel((x,y))
   if a and ((b>r+8 and b>g+8 and r<120) or (r>=180 and g>=170 and b>=120 and r-g<45)):pts.add((x,y))
 for x,y in list(pts):
  for dx,dy in [(0,1),(0,-1),(1,0),(-1,0)]:
   xy=(x+dx,y+dy)
   if 14<=xy[0]<49 and 18<=xy[1]<35 and source.getpixel(xy)[3] and max(source.getpixel(xy)[:3])<28:pts.add(xy)
 for xy in pts:result.putpixel(xy,source.getpixel(xy))
 return result
for row,d in enumerate(DIRS):
 reference=Image.open(P/f'body-{d}-reference.png').convert('RGBA');rh=reference.crop((0,0,64,18)).getbbox()
 for i in range(8):
  im=Image.open(P/f'body-{d}-raw/{i+1:02}.png').convert('RGBA');h=im.crop((0,0,64,18)).getbbox();dx=round((h[0]+h[2]-rh[0]-rh[2])/2);dy=h[1]-rh[1];hair_sockets[d].append({'x':42+dx,'y':65+dy})
  sheets['body'].paste(im,(i*84+10,row*84+13));sheets['outfit'].paste(garment(dress(d,i)),(i*84+10,row*84+13))
for slot,sheet in sheets.items():sheet.save(P/f'{slot}-focus.png');shutil.copyfile(P/f'{slot}-focus.png',OUT/f'{slot}-focus.png')
a=copy.deepcopy(base['rig']['animations']['attack-sword']);m['rig']['animations']['attack-focus']=a
for piece in m['pieces'][:3]:
 slot=piece['slot'];c={**a,'kind':'sheet','url':slot+'-focus.png','frameWidth':84,'frameHeight':84,'zIndex':{'body':20,'outfit':30,'hair':40}[slot]}
 if slot=='hair':
  sources={}
  for row,d in enumerate(DIRS):
   im=Image.open(BASE/'hair-idle.png').convert('RGBA').crop((10,row*84+13,74,row*84+77));im.save(OUT/f'focus-hair-{d}.png');sources[d]={'url':f'focus-hair-{d}.png','width':64,'height':64,'anchorX':32,'anchorY':52}
  c.update(kind='rigid-attachment',url='focus-hair-south.png',sources=sources,sockets=hair_sockets)
 piece['animations']['attack-focus']=c
# Each fitted edit is kept intact; only the declared object rectangles are extracted.
regions={'tech':{'south':(20,14,26,24),'north':(43,11,50,21),'west':(12,22,25,29),'east':(35,23,44,31)},'compass':{'south':(42,15,49,24),'north':(42,12,50,22),'west':(12,13,23,25),'east':(41,22,47,25)},'staff':{'south':(16,15,22,50),'north':(43,7,49,50),'west':(9,10,17,50),'east':(40,9,47,50)}}
anchors={'tech':{'south':(23,24),'north':(46,21),'west':(24,26),'east':(35,27)},'compass':{'south':(45,24),'north':(45,23),'west':(17,25),'east':(43,26)},'staff':{'south':(19,30),'north':(45,28),'west':(12,26),'east':(43,28)}}
weapon=next(p for p in base['pieces'] if p['slot']=='weapon');gun=next(p for p in gunner['pieces'] if p['slot']=='weapon')
for kind,item,category,name in [('tech',14,'tech','Manopla de Aço'),('compass',16,'focus','Compasso de Tempestade'),('staff',31,'focus','Cajado do Farol')]:
 piece=copy.deepcopy(weapon);piece.update(id='complete-'+kind,name=name,animations={});sources={}
 for d in DIRS:
  im=Image.open(P/f'{kind}-{d}-raw/00.png').convert('RGBA');layer=Image.new('RGBA',(64,64));box=regions[kind][d];ax,ay=anchors[kind][d]
  for y in range(box[1],box[3]):
   for x in range(box[0],box[2]):
    if kind=='staff' and y>=box[1]+9 and (abs(x-ax)>1 or ay-1<=y<=ay+1):continue
    layer.putpixel((x,y),im.getpixel((x,y)))
  layer.save(OUT/f'{kind}-{d}.png');sources[d]={'url':f'{kind}-{d}.png','width':64,'height':64,'anchorX':ax,'anchorY':ay}
 for action in ['idle','walk','attack-'+category]:
  motion=copy.deepcopy(m['rig']['animations'][action]);socket=copy.deepcopy((gun if kind=='tech' else weapon)['animations'][action if action in ['idle','walk'] else ('attack-firearm' if kind=='tech' else 'attack-sword')]['sockets']) if kind=='tech' or action in ['idle','walk'] else {d:[{'x':x+10,'y':y+13} for x,y in hands[d]] for d in DIRS}
  for rows in socket.values():
   for s in rows:s.pop('quarterTurns',None)
  piece['animations'][action]={**motion,'kind':'rigid-attachment','url':kind+'-south.png','frameWidth':84,'frameHeight':84,'sources':sources,'sockets':socket,'zIndex':50,'directionOverrides':{'north':{'zIndex':10}}}
 m['pieces'].append(piece);m['bindings']['weapon']['items'][str(item)]=piece['id']
 if kind!='staff':m['categoryWeapons'][category]=piece['id']
m['coverage']={a:DIRS for a in m['rig']['animations']};m['unarmedCategoryHasNoWeapon']=True
emissions=json.loads((P/'emitter-points.json').read_text())
for piece in m['pieces']:
 if piece['id'] in emissions:piece['emission']=emissions[piece['id']]
walk_body=Image.open(OUT/'shared-body-walk.png')
m['rig']['animations']['walk']['rootOffsets']={d:[{'x':0,'y':65-walk_body.crop((f*84,row*84,(f+1)*84,(row+1)*84)).getbbox()[3]} for f in range(8)] for row,d in enumerate(DIRS)}
(OUT/'review-pack.json').write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
(P/'layer-audit.json').write_text(json.dumps({'source_pixels_only':True,'focus_hand_sockets':hands,'equipment_regions':regions,'anchors':anchors,'tech_motion_reused_from':'gunner validated firearm gesture','body_and_clothing_echo_excluded':True,'productionEnabled':False},indent=2)+'\n')
print('Combined 7 classes, 6 attack categories, 3 shared body layers and separate weapons.')
