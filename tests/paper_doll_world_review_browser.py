"""Test-only opt-in of real review art in the world; production catalog stays untouched."""
import copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
REL=os.environ.get('MARE_REVIEW_PACK','pixellab-pip-generations/paper-doll-expansion-20261021/')
KEY='mare-partida-save-v1';OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
pack=json.loads((ROOT/REL/'review-pack.json').read_text())
for piece in pack['pieces']:
 for clip in piece['animations'].values():
  clip['url']=BASE+REL+clip['url']
  for source in clip.get('sources',{}).values():source['url']=BASE+REL+source['url']
INJECT='''
// TEST FIXTURE ONLY: no production file, save or approved flag is changed.
(()=>{const pack=PACK,cat=MarePaperDollCatalog,create=cat.createRuntime,appearance=cat.appearance;
window.__paperDollWorldReview={enabled:true,draws:{},fallbacks:{}};
cat.appearance=player=>__paperDollWorldReview.enabled&&cat.eligible(player)?structuredClone(pack.appearance):appearance(player);
cat.createRuntime=options=>{const r=create(options);pack.pieces.forEach(p=>r.registerPiece(p));const draw=r.draw;
r.draw=(ctx,config,pose,x,y,options={})=>{const result=draw(ctx,config,pose,x,y,{...options,allowDraft:true});const group=result?__paperDollWorldReview.draws:__paperDollWorldReview.fallbacks,key=pose.animationId+'/'+pose.direction;group[key]=group[key]||[];if(!group[key].includes(pose.frameIndex))group[key].push(pose.frameIndex);return result;};return r;};})();
'''.replace('PACK',json.dumps(pack))

def context(browser,seed=None):
 c=browser.new_context(viewport={'width':1366,'height':900})
 c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'))
 c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
 def patch(route):
  response=route.fetch();route.fulfill(response=response,body=response.text()+INJECT)
 c.route('**/paper-doll-assets.js*',patch)
 if seed:c.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(seed))+')')
 q=c.new_page();q.clock.install();return c,q

with sync_playwright() as p:
 browser=p.chromium.launch();c,q=context(browser);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.goto(BASE,wait_until='domcontentloaded');q.wait_for_function('typeof __mareDiagnostics==="function"')
 q.locator('#characterName').fill('Revisao Modular');q.locator('#nextToClass').click();q.locator('[data-class=sword]').click();q.locator('#createCharacter').click()
 q.clock.run_for(300);q.wait_for_function('__mareDiagnostics().paperDoll.compositions>0')
 files={clip['url'] for piece in pack['pieces'] for clip in piece['animations'].values()}
 files.update(source['url'] for piece in pack['pieces'] for clip in piece['animations'].values() for source in clip.get('sources',{}).values())
 q.evaluate('urls=>Promise.all(urls.map(url=>MareFactionSprites.image(url).decode()))',list(files))
 expected_walk=pack.get('coverage',{}).get('walk',next(piece for piece in pack['pieces'] if piece['slot']=='body')['animations'].get('walk',{}).get('directions',[]))
 for key,direction in [('w','north'),('a','west'),('s','south'),('d','east')]:
  q.keyboard.down(key);q.clock.run_for(1100 if direction in expected_walk else 200)
  if direction in expected_walk:q.screenshot(path=str(OUT/('world-modular-review-walk-'+direction+'.png')))
  q.keyboard.up(key);q.clock.run_for(1100)
  q.wait_for_function('key=>key in __paperDollWorldReview.draws',arg='idle/'+direction)
 state=q.evaluate('__paperDollWorldReview');assert all('idle/'+d in state['draws'] for d in ['south','north','west','east']),state
 assert all('walk/'+d in state['draws'] for d in expected_walk),state
 for d in expected_walk:assert sorted(state['draws']['walk/'+d])==list(range(8)),state
 missing_walk=set(['south','north','west','east'])-set(expected_walk)
 actual_walk_fallbacks={k.split('/')[1] for k in state['fallbacks'] if k.startswith('walk/')}
 assert actual_walk_fallbacks==missing_walk,state
 q.screenshot(path=str(OUT/'world-modular-review-idle.png'))
 baseline=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'))
 assert not any('paper' in key.lower() or 'appearance' in key.lower() for key in baseline)
 q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area=beach]').click()
 q.clock.run_for(12000);state=q.evaluate('__paperDollWorldReview');diag=q.evaluate('__mareDiagnostics()')
 assert any(k.startswith('attack-sword/') for k in state['fallbacks']),state
 assert diag['damage']>0 and diag['paperDoll']['hits']>0 and diag['paperDoll']['compositions']>0,diag
 assert diag['paperDoll']['cacheEntries']<=96 and diag['paperDoll']['cacheBytes']<=4*1024*1024
 q.screenshot(path=str(OUT/'world-modular-review-combat-fallback.png'))
 before=diag['paperDoll']['compositions'];q.evaluate('__paperDollWorldReview.enabled=false');q.clock.run_for(1500)
 assert q.evaluate('__mareDiagnostics().paperDoll.compositions')==before
 saved=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'));assert not any('paper' in key.lower() or 'appearance' in key.lower() for key in saved)
 summary={'scope':'isolated browser fixture only; not production enablement','idle_directions':sorted(k for k in state['draws'] if k.startswith('idle/')),'modular_frames':state['draws'],'legacy_actions':sorted(state['fallbacks']),'damage':diag['damage'],'cache':diag['paperDoll']}
 book=diag['hakiBookDef'];c.close()
 # Haki must still activate/drain while real modular Idle is being drawn.
 haki=copy.deepcopy(baseline);haki.update(level=50,hp=99999,has_haki_unlocked=True,haki={'current':100,'unlocked':True})
 c,q=context(browser,haki);q.on('pageerror',lambda e:errors.append(str(e)));q.goto(BASE,wait_until='domcontentloaded');q.wait_for_function('typeof __mareDiagnostics==="function"')
 q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area=beach]').click()
 if q.evaluate('__mareDiagnostics().autoPlay'):q.locator('#autoToggle').click()
 q.wait_for_function('__mareDiagnostics().paperDoll.compositions>0');q.keyboard.press('h');q.clock.run_for(1000)
 assert q.evaluate('__mareDiagnostics().haki.active')=='armament' and q.evaluate('__mareDiagnostics().haki.current')<100
 assert q.evaluate('__mareDiagnostics().paperDoll.compositions')>0
 q.screenshot(path=str(OUT/'world-modular-review-haki.png'));c.close()
 # The real animal branch must bypass even a complete loaded humanoid Idle set.
 zoan=copy.deepcopy(baseline);zoan['equipment']['akuma_no_mi']={'id':'review-zoan','type':'akuma_no_mi','fruitId':'akuma_tori_albatroz','def':book+3,'level':1,'plus':0,'locked':False,'obtainedAt':1};zoan['zoanTransformed']=True;zoan['akumaCompendium']=['akuma_tori_albatroz']
 c,q=context(browser,zoan);q.on('pageerror',lambda e:errors.append(str(e)));q.goto(BASE,wait_until='domcontentloaded');q.wait_for_function('typeof __mareDiagnostics==="function"');q.clock.run_for(1000)
 assert q.evaluate('__mareDiagnostics().paperDoll.compositions')==0
 assert q.evaluate('JSON.parse(localStorage.getItem("mare-partida-save-v1")).zoanTransformed')
 c.close();assert not errors,errors;browser.close()
 (OUT/('world-review-walk-results.json' if expected_walk else 'world-review-results.json')).write_text(json.dumps(summary,indent=2)+'\n')
print('Real-world review passed: four-view Idle; all8 Walk frames for',expected_walk,'via test-only opt-in; incomplete actions fallback; actual damage, bounded cache, Haki drain, disable/revert, unchanged save schema and Zoan bypass.')
