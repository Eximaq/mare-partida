from pathlib import Path
from PIL import Image
import json,copy,hashlib
p=Path('pixellab-pip-generations/paper-doll-unarmed-combat-20261024')
colors={(29,42,82,255),(22,28,60,255),(17,22,48,255),(237,228,199,255),(197,180,154,255),(173,150,129,255)}
outline={(7,5,7,255),(5,1,2,255),(2,2,6,255)}
sheets={s:Image.new('RGBA',(672,336)) for s in ['body','outfit']}
for s in sheets:sheets[s].paste(Image.open(p/f'{s}-punch.png').convert('RGBA').crop((0,0,672,252)),(0,0))
hair=Image.open(p/'hair-idle.png').convert('RGBA').crop((10,97,74,161));hair.save(p/'hair-north.png')
preview=Image.new('RGBA',(672,84));audit=[]
for i in range(8):
 body=Image.open(p/f'north-native-{i+1:02}.png').convert('RGBA');dress=Image.open(p/f'north-dressed-{i:02}.png').convert('RGBA');layer=Image.new('RGBA',(64,64))
 # Garment only, copied from native output; never reconstruct or repaint body pixels.
 selected={(x,y) for y in range(18,34) for x in range(18,44) if dress.getpixel((x,y)) in colors}
 edge={(x+dx,y+dy) for x,y in selected for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)] if 18<=x+dx<44 and 18<=y+dy<34 and dress.getpixel((x+dx,y+dy)) in outline}
 for xy in selected|edge:layer.putpixel(xy,dress.getpixel(xy))
 # All heads occupy the same native scalp rectangle; hands outside it are not head motion.
 assert body.crop((26,8,37,15)).getbbox()==Image.open(p/'body-north-reference.png').convert('RGBA').crop((26,8,37,15)).getbbox()
 sheets['body'].paste(body,(i*84+10,265));sheets['outfit'].paste(layer,(i*84+10,265))
 composed=body.copy();composed.alpha_composite(layer);composed.alpha_composite(hair);preview.paste(composed,(i*84+10,13))
 audit.append({'frame':i,'garment_pixels':len(selected|edge),'bounds':layer.getbbox(),'body_sha256':hashlib.sha256((p/f'north-native-{i+1:02}.png').read_bytes()).hexdigest()})
for s,im in sheets.items():im.save(p/f'{s}-punch.png')
preview.save(p/'north-composed.png');preview.resize((2016,252),Image.Resampling.NEAREST).save(p/'north-composed-inspection.png')
m=json.loads((p/'review-pack.json').read_text());m['coverage']['attack-unarmed']=['south','west','east','north']
for piece in m['pieces']:
 clip=piece['animations']['attack-unarmed'];clip['directions']=['south','west','east','north']
 if piece['slot']=='hair':clip['sources']['north']={'url':'hair-north.png','width':64,'height':64,'anchorX':32,'anchorY':52};clip['sockets']['north']=[{'x':42,'y':65} for _ in range(8)]
(p/'review-pack.json').write_text(json.dumps(m,indent=2)+'\n')
(p/'north-layer-audit.json').write_text(json.dumps({'frames':audit,'body_unchanged':True,'hair':'native north idle; rigid head attachment','padding':[10,13],'status':'draft requiring artistic approval'},indent=2))

