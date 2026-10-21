"""Atlas diagnostic: verify failed gate remains explicit and source pixels survive."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
REL='pixellab-pip-generations/paper-doll-layer-batch-20261021/'
OUT=ROOT/'docs/evidence-paper-doll'
OUT.mkdir(exist_ok=True)
COMPARE='''async ({url,canvas,sx=0,padded=false})=>{
 const image=new Image();image.src=url;await image.decode();
 const c=document.createElement('canvas');c.width=c.height=84;
 if(padded)c.getContext('2d').drawImage(image,10,13);
 else c.getContext('2d').drawImage(image,sx,0,84,84,0,0,84,84);
 const a=c.getContext('2d').getImageData(0,0,84,84).data;
 const b=document.getElementById(canvas).getContext('2d').getImageData(0,0,84,84).data;
 for(let i=0;i<a.length;i+=4)if(a[i+3]!==b[i+3]||(a[i+3]&&(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])))return false;
 return true;
}'''
with sync_playwright() as p:
 b=p.chromium.launch();context=b.new_context(viewport={'width':1366,'height':900})
 context.add_init_script('localStorage.setItem("mare-partida-save-v1","batch-review-sentinel")')
 q=context.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.clock.install();q.goto(BASE+REL+'preview.html',wait_until='networkidle')
 q.wait_for_function('window.__paperDollBatchInspection?.().ready')
 for i in range(4):
  q.locator('#frame').fill(str(i));s=q.evaluate('__paperDollBatchInspection()')
  assert s['frameIndex']==i and not s['artworkApproved']
  assert s['scope']=='diagnostic body and weapon only'
  assert s['gateFailed'] and s['notGenerated']==['hair','outfit']
  assert s['chargedGenerations']==6
  assert s['audit']['passed'] and s['audit']['changed_body_pixels']==0
  assert s['audit']['unprotected_body_pixels']==0
  assert s['audit']['outside_mask_pixels']==0 and s['audit']['hand_contact_pixels']>0
  assert q.evaluate(COMPARE,{'url':f'composite-{i+1:02}.png','canvas':'newCanvas','padded':True})
  assert q.evaluate(COMPARE,{'url':f'body-source-{i+1:02}.png','canvas':'bodyCanvas','padded':True})
  q.locator('#showWeapon').uncheck()
  assert q.evaluate(COMPARE,{'url':'body-idle-south.png','canvas':'newCanvas','sx':i*84})
  q.locator('#showWeapon').check()
 q.locator('#frame').fill('0');q.locator('#play').click()
 for expected in [1,2,3,0]:
  # Sample inside each frame, not at the 250ms requestAnimationFrame boundary.
  q.clock.run_for(300)
  assert q.evaluate('__paperDollBatchInspection().frameIndex')==expected, (expected,q.evaluate('__paperDollBatchInspection()'))
 q.locator('#play').click();q.locator('#guides').check()
 q.screenshot(path=str(OUT/'layer-batch-1366.png'),full_page=True)
 q.set_viewport_size({'width':393,'height':852})
 assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 q.screenshot(path=str(OUT/'layer-batch-393.png'),full_page=True)
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='batch-review-sentinel'
 assert not errors,errors;b.close()
print('Atlas diagnostic browser passed: four native frames, contact and exact RGBA, explicit failed artistic gate, dependent calls not generated, controls, desktop/mobile and save preservation.')
