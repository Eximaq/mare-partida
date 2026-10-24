"""Real generated layers, frame sync, native composition, fallback and mobile."""
import base64, io, os
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
URL=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8126/dist/')
ART=ROOT/'pixellab-pip-generations/paper-doll-category-attacks-20261023'
OUT=ROOT/'docs/evidence-paper-doll/punch';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch();page=b.new_page(viewport={'width':1366,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL+'tools/paper-doll-inspector/index.html?pack=punch',wait_until='networkidle')
 page.wait_for_function('__paperDollInspector.state().readyDirections.length===3')
 page.evaluate('localStorage.setItem("mare-partida-save-v1","punch-sentinel")')
 page.locator('#animation').select_option('attack');page.locator('#pivots').uncheck()
 page.locator('#zoom').select_option('3')
 atlas=Image.open(ART/'composed-punch.png').convert('RGBA')
 for row,d in enumerate(['south','west','east']):
  page.locator('#direction').select_option(d)
  for frame in range(8):
   page.locator('#frame').fill(str(frame));state=page.evaluate('__paperDollInspector.state()')
   assert state['readyDirections']==[d] and not state['missing'],state
   assert state['pose']=={'animationId':'attack-unarmed','frameIndex':frame}
   assert not state['artworkValidated'] and state['profile']['category']=='unarmed'
   encoded=page.locator(f'[data-direction="{d}"] canvas').nth(1).evaluate('(c)=>c.toDataURL().split(",")[1]')
   rendered=Image.open(io.BytesIO(base64.b64decode(encoded))).convert('RGBA')
   expected=Image.new('RGBA',(300,300));native=atlas.crop((frame*84,row*84,(frame+1)*84,(row+1)*84))
   expected.paste(native.resize((252,252),Image.Resampling.NEAREST),(24,45))
   assert ImageChops.difference(rendered,expected).getbbox(alpha_only=False) is None,(d,frame,'native composition differs')
  page.locator('#frame').fill('3');page.screenshot(path=str(OUT/f'{d}.png'),full_page=True)
 page.locator('[data-layer="outfit"]').uncheck()
 assert 'outfit' in page.evaluate('__paperDollInspector.state().hidden')
 page.locator('#resetLayers').click();page.locator('#direction').select_option('north')
 state=page.evaluate('__paperDollInspector.state()');assert state['mode']=='fallback' and state['readyDirections']==[]
 assert all(m['code']=='missing-direction' for m in state['missing'])
 assert all(d['pixels']==0 for d in state['differences'])
 page.locator('#animation').select_option('walk')
 assert page.evaluate('__paperDollInspector.state().mode')=='fallback'
 page.locator('#animation').select_option('attack');page.locator('#direction').select_option('east')
 page.locator('#play').click();page.wait_for_function('__paperDollInspector.state().playback.finished')
 assert page.evaluate('__paperDollInspector.state().pose.frameIndex')==7
 assert page.evaluate('localStorage.getItem("mare-partida-save-v1")')=='punch-sentinel'
 page.set_viewport_size({'width':393,'height':851});page.screenshot(path=str(OUT/'mobile.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 assert not errors,errors
 b.close()
print('Punch browser passed: 24 native compositions, separate layers, directional fallback, once playback, mobile, save untouched.')
