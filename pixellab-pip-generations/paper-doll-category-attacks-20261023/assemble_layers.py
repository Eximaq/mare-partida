"""Copy native garment pixels by reviewed palette/region; never paint anatomy."""
import copy, hashlib, json
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
BASE=HERE.parent/'paper-doll-navy-starter-20261023'
def write(name,value): (HERE/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
def rgba(path): return Image.open(path).convert('RGBA')
DIRECTIONS=['south','west','east']
CONFIG={
 'south':(0,(20,18,44,34),[(49,48,70),(80,83,103),(35,31,46),(247,239,211),(221,193,157),(252,252,249)],[(6,2,3),(6,5,6),(2,1,5)]),
 'west':(2,(23,18,39,34),[(47,46,67),(62,62,91),(81,83,111),(233,220,189),(219,192,151)],[(5,3,4)]),
 'east':(3,(24,18,40,34),[(36,34,52),(50,50,72),(83,84,105),(239,225,191)],[(0,0,0),(5,2,3)])}
sheets={s:Image.new('RGBA',(672,252)) for s in ['body','outfit']}
composite=Image.new('RGBA',(672,252));records=[]
for row,d in enumerate(DIRECTIONS):
 source_row,bounds,colors,outline=CONFIG[d];x0,y0,x1,y1=bounds
 colors={(*c,255) for c in colors};outline={(*c,255) for c in outline}
 crop=(10,source_row*84+13,74,source_row*84+77)
 hair=rgba(BASE/'hair-idle.png').crop(crop);hair.save(HERE/f'hair-{d}.png')
 head=rgba(BASE/'body-idle.png').crop(crop).crop((0,0,64,18)).getbbox()
 for i in range(8):
  corrected=HERE/f'body-{d}-{i:02}-corrected.png';source=corrected if corrected.exists() else HERE/f'body-{d}-{i:02}.png'
  body=rgba(source);dressed=rgba(HERE/f'dressed-{d}-{i:02}.png');assert body.size==dressed.size==(64,64)
  assert body.crop((0,0,64,18)).getbbox()==head,'Hair attachment needs a new measured socket'
  selected={(x,y) for y in range(y0,y1) for x in range(x0,x1) if dressed.getpixel((x,y)) in colors}
  edge={(x+dx,y+dy) for x,y in selected for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)] if x0<=x+dx<x1 and y0<=y+dy<y1 and dressed.getpixel((x+dx,y+dy)) in outline}
  layer=Image.new('RGBA',(64,64))
  for pos in selected|edge:layer.putpixel(pos,dressed.getpixel(pos))
  assert selected and all(layer.getpixel(pos)==dressed.getpixel(pos) for pos in selected|edge)
  sheets['body'].paste(body,(i*84+10,row*84+13));sheets['outfit'].paste(layer,(i*84+10,row*84+13))
  look=body.copy();look.alpha_composite(layer);look.alpha_composite(hair);composite.paste(look,(i*84+10,row*84+13))
  records.append(dict(direction=d,frame=i,body_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),garment_pixels=len(selected|edge),garment_bounds=layer.getbbox(),head_bounds=head))
for slot,sheet in sheets.items():sheet.save(HERE/f'{slot}-punch.png')
composite.save(HERE/'composed-punch.png')
composite.resize((2016,756),Image.Resampling.NEAREST).save(HERE/'layers-inspection.png')
write('layer-audit.json',dict(status='inspection candidate, not production',body_unchanged=True,garment_source='PixelLab transfer_outfit; palette/region extraction, not a whole-image diff',hair_source='native navy-starter directional hair; stationary head bounds checked in each pose',frames=records,padding=[10,13],pivot=[42,65],excluded={'north':'Body arm direction is ambiguous; no clothing generated and no replacement pose synthesized.'}))
base=json.loads((BASE/'review-pack.json').read_text(encoding='utf-8'));rig=copy.deepcopy(base['rig']);rig['requiredSlots']=['body','hair','outfit'];rig['animations']={'attack-unarmed':copy.deepcopy(rig['animations']['attack-sword'])}
pieces=[]
for slot,z in [('body',0),('outfit',30),('hair',40)]:
 clip=dict(kind='sheet',url=f'{slot}-punch.png',frames=8,fps=12,loop=False,directions=DIRECTIONS,frameWidth=84,frameHeight=84,zIndex=z)
 if slot=='hair':clip.update(kind='rigid-attachment',url='hair-south.png',sources={d:dict(url=f'hair-{d}.png',width=64,height=64,anchorX=32,anchorY=52) for d in DIRECTIONS},sockets={d:[dict(x=42,y=65) for _ in range(8)] for d in DIRECTIONS})
 pieces.append(dict(id='punch-'+slot,rigId='human-v1',slot=slot,available=True,approved=False,animations={'attack-unarmed':clip}))
write('review-pack.json',dict(scope='layered-gesture-review',reviewOnly=True,productionEnabled=False,full_character_artwork_approved=False,classId='brawler',status='Three-direction punch study; north rejected, no gloves, not production approved',rig=rig,pieces=pieces,appearance=dict(rigId='human-v1',pieces={p['slot']:p['id'] for p in pieces})))
