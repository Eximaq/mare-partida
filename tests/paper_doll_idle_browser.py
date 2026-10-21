"""Real generated pilot: verifies review rendering, not artistic acceptance."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
REL='pixellab-pip-generations/paper-doll-human-idle-south-20261021/'
OUT=ROOT/'docs/evidence-paper-doll'
OUT.mkdir(exist_ok=True)
COMPARE='''async ({url,canvas,sx=0})=>{
 const im=new Image();im.src=url;await im.decode();
 const c=document.createElement('canvas');c.width=c.height=84;
 c.getContext('2d').drawImage(im,sx,0,84,84,0,0,84,84);
 const a=c.getContext('2d').getImageData(0,0,84,84).data;
 const b=document.getElementById(canvas).getContext('2d').getImageData(0,0,84,84).data;
 for(let i=0;i<a.length;i+=4)if(a[i+3]!==b[i+3]||(a[i+3]&&(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])))return false;
 return true;
}'''
with sync_playwright() as p:
 b=p.chromium.launch();c=b.new_context(viewport={'width':1366,'height':900})
 c.add_init_script('localStorage.setItem("mare-partida-save-v1","idle-review-sentinel")')
 q=c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.clock.install();q.goto(BASE+REL+'preview.html',wait_until='networkidle')
 q.wait_for_function('window.__paperDollIdleInspection?.().ready')
 for i in range(4):
  q.locator('#frame').fill(str(i))
  assert q.evaluate(COMPARE,{'url':f'draft-composite-{i+1:02}.png','canvas':'draftCanvas'})
  assert q.evaluate(COMPARE,{'url':'body-idle-draft.png','canvas':'bodyCanvas','sx':i*84})
  s=q.evaluate('__paperDollIdleInspection()');assert not s['artworkApproved'] and not s['fitAccepted']
 for slot in ['hair','outfit','weapon']:q.locator(f'[data-slot={slot}]').uncheck()
 assert q.evaluate(COMPARE,{'url':'body-idle-draft.png','canvas':'draftCanvas','sx':252})
 for slot in ['hair','outfit','weapon']:q.locator(f'[data-slot={slot}]').check()
 q.locator('#play').click();q.clock.run_for(300)
 assert q.evaluate('__paperDollIdleInspection().frameIndex')==0
 q.locator('#play').click();q.locator('#pivots').check()
 q.screenshot(path=str(OUT/'idle-real-review-1366.png'),full_page=True)
 q.set_viewport_size({'width':393,'height':852})
 assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 q.screenshot(path=str(OUT/'idle-real-review-393.png'),full_page=True)
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='idle-review-sentinel'
 # Import the actual four native sheets into the existing workbench.
 folder=ROOT/REL
 files=[str(folder/name) for name in ['review-pack.json','body-idle-draft.png',
       'hair-idle-draft.png','outfit-idle-draft.png','weapon-idle-draft.png']]
 q.goto(BASE+'tools/paper-doll-inspector/index.html',wait_until='networkidle')
 q.locator('#importPanel > summary').click();q.locator('#importPack').set_input_files(files)
 q.wait_for_function('__paperDollInspector.state().mode==="partial-draft"')
 for i in range(4):
  q.locator('#frame').fill(str(i));s=q.evaluate('__paperDollInspector.state()')
  assert s['readyDirections']==['south'] and not s['artworkValidated']
 for action in ['walk','attack']:
  q.locator('#animation').select_option(action)
  assert q.evaluate('__paperDollInspector.state().mode')=='fallback'
 assert not errors,errors;b.close()
print('Real pilot passed technical review: four generated frames, exact draft RGBA, layer controls, loop, pivots, desktop/mobile, actual-pack import, fallback and isolated save. Artistic fit remains rejected.')
