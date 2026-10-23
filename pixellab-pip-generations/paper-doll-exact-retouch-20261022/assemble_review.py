"""Package draft north modular attack and exact-retouched bodies, with east fallback."""
import hashlib,json,shutil,sys
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
BASE=HERE.parent/'paper-doll-bento-directions-20261021'
sys.path.insert(0,str(BASE));from compose import save_gif,normalized
sys.path.insert(0,str(HERE));from verify_retouch import verify
from extract_north import main as extract_north
SLOTS=['body','pants','boots','outfit','hair','weapon']
DIRECTIONS=['south','north','west','east']
def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def write(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def frames(sheet):return [sheet.crop((i*84,0,(i+1)*84,84)) for i in range(8)]
def main():
 audit=verify();extract_north();base=read(BASE/'review-pack.json');ready=['south','north','west']
 pack={**base,'coverage':{'attack-sword':ready},'bodyCoverage':DIRECTIONS,'status':'Three-direction modular attack prototype; retouched east body only, east garments remain unavailable','pieces':[],'appearance':{'rigId':'human-v1','pieces':{}},'reviewOnly':True,'productionEnabled':False,'full_character_artwork_approved':False}
 source=Image.open(BASE/'reference-bento-attack.png').convert('RGBA');shutil.copy2(BASE/'reference-bento-attack.png',HERE/'reference-bento-attack.png')
 sheets={};inherited=[]
 for d in ['north','east']:
  after=Image.new('RGBA',(672,84));before=Image.new('RGBA',(672,84));padding=(10,13 if d=='north' else 9)
  for i in range(8):
   for name,sheet in [('body',after),('original',before)]:
    native=Image.open(HERE/d/f'{name}-{i:02}.png').convert('RGBA');cell=Image.new('RGBA',(84,84));cell.paste(native,padding);sheet.paste(cell,(i*84,0))
  after.save(HERE/f'body-candidate-{d}.png');before.save(HERE/f'body-before-{d}.png');save_gif(frames(after),HERE/f'body-{d}.gif')
  audit[d]['padding']=padding
 for d in ['south','west']:
  shutil.copy2(BASE/f'body-candidate-{d}.png',HERE/f'body-candidate-{d}.png');shutil.copy2(BASE/f'modular-{d}.gif',HERE/f'modular-{d}.gif')
 for z,slot in enumerate(SLOTS):
  origin=next(p for p in base['pieces'] if p['slot']==slot);clip=origin['animations']['attack-sword'];old=Image.open(BASE/clip['url']).convert('RGBA');n=Image.open(HERE/f'north-{slot}.png').convert('RGBA')
  result=Image.new('RGBA',(672,252))
  for row,d in enumerate(ready):
   if d=='north':cell=n
   else:
    oldrow=clip['directions'].index(d);cell=old.crop((0,oldrow*84,672,(oldrow+1)*84));inherited.append({'slot':slot,'direction':d,'sha256_rgba':hashlib.sha256(normalized(cell)).hexdigest()})
   result.paste(cell,(0,row*84))
  url=f'{slot}-attack.png';result.save(HERE/url);identity='bento-exact-'+slot
  newclip={**clip,'url':url,'directions':ready}
  if slot=='weapon':newclip['occludedFrames']={'north':[1,2,3,4,5]};newclip['directionOverrides']={'north':{'zIndex':-10,'offsetY':-1}}
  pack['pieces'].append({**origin,'id':identity,'available':True,'approved':False,'animations':{'attack-sword':newclip}});pack['appearance']['pieces'][slot]=identity
 pack['reviews']={**base['reviews'],'north':{'body_motion_gate_passed':True,'modular_fit_gate_passed':True,'artwork_approved':False,'summary_pt':'Norte: corpo retocado no PixelLab, seis camadas sincronizadas. Cinco frames de espada realmente encoberta; sem antebraço sobre as costas. Protótipo em revisão artística.'},'east':{'body_motion_gate_passed':True,'modular_fit_gate_passed':False,'artwork_approved':False,'summary_pt':'Leste: corpo retocado com apoio estável nos oito frames. A reconstrução da roupa/mão no frame6 não encaixou e continua reprovada; fallback completo.'}}
 write(HERE/'review-pack.json',pack);write(HERE/'reviews.json',pack['reviews'])
 # Compose through the declared metadata, independently compared with Canvas by the browser test.
 layers={p['slot']:(p,Image.open(HERE/p['animations']['attack-sword']['url']).convert('RGBA')) for p in pack['pieces']}
 composed=[]
 for i in range(8):
  output=Image.new('RGBA',(84,84));ordered=[]
  for slot,(piece,sheet) in layers.items():
   clip=piece['animations']['attack-sword'];row=clip['directions'].index('north');cell=sheet.crop((i*84,row*84,(i+1)*84,(row+1)*84));override=clip.get('directionOverrides',{}).get('north',{});moved=Image.new('RGBA',(84,84));moved.paste(cell,(override.get('offsetX',0),override.get('offsetY',0)));ordered.append((override.get('zIndex',piece['zIndex']),moved))
  for _,cell in sorted(ordered,key=lambda a:a[0]):output=Image.alpha_composite(output,cell)
  composed.append(output)
 save_gif(composed,HERE/'modular-north.gif')
 grip=[]
 weapon=Image.open(HERE/'north-weapon.png').convert('RGBA')
 for i in [0,6,7]:
  body=Image.open(HERE/'north'/f'body-{i:02}.png').convert('RGBA');cell=weapon.crop((i*84,0,(i+1)*84,84))
  skin=[(x,y) for x in range(38,49) for y in range(26,39) if (lambda q:q[3] and q[0]>q[1]>q[2] and q[0]>80)(body.getpixel((x,y)))]
  blade=[(x,y-1) for x in range(38,55) for y in range(26,45) if cell.getpixel((x+10,y+13))[3]]
  distance=min((max(abs(x-a),abs(y-b)) for x,y in skin for a,b in blade),default=99);assert distance==0
  grip.append({'frame':i,'skin_weapon_distance':distance,'note':'Auxiliary contact check in the inspected hand region, not artistic approval.'})
 audit['north_grip_proxy']=grip
 audit['inherited_layers']=inherited;audit['coverage']=ready;audit['production_enabled']=False;write(HERE/'assembly-audit.json',audit)
 print('Draft modular coverage:',ready,'; body coverage:',DIRECTIONS,'; east uses complete fallback.')
if __name__=='__main__':main()
