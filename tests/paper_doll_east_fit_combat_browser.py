"""Test-only opt-in of real review art in the world; production catalog stays untouched."""
import copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
REL='pixellab-pip-generations/paper-doll-east-fit-20261022/'
KEY='mare-partida-save-v1';OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
pack=json.loads((ROOT/REL/'review-pack.json').read_text())
for piece in pack['pieces']:
 for clip in piece['animations'].values():
  clip['url']=BASE+REL+clip['url']
  for source in clip.get('sources',{}).values():source['url']=BASE+REL+source['url']
INJECT='''
// TEST FIXTURE ONLY: no production file, save or approved flag is changed.
(()=>{const pack=PACK,cat=MarePaperDollCatalog,create=cat.createRuntime,appearance=cat.appearance;
window.__paperDollWorldReview={enabled:true,draws:{},fallbacks:{},attackSnapshots:{}};
cat.appearance=player=>__paperDollWorldReview.enabled&&cat.eligible(player)?structuredClone(pack.appearance):appearance(player);
cat.createRuntime=options=>{const r=create(options);pack.pieces.forEach(p=>r.registerPiece(p));const draw=r.draw;
r.draw=(ctx,config,pose,x,y,options={})=>{const result=draw(ctx,config,pose,x,y,{...options,allowDraft:true});const group=result?__paperDollWorldReview.draws:__paperDollWorldReview.fallbacks,key=pose.animationId+'/'+pose.direction;group[key]=group[key]||[];if(!group[key].includes(pose.frameIndex))group[key].push(pose.frameIndex);if(result&&pose.animationId==='attack-sword'&&pose.frameIndex===3&&!__paperDollWorldReview.attackSnapshots[pose.direction])__paperDollWorldReview.attackSnapshots[pose.direction]=ctx.canvas.toDataURL('image/png');return result;};return r;};})();
'''.replace('PACK',json.dumps(pack))

# Test-only placement harness; never written into game.js or the Pages build.
# It calls the real heroAttack/controller/impact path; it does not manufacture damage.
COMBAT_FIXTURE='''
  window.__paperDollCombatFixture={attack(direction){
    if(scene!=='hunt')throw Error('Hunt required');
    const nav=navigator(),offsets={south:[0,40],north:[0,-40],west:[-40,0],east:[40,0]};let center=null;
    for(let y=128;y<activeMap().height-128&&!center;y+=64)for(let x=128;x<activeMap().width-128&&!center;x+=64){
      const c={x,y};if(nav.walkable(x,y)&&Object.values(offsets).every(([dx,dy])=>nav.walkable(x+dx,y+dy)&&nav.clear(c,{x:x+dx,y:y+dy})))center=c;
    }
    if(!center)throw Error('No clear four-direction combat area');
    const template=world.mobs[0];if(!template)throw Error('Existing monster template required');
    autoPlay=false;autoSkills=false;session.respawn=0;game.hp=getDerived().maxHP;world.spawnClock=-1000;world.bossCooldown=1000;
    Object.assign(world.hero,center,{walking:0,attackAnim:0,talentControl:null});world.hero.combat?.reset('front');
    const [dx,dy]=offsets[direction],enemy={...template,id:world.nextID++,x:center.x+dx,y:center.y+dy,anchorX:center.x+dx,anchorY:center.y+dy,hp:1000000,maxHP:1000000,attack:0,attackClock:1000,alive:true,telegraph:null,hit:0,moving:0,talentControl:null};
    world.mobs=[enemy];world.target=enemy;camera.update(world.hero,activeMap(),0,true);
    const random=Math.random;Math.random=()=>.5;this.restoreRandom=()=>{Math.random=random;};
    const damage=game.stats.damage,accepted=heroAttack(enemy);return {accepted,damage};
  }};
'''

def context(browser,seed=None):
 c=browser.new_context(viewport={'width':1366,'height':900})
 c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'))
 # Isolate this historical draft; the production pack is covered separately.
 c.route('**/player-pack.json',lambda r:r.fulfill(status=503,body='{}'))
 c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
 def patch(route):
  response=route.fetch();route.fulfill(response=response,body=response.text()+INJECT)
 c.route('**/paper-doll-assets.js*',patch)
 if pack.get('coverage',{}).get('attack-sword'):
  def combat_fixture(route):
   response=route.fetch();source=response.text();marker='  window.__mareDiagnostics='
   assert source.count(marker)==1,'Test hook marker changed; do not patch production blindly'
   route.fulfill(response=response,body=source.replace(marker,COMBAT_FIXTURE+marker,1))
  c.route('**/game.js*',combat_fixture)
 if seed:c.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(seed))+')')
 q=c.new_page();q.clock.install();return c,q

with sync_playwright() as p:
 browser=p.chromium.launch();c,q=context(browser);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.goto(BASE,wait_until='domcontentloaded');q.wait_for_function('typeof __mareDiagnostics==="function"')
 q.locator('#characterName').fill('Encaixe Leste');q.locator('#nextToClass').click();q.locator('[data-class=sword]').click();q.locator('#nextToAppearance').click();q.locator('#createCharacter').click();q.locator('[data-confirm-accept]').click();q.clock.run_for(300)
 files={clip['url'] for piece in pack['pieces'] for clip in piece['animations'].values()}
 q.evaluate('urls=>Promise.all(urls.map(url=>MareFactionSprites.image(url).decode()))',list(files))
 assert q.evaluate('__mareDiagnostics().paperDoll.compositions')==0,'Attack-only candidate must not replace Idle'
 baseline=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'))
 q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area=beach]').click();q.clock.run_for(300)
 for direction in ['south','north','west','east']:
  result=q.evaluate('d=>__paperDollCombatFixture.attack(d)',direction);assert result['accepted'],direction
  q.clock.run_for(180);assert q.evaluate('__mareDiagnostics().damage')==result['damage'],'Damage before original impact frame'
  q.clock.run_for(150);impact=q.evaluate('__mareDiagnostics().damage');assert impact>result['damage'],'Real impact missing'
  q.clock.run_for(450);assert q.evaluate('__mareDiagnostics().damage')==impact,'A layer must not add a second impact';q.evaluate('__paperDollCombatFixture.restoreRandom()')
  review=q.evaluate('__paperDollWorldReview');assert sorted(review['draws']['attack-sword/'+direction])==list(range(8)),review
  assert not review['fallbacks'].get('attack-sword/'+direction),'A present sequence must stay modular for all8 frames'
  q.screenshot(path=str(OUT/('east-fit-combat-'+direction+'.png')))
 diag=q.evaluate('__mareDiagnostics()');assert diag['paperDoll']['cacheEntries']<=96 and diag['paperDoll']['cacheBytes']<=4*1024*1024
 before=q.evaluate('()=>{__paperDollWorldReview.enabled=false;return __mareDiagnostics().paperDoll.compositions}');q.clock.run_for(1000);assert q.evaluate('__mareDiagnostics().paperDoll.compositions')==before
 saved=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'));assert saved.get('paperDollLook')==baseline.get('paperDollLook');assert not any(('paper' in k.lower() or 'appearance' in k.lower()) and k!='paperDollLook' for k in saved)
 c.close()
 haki=copy.deepcopy(baseline);haki.update(level=50,hp=99999,has_haki_unlocked=True,haki={'current':100,'unlocked':True})
 c,q=context(browser,haki);q.on('pageerror',lambda e:errors.append(str(e)));q.goto(BASE);q.wait_for_function('typeof __mareDiagnostics==="function"')
 q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area=beach]').click();q.clock.run_for(300)
 q.evaluate('urls=>Promise.all(urls.map(url=>MareFactionSprites.image(url).decode()))',list(files));q.keyboard.press('h');result=q.evaluate('__paperDollCombatFixture.attack("east")');assert result['accepted'];q.clock.run_for(1000);q.evaluate('__paperDollCombatFixture.restoreRandom()')
 assert q.evaluate('__mareDiagnostics().haki.active')=='armament' and q.evaluate('__mareDiagnostics().haki.current')<100
 assert q.evaluate('__mareDiagnostics().paperDoll.compositions')>0;c.close()
 assert not errors,errors;browser.close()
print('East fitting real combat:32 true attack frames, four single legacy impacts, Idle fallback, cache bound, disable/revert, Haki drain and unchanged save schema passed. Test-only review opt-in.')
