"""Independent native-source comparisons for each approved profile walk pose."""
import base64,json,os,hashlib
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];REL='pixellab-pip-generations/paper-doll-walk-profiles-20261021/';FOLDER=ROOT/REL;NORTH=FOLDER.parent/'paper-doll-north-finish-20261021'
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/');OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
pack=json.loads((FOLDER/'review-pack.json').read_text());directions=[d for d in pack['coverage']['walk'] if d in ['west','east']];weapon=next(p for p in pack['pieces'] if p['slot']=='weapon')['animations']['walk']
def normalized(im):return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
def expected(direction,index):
 body=Image.new('RGBA',(84,84));body.paste(Image.open(FOLDER/f'body-{direction}-raw-{index+1:02}.png').convert('RGBA'),(10,10))
 source=weapon['sources'][direction];socket=weapon['sockets'][direction][index];sword=Image.new('RGBA',(84,84));sword.paste(Image.open(FOLDER/source['url']).convert('RGBA'),(socket['x']-source['anchorX'],socket['y']-source['anchorY']))
 frame=body
 for slot in ['outfit','hair']:
  layer=Image.new('RGBA',(84,84));layer.paste(Image.open(FOLDER/f'{slot}-{direction}/frame-{index+1:02}.png').convert('RGBA'),(26,10));frame=Image.alpha_composite(frame,layer)
 frame=Image.alpha_composite(frame,sword)
 return normalized(frame)
assert directions,'No inspected profile layers; do not claim profile completion'
assert all(not p['approved'] for p in pack['pieces'])
combined=json.loads((FOLDER/'assembly-audit.json').read_text())['gif_palette_colors']['combined']
if isinstance(combined,dict):assert not (FOLDER/'walk-views.gif').exists(),'Do not publish a stale partial GIF as the full preview'
for slot in ['body','hair','outfit']:
 with Image.open(FOLDER/f'{slot}-walk.png') as current,Image.open(NORTH/f'{slot}-walk.png') as old:assert normalized(current.crop((0,0,672,168)))==normalized(old)
 assert (FOLDER/f'{slot}-idle.png').read_bytes()==(NORTH/f'{slot}-idle.png').read_bytes()
for direction in directions:
 receipt=json.loads((FOLDER/f'body-{direction}-job.json').read_text())
 for name,sha in receipt['sha256'].items():assert hashlib.sha256((FOLDER/name).read_bytes()).hexdigest()==sha
 with Image.open(FOLDER/f'walk-{direction}.gif') as gif:
  assert gif.n_frames==8 and gif.info['loop']==0
  for i in range(8):gif.seek(i);assert normalized(gif.convert('RGBA'))==expected(direction,i)
with sync_playwright() as p:
 browser=p.chromium.launch();context=browser.new_context(viewport={'width':1366,'height':1000});context.add_init_script('localStorage.setItem("mare-partida-save-v1","profile-sentinel")');page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+REL+'preview.html',wait_until='networkidle');page.wait_for_function('window.__paperDollWalk?.().ready')
 for i in range(8):
  page.locator('#frame').fill(str(i))
  for direction in directions:
   raw=page.evaluate('d=>btoa(String.fromCharCode(...document.getElementById(d+"-full").getContext("2d").getImageData(0,0,84,84).data))',direction);assert base64.b64decode(raw)==expected(direction,i)
  page.locator('#boards').screenshot(path=str(OUT/f'profiles-frame-{i+1}.png'))
 page.screenshot(path=str(OUT/'profiles-1366.png'),full_page=True);page.set_viewport_size({'width':393,'height':852});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(OUT/'profiles-393.png'),full_page=True)
 assert page.evaluate('localStorage.getItem("mare-partida-save-v1")')=='profile-sentinel';assert not errors,errors;browser.close()
print('Profile walk:',directions,'eight native poses each match independent body/layer/socket composition and decoded GIF; earlier views, mobile and saves preserved.')
