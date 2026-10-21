"""Inspect actual rejected art without registering it as a valid modular character."""
import base64,json,os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
REL='pixellab-pip-generations/paper-doll-walk-north-20261021/'
FOLDER=ROOT/REL;BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
pack=json.loads((FOLDER/'review-pack.json').read_text());sockets=next(p for p in pack['pieces'] if p['slot']=='weapon')['animations']['walk']['sockets']['north']
def normalized(im):return bytes(v for c in im.get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
def expected(index,hair=False):
 frame=Image.new('RGBA',(84,84));s=sockets[index];frame.paste(Image.open(FOLDER/'weapon-north.png').convert('RGBA'),(s['x']-42,s['y']-35))
 body=Image.new('RGBA',(84,84));body.paste(Image.open(FOLDER/f'body-raw-{index+1:02}.png').convert('RGBA'),(10,13));frame=Image.alpha_composite(frame,body)
 if hair:
  layer=Image.new('RGBA',(84,84));layer.paste(Image.open(FOLDER/'hair'/f'frame-{index+1:02}.png').convert('RGBA'),(26,17));frame=Image.alpha_composite(frame,layer)
 return normalized(frame)
with sync_playwright() as p:
 browser=p.chromium.launch();c=browser.new_context(viewport={'width':1366,'height':1000})
 c.add_init_script('localStorage.setItem("mare-partida-save-v1","north-study-sentinel")')
 q=c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install()
 q.goto(BASE+REL+'preview.html',wait_until='networkidle');q.wait_for_function('window.__paperDollNorthStudy?.().ready')
 if '/dist/' in BASE:assert '?v=' in q.locator('script[src*="study-review.js"]').get_attribute('src')
 for frame in range(8):
  q.locator('#studyFrame').fill(str(frame));state=q.evaluate('__paperDollNorthStudy()');assert state['frameIndex']==frame and not state['hairApproved'] and not state['outfitGenerated'] and not state['productionEnabled']
  for canvas,hair in [('studyBody',False),('studyHair',True)]:
   raw=q.evaluate('''id=>{const a=document.getElementById(id).getContext('2d').getImageData(0,0,84,84).data;return btoa(String.fromCharCode(...a));}''',canvas)
   assert base64.b64decode(raw)==expected(frame,hair),[frame,canvas]
  q.locator('#studyBody').screenshot(path=str(OUT/f'north-study-body-{frame+1}.png'))
 q.locator('#studyFrame').fill('0');q.locator('#studyPlay').click();q.clock.run_for(25)
 for frame in range(1,9):q.clock.run_for(125);assert q.evaluate('__paperDollNorthStudy().frameIndex')==frame%8
 q.locator('#studyPlay').click();q.screenshot(path=str(OUT/'north-study-1366.png'),full_page=True)
 q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth');q.screenshot(path=str(OUT/'north-study-393.png'),full_page=True)
 q.goto(BASE+'tools/paper-doll-inspector/index.html?pack=walk-north',wait_until='networkidle');q.wait_for_function('window.__paperDollInspector?.state().readyDirections?.length===4')
 q.locator('#animation').select_option('walk');q.locator('#direction').select_option('north')
 for frame in range(8):
  q.locator('#frame').fill(str(frame));s=q.evaluate('__paperDollInspector.state()')
  assert s['mode']=='fallback' and s['readyDirections']==[] and all(d['pixels']==0 for d in s['differences']),s
  assert {m['slot'] for m in s['missing']}=={'hair','outfit'},s['missing']
 q.locator('#direction').select_option('south');s=q.evaluate('__paperDollInspector.state()');assert s['mode']=='draft' and s['readyDirections']==['south']
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='north-study-sentinel'
 assert not errors,errors;browser.close()
print('North study passed:8 native body/grip poses and untouched rejected hair, lossless independent RGBA, playback, mobile; all8 north poses use atomic fallback, south remains valid and save preserved.')
