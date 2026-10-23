"""Extract exact PixelLab edits as draft layers; never paint local sprite pixels."""
import hashlib,json,shutil,sys
from pathlib import Path
from PIL import Image,ImageDraw

HERE=Path(__file__).resolve().parent
PREVIOUS=HERE.parent/'paper-doll-exact-retouch-20261022'
sys.path.insert(0,str(PREVIOUS.parent/'paper-doll-bento-directions-20261021'))
from compose import normalized,save_gif
from extract_visible_pieces import select

SLOTS=['body','pants','boots','outfit','hair','weapon']
DIRECTIONS=['south','north','west','east']
WEAPON_OFFSETS=[(1,-3),(-2,-1),(1,0),(6,-1),(3,-1),(19,-6),(3,4),(3,-2)]
WEAPON_REGIONS=[
 [(28,38),(36,38),(49,52),(47,55),(28,44)],
 [(34,33),(40,33),(40,36),(56,36),(56,42),(34,43)],
 [(35,28),(49,17),(55,17),(55,22),(43,34),(38,35)],
 [(26,29),(37,14),(42,14),(42,20),(33,36),(28,36)],
 [(12,15),(18,15),(22,32),(24,35),(17,37),(14,29)],
 [(17,34),(39,34),(39,40),(17,41)],
 [(17,34),(39,34),(39,40),(17,41)],
 [(22,37),(30,37),(41,51),(40,55),(23,43)]]
GOLD_REGIONS=[(30,38,35,44),(37,34,38,42),(38,30,42,34),(29,31,34,35),
              (17,30,21,35),(18,35,24,40),(18,35,24,40),(24,39,28,44)]

def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def write(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(im):return hashlib.sha256(normalized(im)).hexdigest()
def grid_frames(path):
 im=Image.open(path).convert('RGBA');assert im.size==(192,192)
 assert not im.crop((128,128,192,192)).getbbox()
 return [im.crop(((i%3)*64,(i//3)*64,(i%3+1)*64,(i//3+1)*64)) for i in range(8)]
def polygon(points):
 im=Image.new('1',(64,64));ImageDraw.Draw(im).polygon(points,fill=1);return im
def padded(im,offset=(10,9)):
 out=Image.new('RGBA',(84,84));out.paste(im,offset);return out

def verify_cloud():
 raw=grid_frames(HERE/'body-source-frames.png');fitted=grid_frames(HERE/'fitted-frames.png')
 source=grid_frames(HERE/'source-frames.png');donor=grid_frames(HERE/'donor-frames.png')
 masks=read(HERE/'fitted-masks.json');records=[]
 with Image.open(HERE/'fitted-animation.gif') as gif:
  assert gif.n_frames==8
  for i in range(8):
   gif.seek(i);assert normalized(gif.convert('RGBA'))==normalized(fitted[i])
 for i,(before,after) in enumerate(zip(raw,fitted)):
  assert normalized(before)==normalized(Image.open(PREVIOUS/'east'/f'body-{i:02}.png'))
  assert before.getchannel('A').tobytes()==after.getchannel('A').tobytes()
  torso=polygon(masks['torsos'][i]);arm=polygon(masks['protectedArms'][i]);counts={'outfit':0,'pants':0,'boots':0}
  for y in range(64):
   for x in range(64):
    a,b=before.getpixel((x,y)),after.getpixel((x,y))
    if a==b:continue
    if y>=46:slot='boots'
    elif y>=36 and a[2]>a[0] and a[2]>a[1]:slot='pants'
    else:
     slot='outfit';assert torso.getpixel((x,y)) and not arm.getpixel((x,y)),(i,x,y,'arm/torso protection')
    assert a[3]==b[3]==255;counts[slot]+=1
  assert min(counts.values())>0
  assert before.crop((0,0,64,22)).tobytes()==after.crop((0,0,64,22)).tobytes()
  records.append({'frame':i,'changed_pixels':counts,'alpha_unchanged':True,'protected_arm_unchanged':True,
                  'body_sha256_rgba':digest(before),'fitted_sha256_rgba':digest(after)})
 # Donor edits are limited to frame6 and two declared surface rectangles. Never used as body motion.
 for i in range(8):
  for y in range(64):
   for x in range(64):
    if source[i].getpixel((x,y))!=donor[i].getpixel((x,y)):
     assert i==5 and (21<=x<=41 and 8<=y<=25 or 22<=x<=41 and 22<=y<=42)
 return raw,fitted,source,donor,records

def main():
 raw,fitted,source,donor,records=verify_cloud();old=read(PREVIOUS/'review-pack.json')
 pack={**old,'coverage':{'attack-sword':DIRECTIONS},'status':'Four-direction sword attack fitting study; final artwork unapproved',
       'pieces':[],'appearance':{'rigId':'human-v1','pieces':{}},'productionEnabled':False,'full_character_artwork_approved':False}
 east={slot:Image.new('RGBA',(672,84)) for slot in SLOTS};layer_audit=[];contacts=[]
 for i in range(8):
  parts={slot:Image.new('RGBA',(64,64)) for slot in SLOTS};parts['body']=raw[i]
  for y in range(64):
   for x in range(64):
    a,b=raw[i].getpixel((x,y)),fitted[i].getpixel((x,y))
    if a==b:continue
    slot='boots' if y>=46 else 'pants' if y>=36 and a[2]>a[0] and a[2]>a[1] else 'outfit'
    parts[slot].putpixel((x,y),b) # Copy returned pixels only, no local painting/recolouring.
  # The adjacent head is stationary during the flash. Reuse only its visible hair surface,
  # not its face, limbs, body frame or timing. The cloud donor remains an archived alternative.
  hair_source=source[4 if i==5 else i]
  parts['hair']=select(hair_source,lambda r,g,b:max(r,g,b)<=55 or (g>r*1.4 and b>r*1.4),
      [(20,7),(41,7),(41,17),(34,17),(32,16),(29,18),(28,22),(21,26),(18,26),(18,21),(23,17)])
  weapon_source=source[6 if i==5 else i]
  blade=select(weapon_source,lambda r,g,b:max(r,g,b)-min(r,g,b)<25 and max(r,g,b)>75,WEAPON_REGIONS[i])
  x0,y0,x1,y1=GOLD_REGIONS[i]
  hilt=select(weapon_source,lambda r,g,b:r>70 and r*.65<=g<=r*.95 and b<g*.8 and g<150,
              [(x0,y0),(x1,y0),(x1,y1),(x0,y1)])
  parts['weapon']=Image.alpha_composite(blade,hilt)
  if i in [5,6]:
   # The existing horizontal grip is black. A colour-only gold selector dropped its middle.
   # Select its original pixels explicitly; no local fill or invented handle pixels.
   grip=select(weapon_source,lambda r,g,b:max(r,g,b)<=12,
               [(18,36),(26,36),(26,39),(18,39)])
   parts['weapon']=Image.alpha_composite(parts['weapon'],grip)
  for slot,image in parts.items():
   offset=(10,10) if slot in ['hair','weapon'] else (10,9)
   east[slot].paste(padded(image,offset),(84*i,0))
   assert image.getbbox(),(slot,i)
   layer_audit.append({'frame':i,'slot':slot,'pixels':sum(q[3]>0 for q in image.get_flattened_data()),
       'source':'retouched body' if slot=='body' else 'PixelLab fitted edit' if slot in ['outfit','pants','boots'] else f'original Bento pose {4 if i==5 else i}' if slot=='hair' else f'original Bento pose {6 if i==5 else i}',
       'sha256_rgba':digest(image)})
  hx,hy=[(33,39),(34,37),(41,34),(38,31),(23,32),(42,31),(25,41),(29,40)][i]
  skin=[(x,y) for y in range(hy-2,hy+3) for x in range(hx-2,hx+3)
        if (lambda q:q[3] and q[0]>90 and q[0]>q[1]>q[2])(raw[i].getpixel((x,y)))]
  dx,dy=WEAPON_OFFSETS[i]
  weapon=[(x+dx,y+dy+1) for y in range(64) for x in range(64) if parts['weapon'].getpixel((x,y))[3]]
  distance=min((max(abs(x-a),abs(y-b)) for x,y in skin for a,b in weapon),default=99)
  assert distance<=1,('Grip calibration',i,distance)
  contacts.append({'frame':i,'hand_center':[hx,hy],'distance':distance,'note':'Auxiliary geometric check, not artistic approval.'})
 for slot in SLOTS:
  origin=next(p for p in old['pieces'] if p['slot']==slot);clip=origin['animations']['attack-sword']
  previous=Image.open(PREVIOUS/clip['url']).convert('RGBA');assert previous.size==(672,252)
  sheet=Image.new('RGBA',(672,336));sheet.paste(previous,(0,0));sheet.paste(east[slot],(0,252));sheet.save(HERE/f'{slot}-attack.png')
  newclip={**clip,'url':f'{slot}-attack.png','directions':DIRECTIONS}
  if slot=='weapon':newclip['poseOverrides']={**clip.get('poseOverrides',{}),'east':[{'offsetX':dx,'offsetY':dy} for dx,dy in WEAPON_OFFSETS]}
  id='bento-east-fit-'+slot;pack['pieces'].append({**origin,'id':id,'available':True,'approved':False,'animations':{'attack-sword':newclip}});pack['appearance']['pieces'][slot]=id
  east[slot].save(HERE/f'east-{slot}.png')
 for d in DIRECTIONS:
  shutil.copy2(PREVIOUS/f'body-candidate-{d}.png',HERE/f'body-candidate-{d}.png')
 for d in ['north','east']:shutil.copy2(PREVIOUS/f'body-before-{d}.png',HERE/f'body-before-{d}.png')
 shutil.copy2(PREVIOUS/'reference-bento-attack.png',HERE/'reference-bento-attack.png')
 for d in ['south','north','west']:shutil.copy2(PREVIOUS/f'modular-{d}.gif',HERE/f'modular-{d}.gif')
 for d in ['north','east']:shutil.copy2(PREVIOUS/f'body-{d}.gif',HERE/f'body-{d}.gif')
 composites=[]
 for i in range(8):
  layers=[]
  for p in pack['pieces']:
   clip=p['animations']['attack-sword'];cell=east[p['slot']].crop((84*i,0,84*(i+1),84));offset=clip.get('poseOverrides',{}).get('east',[{}]*8)[i]
   moved=Image.new('RGBA',(84,84));moved.paste(cell,(offset.get('offsetX',0),offset.get('offsetY',0)))
   assert sum(q[3]>0 for q in moved.get_flattened_data())==sum(q[3]>0 for q in cell.get_flattened_data()),'Offset clips pixels'
   layers.append((p['zIndex'],moved))
  out=Image.new('RGBA',(84,84))
  for _,cell in sorted(layers,key=lambda q:q[0]):out=Image.alpha_composite(out,cell)
  composites.append(out)
 save_gif(composites,HERE/'modular-east.gif')
 contact=Image.new('RGBA',(672,84))
 for i,cell in enumerate(composites):contact.paste(cell,(84*i,0))
 contact.save(HERE/'east-composite.png')
 pack['reviews']={**old['reviews'],'east':{'body_motion_gate_passed':True,'modular_fit_gate_passed':False,'artwork_approved':False,
       'summary_pt':'Leste em estudo de encaixe: roupa, calças e botas ajustadas no Workbench às oito poses reais; cabelo e espada reutilizam pixels do Bento. Arte final não aprovada, sem ativação no jogo.'}}
 write(HERE/'review-pack.json',pack);write(HERE/'reviews.json',pack['reviews']);write(HERE/'fit-audit.json',{'frames':records,'layers':layer_audit,'hand_contact':contacts,'production_enabled':False,'artwork_approved':False})
 print('Packaged four-direction fitting study, all artwork unapproved. Inspect all eight east poses before accepting fit.')

if __name__=='__main__':main()
