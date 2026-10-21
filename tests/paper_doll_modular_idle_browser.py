"""Four real modular slots, rigid sword, full-rig import and unsupported-pose fallback."""
import itertools,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
REL='pixellab-pip-generations/paper-doll-hair-outfit-20261021/'
FILES=ROOT/REL;OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
EXPECTED='''async ({frame,hidden=[]})=>{
 const c=document.createElement('canvas');c.width=c.height=84;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(const slot of ['body','outfit','hair','weapon']){
  if(hidden.includes(slot))continue;
  const image=new Image();image.src=slot==='weapon'?'rigid-weapon.png':slot+'-idle-south.png';await image.decode();
  if(slot==='weapon'){const [x,y]=[[10,13],[8,12],[10,13],[9,12]][frame];ctx.drawImage(image,x,y)}
  else ctx.drawImage(image,frame*84,0,84,84,0,0,84,84);
 }
 const a=ctx.getImageData(0,0,84,84).data,b=document.getElementById('newCanvas').getContext('2d').getImageData(0,0,84,84).data;
 for(let i=0;i<a.length;i+=4)if(a[i+3]!==b[i+3]||(a[i+3]&&(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])))return false;
 return true;
}'''
with sync_playwright() as p:
 browser=p.chromium.launch();context=browser.new_context(viewport={'width':1366,'height':900})
 context.add_init_script('localStorage.setItem("mare-partida-save-v1","modular-idle-sentinel")')
 q=context.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.clock.install();q.goto(BASE+REL+'preview.html',wait_until='networkidle')
 q.wait_for_function('window.__paperDollHumanIdleInspection?.().ready')
 for frame in range(4):
  q.locator('#frame').fill(str(frame));state=q.evaluate('__paperDollHumanIdleInspection()')
  assert state['readyDirections']==['south'] and not state['fullCharacterArtApproved']
  assert state['audit']['unmasked_body_changes']==0 and state['generations']==12
  for slot in ['hair','outfit']:
   assert state['audit'][slot]['passed'] and state['audit'][slot]['outside_mask_pixels']==0
  assert q.evaluate(EXPECTED,{'frame':frame})
  q.locator('.boards').screenshot(path=str(OUT/f'modular-idle-frame-{frame+1}.png'))
 slots=['body','hair','outfit','weapon'];q.locator('#frame').fill('1')
 for visible in itertools.product([False,True],repeat=4):
  hidden=[]
  for slot,checked in zip(slots,visible):
   q.locator(f'[data-layer={slot}]').set_checked(checked)
   if not checked:hidden.append(slot)
  assert q.evaluate(EXPECTED,{'frame':1,'hidden':hidden}),hidden
 for slot in slots:q.locator(f'[data-layer={slot}]').check()
 q.locator('#frame').fill('0');q.locator('#play').click()
 for expected in [1,2,3,0]:
  q.clock.run_for(300);assert q.evaluate('__paperDollHumanIdleInspection().frameIndex')==expected
 q.locator('#play').click();q.locator('#frame').fill('0')
 stats=q.evaluate('__paperDollHumanIdleInspection().stats')
 assert stats['cacheEntries']<=96 and stats['cacheBytes']<=4*1024*1024 and stats['hits']>0
 q.screenshot(path=str(OUT/'modular-idle-1366.png'),full_page=True)
 q.set_viewport_size({'width':393,'height':852})
 assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 q.screenshot(path=str(OUT/'modular-idle-393.png'),full_page=True)
 # Import the actual full human-v1 rig and four real PNGs into the existing workbench.
 q.set_viewport_size({'width':1366,'height':900});q.goto(BASE+'tools/paper-doll-inspector/index.html',wait_until='networkidle')
 q.wait_for_function('window.__paperDollInspector?.state().referenceReady')
 q.locator('#importPanel > summary').click()
 q.locator('#importPack').set_input_files([str(FILES/name) for name in ['review-pack.json','body-idle-south.png','hair-idle-south.png','outfit-idle-south.png','rigid-weapon.png']])
 q.wait_for_function('__paperDollInspector.state().readyDirections?.includes("south")')
 for frame in range(4):
  q.locator('#frame').fill(str(frame));state=q.evaluate('__paperDollInspector.state()')
  assert state['mode']=='partial-draft' and state['readyDirections']==['south'],state
  assert state['appearance']['rigId']=='human-v1' and not state['artworkValidated']
  assert all(m['code']=='missing-direction' for m in state['missing'])
  assert all(d['pixels']==0 for d in state['differences'][1:])
  transforms=json.loads(q.locator('#transforms').text_content())
  weapon=next(layer for layer in transforms if layer['slot']=='weapon')
  assert weapon['kind']=='rigid-attachment' and weapon['socket']==[{'x':30,'y':49},{'x':28,'y':48},{'x':30,'y':49},{'x':29,'y':48}][frame]
 q.screenshot(path=str(OUT/'modular-idle-inspector.png'),full_page=True)
 for animation in ['walk','attack']:
  q.locator('#animation').select_option(animation);state=q.evaluate('__paperDollInspector.state()')
  assert state['mode']=='fallback' and state['readyDirections']==[]
  assert all(d['pixels']==0 for d in state['differences'])
 q.locator('#animation').select_option('idle');q.locator('#resetPack').click()
 assert q.evaluate('__paperDollInspector.state().mode')=='fallback'
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='modular-idle-sentinel'
 assert not errors,errors;browser.close()
print('Modular Idle passed:4 real frames,4 slots,16 layer combinations, exact RGBA, twelve charged generations, actual full-rig pack import, three direction/Walk/Attack fallbacks, responsive UI and save preserved.')
