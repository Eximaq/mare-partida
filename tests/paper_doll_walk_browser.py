"""Real south walk: exact layers, eight sockets, mobile review and atomic fallback."""
import itertools,json,os,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
REL=os.environ.get('MARE_WALK_REVIEW_PACK','pixellab-pip-generations/paper-doll-walk-fit-20261021/')
WALK_DIRS=json.loads((ROOT/REL/'review-pack.json').read_text())['coverage']['walk']
PACK_KEY={'paper-doll-walk-profiles-20261021':'walk-profiles','paper-doll-north-finish-20261021':'walk-north-complete','paper-doll-walk-north-20261021':'walk-north'}.get(Path(REL).name,'walk-south')
OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
EXPECTED='''async ({action,direction,frame,hidden=[]})=>{
 const data=await(await fetch('review-pack.json')).json(),row=data.coverage[action].indexOf(direction),c=document.createElement('canvas');c.width=c.height=84;const ctx=c.getContext('2d');
 const pieces=data.pieces.filter(p=>!hidden.includes(p.slot)).sort((a,b)=>{function z(p){const clip=p.animations[action];return clip.directionOverrides?.[direction]?.zIndex??clip.zIndex??p.zIndex}return z(a)-z(b)});
 for(const p of pieces){const clip=p.animations[action],source=clip.sources?.[direction]??clip.source,im=new Image();im.src=clip.sources?.[direction]?.url??clip.url;await im.decode();
 if(source){const s=clip.sockets[direction][frame];ctx.drawImage(im,s.x-source.anchorX,s.y-source.anchorY)}else ctx.drawImage(im,frame*84,row*84,84,84,0,0,84,84);}
 const a=ctx.getImageData(0,0,84,84).data,b=document.getElementById(direction+'-full').getContext('2d').getImageData(0,0,84,84).data;
 for(let i=0;i<a.length;i+=4)if(a[i+3]!==b[i+3]||(a[i+3]&&(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])))return false;return true;
}'''
with sync_playwright() as p,tempfile.TemporaryDirectory() as temporary:
 browser=p.chromium.launch();c=browser.new_context(viewport={'width':1366,'height':1000},accept_downloads=True)
 c.add_init_script('localStorage.setItem("mare-partida-save-v1","walk-sentinel")')
 q=c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install()
 q.goto(BASE+REL+'preview.html',wait_until='networkidle');q.wait_for_function('window.__paperDollWalk?.().ready')
 if '/dist/' in BASE:
  for file in ['paper-doll.js','preview.js']:assert '?v=' in q.locator(f'script[src*="{file}"]').get_attribute('src')
 for action,n,dirs in [('walk',8,WALK_DIRS),('idle',4,['south','north','west','east'])]:
  q.locator('#animation').select_option(action)
  for frame in range(n):
   q.locator('#frame').fill(str(frame));s=q.evaluate('__paperDollWalk()')
   assert s['readyDirections']==dirs and not s['productionEnabled'] and not s['artworkApproved'],s
   for d in dirs:assert q.evaluate(EXPECTED,{'action':action,'direction':d,'frame':frame}),[action,d,frame]
   if action=='walk':q.locator('#boards').screenshot(path=str(OUT/f'walk-{len(WALK_DIRS)}-views-frame-{frame+1}.png'))
 q.locator('#animation').select_option('walk');q.locator('#frame').fill('7')
 for visible in itertools.product([False,True],repeat=4):
  hidden=[]
  for slot,checked in zip(['body','hair','outfit','weapon'],visible):
   q.locator(f'[data-layer={slot}]').set_checked(checked)
   if not checked:hidden.append(slot)
  for d in WALK_DIRS:assert q.evaluate(EXPECTED,{'action':'walk','direction':d,'frame':7,'hidden':hidden})
 for slot in ['body','hair','outfit','weapon']:q.locator(f'[data-layer={slot}]').check()
 q.locator('#frame').fill('0');q.locator('#play').click();q.clock.run_for(25)
 for n in range(1,9):q.clock.run_for(125);assert q.evaluate('__paperDollWalk().frameIndex')==n%8
 q.locator('#play').click();q.screenshot(path=str(OUT/'walk-south-1366.png'),full_page=True)
 q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 q.screenshot(path=str(OUT/'walk-south-393.png'),full_page=True)
 q.goto(BASE+'tools/paper-doll-inspector/index.html?pack='+PACK_KEY,wait_until='networkidle')
 q.wait_for_function('window.__paperDollInspector?.state().readyDirections?.length===4')
 q.locator('#animation').select_option('walk');q.locator('#direction').select_option('south')
 for direction in WALK_DIRS:
  q.locator('#direction').select_option(direction)
  for frame in range(8):
   q.locator('#frame').fill(str(frame));s=q.evaluate('__paperDollInspector.state()')
   assert s['mode']=='draft' and s['readyDirections']==[direction] and not s['missing'],s
   transforms=json.loads(q.locator('#transforms').text_content());w=next(x for x in transforms if x['slot']=='weapon');assert w['zIndex']==(80 if direction=='east' or (PACK_KEY=='walk-profiles' and direction=='west') else 10)
 q.locator('#direction').select_option('south')
 # Per-animation eight-frame socket editor/export must not mutate four-frame Idle.
 q.locator('#attachmentPanel > summary').click();q.locator('#frame').fill('7')
 q.locator('#socketDirection').select_option('south');q.locator('#socketX').fill('34');q.locator('#socketY').fill('49');q.locator('#socketZ').fill('11');q.locator('#applySocket').click()
 with q.expect_download() as download:q.locator('#exportPack').click()
 destination=Path(temporary)/'review.json';download.value.save_as(destination);data=json.loads(destination.read_text())
 weapon=next(x for x in data['pieces'] if x['slot']=='weapon');assert weapon['animations']['walk']['sockets']['south'][7]=={'x':34,'y':49}
 assert len(weapon['animations']['idle']['sockets']['south'])==4 and all(not x['approved'] for x in data['pieces']) and 'blob:' not in destination.read_text()
 q.locator('#restoreSockets').click()
 for d in [d for d in ['north','west','east'] if d not in WALK_DIRS]:
  q.locator('#direction').select_option(d);s=q.evaluate('__paperDollInspector.state()');assert s['mode']=='fallback' and not s['readyDirections'] and all(x['pixels']==0 for x in s['differences'])
 q.locator('#animation').select_option('attack');s=q.evaluate('__paperDollInspector.state()');assert s['mode']=='fallback'
 q.locator('#animation').select_option('idle');q.locator('#direction').select_option('all');assert len(q.evaluate('__paperDollInspector.state().readyDirections'))==4
 assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='walk-sentinel'
 assert not errors,errors;browser.close()
print('Walk passed:',WALK_DIRS,'eight real frames per view,16 reused Idle poses, exact independent RGBA, all layer combinations,8-frame sockets/export, fallback, mobile and untouched save.')
