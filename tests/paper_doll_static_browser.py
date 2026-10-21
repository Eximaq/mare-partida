"""Review-only static pilot; checks pixel composition, never animation/art approval."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
URL=os.environ.get('MARE_PAPER_DOLL_PILOT_URL','http://127.0.0.1:8123/pixellab-pip-generations/paper-doll-human-pilot-20261020/preview.html')
COMPARE='''async file=>{
 const image=new Image();image.src=file;await image.decode();
 const expected=document.createElement('canvas');expected.width=84;expected.height=84;
 expected.getContext('2d').drawImage(image,0,0);
 const a=expected.getContext('2d').getImageData(0,0,84,84).data,
 b=document.querySelector('#staticCanvas').getContext('2d').getImageData(0,0,84,84).data;
 let changed=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changed++;return changed;
}'''

with sync_playwright() as p:
 browser=p.chromium.launch();context=browser.new_context(viewport={'width':1366,'height':900})
 context.add_init_script('localStorage.setItem("mare-partida-save-v1","inspection-sentinel")')
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL,wait_until='networkidle');page.wait_for_function('window.__paperDollStaticInspection?.().ready')
 assert page.evaluate(COMPARE,'combined-masked-inspection.png')==0
 for slot in ['hair','outfit','weapon']:
  page.locator('[data-slot='+slot+']').uncheck()
  assert page.evaluate(COMPARE,'combined-masked-inspection.png')>0
  page.locator('[data-slot='+slot+']').check()
 for slot in ['hair','outfit','weapon']:page.locator('[data-slot='+slot+']').uncheck()
 assert page.evaluate(COMPARE,'body-face-fit-draft.png')==0
 for slot in ['hair','outfit','weapon']:page.locator('[data-slot='+slot+']').check()
 assert page.evaluate('__paperDollStaticInspection().frameCount')==1
 assert not page.evaluate('__paperDollStaticInspection().artworkApproved')
 page.screenshot(path=str(OUT/'pilot-review-1366.png'),full_page=True)
 page.set_viewport_size({'width':393,'height':852})
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(OUT/'pilot-review-393.png'),full_page=True)
 assert page.evaluate('localStorage.getItem("mare-partida-save-v1")')=='inspection-sentinel'
 assert not errors,errors;browser.close()
 print('Static pilot passed: four layers, exact RGBA composition, toggles, one frame, save untouched, desktop/mobile. No artwork approval claimed.')
