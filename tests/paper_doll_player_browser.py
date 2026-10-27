"""Normal adventure, cosmetic persistence, equipment identity and isolated sandbox."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8148/dist/')
OUT=Path('docs/evidence-paper-doll/player');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch();c=b.new_context(viewport={'width':1366,'height':900});q=c.new_page();q.clock.install();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 def game_route(route):
  response=route.fetch();source=response.text();needle='  window.__mareDiagnostics=';assert needle in source
  hook="""window.__playerQA={get game(){return game},get hero(){return world.hero},stats:getDerived,save:saveGame,preview(){return $('portrait').toDataURL()},pause(){autoPlay=false;autoSkills=false;keys.clear()},tick,heroAttack,enterHunt,returnLobby,equipItem,unequip,draw:presentWorld,rows(){const original=game,rows=[],canvas=document.createElement('canvas');canvas.width=canvas.height=200;try{for(const cls of Object.keys(classes))for(const faction of Object.keys(factions)){game={...original,classId:cls,factionId:faction,equipment:{...original.equipment,weapon:{def:starterWeapon(cls)},coat:{def:7},head:{def:18},boots:{def:8}}};for(const dir of ['south','north','west','east'])for(const action of ['idle','walk','attack','skill','hurt','guard','death'])for(let i=0;i<8;i++)if(!paperDollReview.draw(canvas.getContext('2d'),game,action,dir,i/12,100,170,2,i/8,{hitFrameRatio:.5},false))rows.push({cls,faction,dir,action,i,reason:paperDollReview.snapshot().lastReason});}return rows;}finally{game=original;}},fight(cls){cancelBasicAttack();game.classId=cls;game.equipment.weapon=newItem(itemDefs[starterWeapon(cls)]);configureFactionVisual();autoPlay=false;autoSkills=false;world.spawnClock=1e9;const nav=navigator();let position;for(let y=192;y<nav.map.height-192&&!position;y+=16)for(let x=192;x<nav.map.width-192&&!position;x+=16)if(nav.clear({x,y},{x:x+30,y})&&nav.clear({x,y:y-55},{x:x+30,y:y-15}))position={x,y};if(!position)throw Error('No combat lane');Object.assign(world.hero,position);const m={id:'paper-player-'+cls,type:'bandit',area:game.area,level:1,alive:true,hp:100000,maxHP:100000,defense:0,magicDefense:0,x:position.x+25,y:position.y,anchorX:position.x+25,anchorY:position.y,attack:0,attackClock:1e9,speed:0,patrolClock:1e9,aggro:300,bob:0};world.mobs=[m];world.target=m;game.hp=getDerived().maxHP;const before=game.stats.damage,old=Math.random,frames=[],poses=[];Math.random=()=>.5;try{if(!heroAttack(m))throw Error('Attack rejected');for(let i=0;i<100;i++){tick(.025);const count=paperDollReview.snapshot().draws;presentWorld();const snap=paperDollReview.snapshot();frames.push(snap.draws>count);poses.push(snap.lastPose?.animationId);}return {frames,poses,damage:game.stats.damage-before};}finally{Math.random=old;cancelBasicAttack();}}};
"""
  route.fulfill(response=response,body=source.replace(needle,hook+needle))
 c.route('**/game.js*',game_route)
 c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'));c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
 q.goto(BASE,wait_until='networkidle');q.wait_for_function('window.__mareDiagnostics')
 q.wait_for_function('__mareDiagnostics().paperDollReview.state!=="loading"')
 assert q.evaluate('__mareDiagnostics().paperDollReview.production') is True,'Normal adventure must load an approved production pack without DEV query'
 q.locator('#characterName').fill('Marujo modular');q.locator('#nextToClass').click()
 q.locator('[data-creation-look=hair]').select_option('bald');q.locator('[data-creation-look=outfit]').select_option('base')
 q.screenshot(path=str(OUT/'creation-desktop.png'),full_page=True);q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth');q.locator('.creation-appearance').scroll_into_view_if_needed();q.screenshot(path=str(OUT/'creation-mobile.png'),full_page=True);q.set_viewport_size({'width':1366,'height':900});q.locator('#createCharacter').click();q.clock.run_for(100);q.clock.pause_at(q.evaluate('Date.now()+100'))
 assert q.evaluate('(__playerQA.draw(),__mareDiagnostics().paperDollReview.lastPose.animationId)')=='idle'
 data=json.loads(q.evaluate('localStorage.getItem("mare-partida-save-v1")'))
 assert data['paperDollLook']=={'version':1,'hair':'bald','outfit':'base'}
 assert not data.get('devSandbox');assert not q.evaluate('localStorage.getItem("mare-partida-dev-save-v1")')
 q.locator('#characterMenuTrigger').click();q.locator('[data-character-section=status]').click();q.locator('[data-character-section=appearance]').click()
 assert q.locator('[data-doll-look-apply]').is_visible();assert not q.locator('[data-doll-kit]').count()
 before_portrait=q.evaluate('__playerQA.preview()')
 # Storage rejection must preserve both the live appearance and persisted save.
 before_failure=q.evaluate('localStorage.getItem("mare-partida-save-v1")')
 q.locator('[data-doll-look=hair]').select_option('short-black')
 q.evaluate("()=>{window.oldSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mare-partida-save-v1')throw Error('quota');return oldSet.call(this,k,v)}}")
 q.locator('[data-doll-look-apply]').click();assert q.get_by_text('Não foi possível salvar. A aparência anterior foi preservada.').is_visible()
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')==before_failure
 assert q.evaluate('__playerQA.game.paperDollLook.hair')=='bald';assert q.evaluate('__playerQA.preview()')==before_portrait
 q.evaluate('()=>{Storage.prototype.setItem=oldSet;}')
 q.locator('[data-doll-look-cancel]').click();assert q.locator('[data-doll-look=hair]').input_value()=='bald';assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')==before_failure
 q.locator('[data-doll-look=hair]').select_option('short-black');q.locator('[data-doll-look-apply]').click()
 after=json.loads(q.evaluate('localStorage.getItem("mare-partida-save-v1")'));assert after['paperDollLook']['hair']=='short-black'
 for key in ['equipment','inventory','gold','classId','factionId','level','xp']:assert after[key]==data[key],key
 q.clock.run_for(20);assert q.evaluate('__playerQA.preview()')!=before_portrait
 q.screenshot(path=str(OUT/'appearance-desktop.png'));q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth');q.screenshot(path=str(OUT/'appearance-mobile.png'));q.set_viewport_size({'width':1366,'height':900})
 q.reload(wait_until='networkidle');q.wait_for_function('__mareDiagnostics().paperDollReview.state==="ready"');assert json.loads(q.evaluate('localStorage.getItem("mare-partida-save-v1")'))['paperDollLook']['hair']=='short-black'
 # Real inventory equip/unequip keeps every bonus and modular identity.
 q.locator('.bottom-nav [data-panel=inventory]').click();boots=next(i for i in after['inventory'] if i['def']==8)
 q.locator('[data-item="'+boots['id']+'"]').click();q.locator('[data-equip="'+boots['id']+'"]').click();q.clock.run_for(30)
 assert q.evaluate('__playerQA.game.equipment.boots.id')==boots['id'];assert q.evaluate('(__playerQA.draw(),__mareDiagnostics().paperDollReview.lastPose.animationId)')=='idle'
 q.locator('[data-inv-slot=weapon]').click();weapon=q.evaluate('__playerQA.game.equipment.weapon.id');q.locator('[data-unequip=weapon]').click();q.clock.run_for(30)
 assert q.evaluate('__playerQA.game.equipment.weapon') is None;assert q.evaluate('(__playerQA.draw(),__mareDiagnostics().paperDollReview.lastPose.animationId)')=='idle'
 q.locator('[data-item="'+weapon+'"]').click();q.locator('[data-equip="'+weapon+'"]').click();q.clock.run_for(30);assert q.evaluate('__playerQA.game.equipment.weapon.id')==weapon
 q.screenshot(path=str(OUT/'inventory.png'));q.locator('[data-close-panel]').click()
 failures=q.evaluate('__playerQA.rows()');assert not failures,failures[:8]
 # Legacy saves acquire only default cosmetics on read; no item/currency grant.
 legacy=q.evaluate('JSON.parse(JSON.stringify(__playerQA.game))');legacy.pop('paperDollLook',None);legacy.update(level=37,gold=123456,xp=123)
 q.add_init_script('if(!sessionStorage.legacyFixture){localStorage.setItem("mare-partida-save-v1",'+json.dumps(json.dumps(legacy))+');sessionStorage.legacyFixture="1";}');q.reload(wait_until='networkidle');q.wait_for_function('__mareDiagnostics().paperDollReview.state==="ready"')
 migrated=q.evaluate('JSON.parse(JSON.stringify(__playerQA.game))')
 for key in ['equipment','inventory','gold','classId','factionId','level','xp']:assert migrated[key]==legacy[key],key
 assert q.evaluate('MarePaperDollLook.read(__playerQA.game)')=={'version':1,'hair':'short-black','outfit':'navy'}
 q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area=beach]').click();q.evaluate('__playerQA.pause()')
 fights={}
 for cls in ['sword','brawler','gunner','rogue','cyborg','strategist','healer']:
  result=q.evaluate('(cls)=>__playerQA.fight(cls)',cls);assert result['damage']>0,(cls,result);assert all(result['frames']),(cls,result);assert any(x and x.startswith('attack-') for x in result['poses']),(cls,result);fights[cls]=result
 (OUT/'combat.json').write_text(json.dumps(fights,indent=2),encoding='utf-8');q.screenshot(path=str(OUT/'combat.png'))
 # Entering DEV starts another save; nothing from it is written into normal.
 normal=q.evaluate('()=>{__playerQA.save();return localStorage.getItem("mare-partida-save-v1")}');q.goto(BASE+'?dev=1&paperDollReview=complete',wait_until='networkidle');q.wait_for_function('__mareDiagnostics().paperDollReview.state==="ready"');q.clock.run_for(100)
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')==normal
 assert not q.evaluate('__mareDiagnostics().paperDollReview.production')
 assert not errors,errors
 perf_context=b.new_context(viewport={'width':1366,'height':900});perf_context.add_init_script('localStorage.setItem("mare-partida-save-v1",'+json.dumps(normal)+')')
 perf_context.route('**/api/**',lambda r:r.fulfill(status=404,body='{}'));perf_context.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
 perf=perf_context.new_page();perf.goto(BASE,wait_until='networkidle');perf.wait_for_function('window.__mareDiagnostics?.().paperDollReview.state==="ready"')
 perf.locator('#enterHunt').click();perf.locator('[data-quick-mode=map]').click();perf.locator('[data-island=dawn]').click();perf.locator('[data-travel-area=beach]').click()
 metrics=perf.evaluate("""async()=>{const samples=[],end=performance.now()+1800;let last=performance.now();await new Promise(resolve=>{function frame(t){samples.push(t-last);last=t;if(t<end)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});const sorted=samples.filter(x=>x>0).sort((a,b)=>a-b);return {frames:sorted.length,p95:sorted[Math.floor(sorted.length*.95)],renderer:__mareDiagnostics().paperDollReview};}""")
 assert metrics['frames']>=30 and metrics['p95']<100,metrics;assert metrics['renderer']['cacheEntries']<=96 and metrics['renderer']['cacheBytes']<=4*1024*1024
 (OUT/'performance.json').write_text(json.dumps(metrics,indent=2),encoding='utf-8');perf.screenshot(path=str(OUT/'normal-combat-live.png'));perf_context.close();b.close()
print('Normal player: approved pack, creation choices, saved appearance, reload, equipment invariants and DEV isolation passed.')
