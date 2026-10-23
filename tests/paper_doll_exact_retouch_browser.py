"""Independent real-pixel and browser checks for the exact-retouched attack pack."""
import base64,itertools,json,os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];REL='pixellab-pip-generations/paper-doll-exact-retouch-20261022/';FOLDER=ROOT/REL
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/');OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
pack=json.loads((FOLDER/'review-pack.json').read_text());ready=pack['coverage']['attack-sword'];DIRECTIONS=['south','north','west','east'];source=Image.open(FOLDER/'reference-bento-attack.png').convert('RGBA')
def rgba(im):return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
images={p['slot']:(p,Image.open(FOLDER/p['animations']['attack-sword']['url']).convert('RGBA')) for p in pack['pieces']}
def expected(direction,index,hidden=()):
 if direction not in ready:return rgba(source.crop((index*84,DIRECTIONS.index(direction)*84,(index+1)*84,(DIRECTIONS.index(direction)+1)*84)))
 layers=[]
 for slot,(piece,sheet) in images.items():
  if slot in hidden:continue
  clip=piece['animations']['attack-sword'];override={**clip.get('directionOverrides',{}).get(direction,{}),**clip.get('poseOverrides',{}).get(direction,[{}]*8)[index]};row=clip['directions'].index(direction)
  native=sheet.crop((index*84,row*84,(index+1)*84,(row+1)*84));cell=Image.new('RGBA',(84,84));cell.paste(native,(override.get('offsetX',clip.get('offsetX',0)),override.get('offsetY',clip.get('offsetY',0))))
  layers.append((override.get('zIndex',piece['zIndex']),cell))
 out=Image.new('RGBA',(84,84))
 for _,layer in sorted(layers,key=lambda a:a[0]):out=Image.alpha_composite(out,layer)
 return rgba(out)
for direction in ready:
 with Image.open(FOLDER/f'modular-{direction}.gif') as gif:
  assert gif.n_frames==8 and gif.info['loop']==0
  for i in range(8):gif.seek(i);assert rgba(gif.convert('RGBA'))==expected(direction,i)
weapon=images['weapon'][1];row=ready.index('north')
for i in range(8):assert bool(weapon.crop((i*84,row*84,(i+1)*84,(row+1)*84)).getbbox())==(i in [0,6,7])
for slot,(_,sheet) in images.items():
 if slot=='body':continue
 for i in range(8):
  cell=sheet.crop((i*84,row*84,(i+1)*84,(row+1)*84));src=source.crop((i*84,84,(i+1)*84,168));assert all(not c[3] or c==s for c,s in zip(cell.get_flattened_data(),src.get_flattened_data()))
with sync_playwright() as p:
 browser=p.chromium.launch();context=browser.new_context(viewport={'width':1366,'height':1000});context.add_init_script('localStorage.setItem("mare-partida-save-v1","exact-retouch-sentinel")');q=context.new_page();q.clock.install();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.goto(BASE+REL+'preview.html',wait_until='networkidle');q.wait_for_function('__directionalDoll?.().ready')
 def actual(canvas):return base64.b64decode(q.evaluate('(id)=>btoa(String.fromCharCode(...document.getElementById(id).getContext("2d").getImageData(0,0,84,84).data))',canvas))
 for direction in DIRECTIONS:
  q.locator('#direction').select_option(direction)
  for i in range(8):
   q.locator('#frame').fill(str(i));state=q.evaluate('__directionalDoll()');assert state['mode']==('modular' if direction in ready else 'fallback');assert not state['productionEnabled'] and not state['artworkApproved'];assert actual('modular')==expected(direction,i)
  q.locator('#frame').fill('3');q.screenshot(path=str(OUT/f'exact-{direction}-1366.png'),full_page=True)
 for direction in ['north','east']:
  q.locator('#direction').select_option(direction);before=Image.open(FOLDER/f'body-before-{direction}.png').convert('RGBA');after=Image.open(FOLDER/f'body-candidate-{direction}.png').convert('RGBA')
  for i in range(8):
   q.locator('#frame').fill(str(i));q.locator('#beforeBody').check();assert actual('body')==rgba(before.crop((i*84,0,(i+1)*84,84)));assert actual('modular')==expected(direction,i)
   q.locator('#beforeBody').uncheck();assert actual('body')==rgba(after.crop((i*84,0,(i+1)*84,84)))
 q.locator('#direction').select_option('north');q.locator('#frame').fill('3')
 for visible in itertools.product([False,True],repeat=5):
  hidden=[]
  for slot,value in zip(['hair','outfit','pants','boots','weapon'],visible):
   q.locator(f'[data-layer={slot}]').set_checked(value)
   if not value:hidden.append(slot)
  assert actual('modular')==expected('north',3,hidden)
 for slot in ['hair','outfit','pants','boots','weapon']:q.locator(f'[data-layer={slot}]').check()
 q.locator('#frame').fill('0');with_weapon=actual('modular');q.locator('[data-layer=weapon]').uncheck();assert actual('modular')!=with_weapon;q.locator('[data-layer=weapon]').check()
 q.locator('#frame').fill('7');q.locator('#play').click();q.clock.run_for(800);assert q.evaluate('__directionalDoll().frameIndex')==7 and not q.evaluate('__directionalDoll().playing')
 q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth');q.screenshot(path=str(OUT/'exact-north-393.png'),full_page=True)
 q.locator('#direction').select_option('east');assert q.locator('[data-layer]:disabled').count()==5;q.screenshot(path=str(OUT/'exact-east-393.png'),full_page=True)
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='exact-retouch-sentinel';assert not errors,errors;browser.close()
print('Exact-retouch Chromium:24 modular +8 fallback poses, north source fidelity and real weapon occlusion,32 combinations,16 before/after bodies, one-shot playback, mobile and save isolation passed.')
