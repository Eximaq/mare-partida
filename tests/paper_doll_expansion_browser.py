"""Real four-view Idle pack: exact RGBA, hand depth, source selection and mobile import."""
import itertools,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
EXPECTED='''async ({direction,frame,hidden=[]})=>{
 const data=await(await fetch('review-pack.json')).json(),r=data.rig,row=['south','north','west','east'].indexOf(direction),c=document.createElement('canvas');c.width=c.height=84;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 const pieces=data.pieces.filter(p=>!hidden.includes(p.slot)).sort((a,b)=>{function z(p){return p.animations.idle.directionOverrides?.[direction]?.zIndex??p.zIndex}return z(a)-z(b)});
 for(const p of pieces){const clip=p.animations.idle,source=clip.sources?.[direction],im=new Image();im.src=source?.url??clip.url;await im.decode();
 if(source){const s=clip.sockets[direction][frame];ctx.drawImage(im,s.x-source.anchorX,s.y-source.anchorY)}else ctx.drawImage(im,frame*84,row*84,84,84,0,0,84,84);}
 const a=ctx.getImageData(0,0,84,84).data,b=document.getElementById(direction+'-full').getContext('2d').getImageData(0,0,84,84).data;
 for(let i=0;i<a.length;i+=4)if(a[i+3]!==b[i+3]||(a[i+3]&&(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])))return false;return true;
}'''
with sync_playwright() as p:
 browser=p.chromium.launch();context=browser.new_context(viewport={'width':1366,'height':1000})
 context.add_init_script('localStorage.setItem("mare-partida-save-v1","expansion-sentinel")')
 q=context.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.clock.install();q.goto(BASE+'pixellab-pip-generations/paper-doll-expansion-20261021/preview.html',wait_until='networkidle')
 q.wait_for_function('window.__paperDollExpansion?.().ready')
 if '/dist/' in BASE:
  for name in ['paper-doll.js','preview.js']:
   assert '?v=' in q.locator(f'script[src*="{name}"]').get_attribute('src')
 for frame in range(4):
  q.locator('#frame').fill(str(frame));s=q.evaluate('__paperDollExpansion()')
  assert s['readyDirections']==['south','north','west','east'] and not s['artworkApproved'] and not s['productionEnabled']
  for d in s['readyDirections']:assert q.evaluate(EXPECTED,{'direction':d,'frame':frame}),[d,frame]
  q.locator('#boards').screenshot(path=str(OUT/f'four-view-idle-frame-{frame+1}.png'))
 for visible in itertools.product([False,True],repeat=4):
  hidden=[]
  for slot,checked in zip(['body','hair','outfit','weapon'],visible):
   q.locator(f'[data-layer={slot}]').set_checked(checked)
   if not checked:hidden.append(slot)
  for d in ['south','north','west','east']:assert q.evaluate(EXPECTED,{'direction':d,'frame':3,'hidden':hidden})
 for slot in ['body','hair','outfit','weapon']:q.locator(f'[data-layer={slot}]').check()
 q.locator('#frame').fill('0');q.locator('#play').click()
 for n in [1,2,3,0]:q.clock.run_for(260);assert q.evaluate('__paperDollExpansion().frameIndex')==n
 q.locator('#play').click();q.screenshot(path=str(OUT/'four-view-idle-1366.png'),full_page=True)
 q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 q.screenshot(path=str(OUT/'four-view-idle-393.png'),full_page=True)
 # Bundled loader exercises directional source filenames without desktop uploads.
 q.goto(BASE+'tools/paper-doll-inspector/index.html?pack=expansion-idle',wait_until='networkidle')
 q.wait_for_function('window.__paperDollInspector?.state().readyDirections?.length===4')
 for frame in range(4):
  q.locator('#frame').fill(str(frame));s=q.evaluate('__paperDollInspector.state()');assert s['mode']=='draft' and not s['missing'] and not s['artworkValidated']
 for animation in ['walk','attack']:
  q.locator('#animation').select_option(animation);s=q.evaluate('__paperDollInspector.state()');assert s['mode']=='fallback' and s['readyDirections']==[]
  assert all(d['pixels']==0 for d in s['differences'])
 q.locator('#animation').select_option('idle');q.locator('#direction').select_option('north')
 transforms=json.loads(q.locator('#transforms').text_content());assert transforms[0]['slot']=='weapon' and transforms[0]['zIndex']==10
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='expansion-sentinel'
 assert not errors,errors;browser.close()
print('Four-view Idle passed:16 real poses,64 layer-toggle combinations, exact native RGBA, direction depth, mobile bundled loading, Walk/Attack fallback and save preserved.')
