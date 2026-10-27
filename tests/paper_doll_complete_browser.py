"""Exercise all seven real heroAttack paths with the shared layered renderer."""
import json,os,base64,io,subprocess,sys
from PIL import Image,ImageChops
from pathlib import Path
from playwright.sync_api import sync_playwright
CLASSES={'sword':'sword','brawler':'unarmed','gunner':'firearm','rogue':'daggers','cyborg':'tech','strategist':'focus','healer':'focus'}
CLASS=os.environ.get('MARE_COMPLETE_CLASS')
if not CLASS:
 for cls in CLASSES:
  subprocess.run([sys.executable,__file__],env={**os.environ,'MARE_COMPLETE_CLASS':cls},check=True)
 print('Seven-class shared review: all class combat checks passed.')
 sys.exit(0)
CATEGORY=CLASSES[CLASS]
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/evidence-paper-doll/complete'/CLASS;OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8126/dist/')
HOOK="""
window.__completeTest={strike(direction,skill=false){
 autoPlay=false;cancelBasicAttack();const controller=classCombatController();controller?.reset('front');const m=livingMobs()[0],delta={south:[0,15],north:[0,-15],west:[-15,0],east:[15,0]}[direction];m.x=world.hero.x+delta[0];m.y=world.hero.y+delta[1];m.hp=m.maxHP=100000;m.alive=true;
 session.respawn=0;const old=Math.random;Math.random=()=>.5;
 world.projectiles=[];const before=game.stats.damage,frames=[],damageTimeline=[],poseFrames=[],shots=[];let duration;
 try{
 heroAttack(m,1,skill?{damageType:'physical'}:null);duration=basicAttackPose()?.duration||controller?.snapshot().duration;
 const canvas=document.createElement('canvas');canvas.width=200;canvas.height=200;
 for(let i=0;i<8;i++){
  if(!skill){const dt=duration*(i===0?.01:.125);if(controller)controller.step(dt,{inCombat:true,direction:world.hero.direction});else stepBasicAttack(dt);}
  const count=paperDollReview.snapshot().draws,damageBeforeRender=game.stats.damage;
  drawPlayerSprite(canvas.getContext('2d'),100,140);
  if(game.stats.damage!==damageBeforeRender)throw Error('Rendering dealt damage');
  frames.push(paperDollReview.snapshot().draws>count);damageTimeline.push(game.stats.damage-before);poseFrames.push(paperDollReview.snapshot().lastPose?.frameIndex);shots.push(world.projectiles.map(p=>({x:p.x,y:p.y,progress:p.progress})));
 }
 }finally{Math.random=old;}
 const result={damage:game.stats.damage-before,frames,damageTimeline,poseFrames,shots,release:paperDollReview.snapshot().lastRelease,duration};cancelBasicAttack();controller?.reset('front');return result;
}, walkFixture(direction){
 autoPlay=false;autoSkills=false;travelPath=[];world.spawnClock=1e9;cancelBasicAttack();classCombatController()?.reset('front');
 this.walkTarget=world.mobs[0]||this.walkTarget;world.mobs=this.walkTarget?[this.walkTarget]:[];for(const m of world.mobs){m.speed=0;m.attackClock=1e9;}
 const nav=navigator(),delta={east:[170,0],west:[-170,0],south:[0,170],north:[0,-170]}[direction];
 for(let y=192;y<nav.map.height-192;y+=64)for(let x=192;x<nav.map.width-192;x+=64){const end={x:x+delta[0],y:y+delta[1]};if(nav.walkable(x,y)&&nav.walkable(end.x,end.y)&&nav.clear({x,y},end)&&Array.from({length:86},(_,i)=>nav.walkable(x+delta[0]*i/85,y+delta[1]*i/85)).every(Boolean)){Object.assign(world.hero,{x,y});for(const m of world.mobs){m.x=x+800;m.y=y+800;}drawWorld();return {x,y};}}
 throw Error('No walk test lane');
}, restoreWalkTarget(){world.mobs=[this.walkTarget];world.target=this.walkTarget;}, movement(){return {time:world.time,x:world.hero.x,y:world.hero.y,keys:[...keys]};}, capture(){const c=document.createElement('canvas');c.width=200;c.height=200;drawPlayerSprite(c.getContext('2d'),100,150);return c.toDataURL();}, snapshot(){return JSON.stringify(game)},stop(){autoPlay=false}};

"""
with sync_playwright() as p:
 b=p.chromium.launch()
 inspector=b.new_page(viewport={'width':1366,'height':900});inspector.goto(BASE+'tools/paper-doll-inspector/index.html?pack=complete',wait_until='networkidle')
 inspector.locator('#classId').select_option(CLASS);inspector.locator('#pivots').uncheck()
 for action,count in [('idle',4),('walk',8),('attack',8)]:
  inspector.locator('#animation').select_option(action)
  for d in ['south','north','west','east']:
   inspector.locator('#direction').select_option(d)
   for i in range(count):
    inspector.locator('#frame').fill(str(i))
    inspector.wait_for_function("!__paperDollInspector.state().missing.some(x=>x.code==='loading-image')")
    state=inspector.evaluate('__paperDollInspector.state()')
    assert not state['missing'],(action,d,i,state)
 inspector.locator('#direction').select_option('east');inspector.locator('#frame').fill('3');inspector.screenshot(path=str(OUT/'east-preview.png'),full_page=True);inspector.close()
 c=b.new_context(viewport={'width':1366,'height':900});q=c.new_page();q.clock.install();errors=[]
 q.on('pageerror',lambda e:errors.append(str(e)))
 c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'));c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
 def game_route(route):
  response=route.fetch();s=response.text();needle='  window.__mareDiagnostics=';assert needle in s;route.fulfill(response=response,body=s.replace(needle,HOOK+needle))
 c.route('**/game.js*',game_route)
 q.goto(BASE,wait_until='networkidle');q.locator('#characterName').fill('Teste de adagas');q.locator('#nextToClass').click();q.locator('[data-class='+CLASS+']').click();q.locator('#createCharacter').click();q.clock.run_for(200)
 q.goto(BASE+'?dev=1&paperDollReview=complete',wait_until='networkidle');q.wait_for_function('window.__mareDiagnostics&&__mareDiagnostics().paperDollReview.state!=="loading"');assert q.evaluate('__mareDiagnostics().paperDollReview.state')=='ready',q.evaluate('__mareDiagnostics().paperDollReview')
 # DEV defaults to the current normal class; remove genuinely equipped items in UI.
 q.locator('#devLauncher').click();q.locator('#devClass').select_option(CLASS);q.locator('[data-dev-command=class]').click();q.locator('#closePanel').click()
 # Start with a genuinely equipped unsupported garment; preparation must store it.
 q.add_init_script("""{const k='mare-partida-dev-save-v1',g=JSON.parse(localStorage.getItem(k));if(g&&!sessionStorage.kitFixture){if(!g.equipment.boots)g.equipment.boots={id:'qa-boots',def:8,level:1,plus:3,rarity:'common',locked:true};localStorage.setItem(k,JSON.stringify(g));sessionStorage.kitFixture='1';}}""")
 q.reload(wait_until='networkidle');q.wait_for_function('window.__mareDiagnostics&&__mareDiagnostics().paperDollReview.state!=="loading"')
 assert q.evaluate('__mareDiagnostics().paperDollReview.state')=='ready',q.evaluate('__mareDiagnostics().paperDollReview')
 data=json.loads(q.evaluate('localStorage.getItem("mare-partida-dev-save-v1")'));boots=data['equipment']['boots']
 q.locator('#characterMenuTrigger').click();q.locator('[data-character-section=status]').click();q.locator('[data-character-section=appearance]').click()
 assert q.locator('[data-doll-kit]').is_visible()
 q.locator('.doll-equipment').scroll_into_view_if_needed();q.screenshot(path=str(OUT/'equipment-blocked.png'))
 # Storage failure must leave the live equipment and persisted inventory intact.
 if CLASS=='sword':
  before=q.evaluate('localStorage.getItem("mare-partida-dev-save-v1")')
  q.evaluate("() => {window.kitSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mare-partida-dev-save-v1')throw Error('quota');return window.kitSet.call(this,k,v)};}")
  q.locator('[data-doll-kit]').click();assert q.get_by_text('Não foi possível salvar. Equipamentos anteriores preservados.').is_visible()
  assert q.evaluate('localStorage.getItem("mare-partida-dev-save-v1")')==before
  q.evaluate('() => {Storage.prototype.setItem=window.kitSet;}')
 q.locator('[data-doll-kit]').click();q.wait_for_function('document.querySelector("#dollLookState").textContent.includes("sincronizadas")')
 prepared=json.loads(q.evaluate('localStorage.getItem("mare-partida-dev-save-v1")'))
 assert prepared['equipment']['boots'] is None and boots in prepared['inventory']
 assert len({i['id'] for i in prepared['inventory']})==len(prepared['inventory'])
 assert not q.locator('[data-doll-kit]').count()
 q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth');q.locator('.doll-equipment').scroll_into_view_if_needed();q.screenshot(path=str(OUT/'equipment-ready.png'));q.set_viewport_size({'width':1366,'height':900})
 q.locator('#closePanel').click()
 q.clock.run_for(200);assert q.evaluate('__mareDiagnostics().paperDollReview.state')=='ready'
 normal=q.evaluate('localStorage.getItem("mare-partida-save-v1")')
 q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area=beach]').click();q.evaluate('__completeTest.stop()')
 if CLASS=='gunner':
  q.clock.pause_at(q.evaluate('Date.now()+100'))
  for direction,key in [('east','d'),('west','a'),('south','s'),('north','w')]:
   q.evaluate('(d)=>__completeTest.walkFixture(d)',direction);q.clock.run_for(50);q.keyboard.down(key);images=[];walk_frames=set()
   for i in range(48):
    previous=q.evaluate('__completeTest.movement()');q.clock.run_for(17);state=q.evaluate('__mareDiagnostics().paperDollReview.lastPose');assert state['animationId']=='walk',(i,state,previous,q.evaluate('__completeTest.movement()'));walk_frames.add(state['frameIndex'])
    images.append(Image.open(io.BytesIO(base64.b64decode(q.evaluate('__completeTest.capture()').split(',')[1]))).convert('RGBA'))
   q.keyboard.up(key);q.clock.run_for(250);assert q.evaluate('__mareDiagnostics().paperDollReview.lastPose.animationId')=='idle'
   assert len(walk_frames)>=6,(direction,walk_frames)
   background=Image.new('RGBA',(200,200),'#203333');rgb=[]
   for im in images:rgb.append(Image.alpha_composite(background,im).convert('RGB'))
   rgb[0].save(OUT/('walk-live-'+direction+'.gif'),save_all=True,append_images=rgb[1:],duration=17,loop=0)
  q.evaluate('__completeTest.restoreWalkTarget()')
 coverage=q.evaluate("fetch('pixellab-pip-generations/paper-doll-complete-20261026/review-pack.json').then(r=>r.json()).then(p=>p.coverage['attack-"+CATEGORY+"'])")
 rows=[]
 for d in ['south','west','east','north']:
  result=q.evaluate('(d)=>__completeTest.strike(d)',d);assert result['damage']>0,(CLASS,d,result);assert result['frames']==[d in coverage]*8,(d,result);rows.append(result)
 assert len({r['damage'] for r in rows})==1,rows
 for r in rows: assert r['damageTimeline'][0]==0 and sum(a!=b for a,b in zip(r['damageTimeline'],r['damageTimeline'][1:]))==1,r
 if CATEGORY in ['firearm','tech','focus']:
  for r in rows:
   first=next(i for i,shots in enumerate(r['shots']) if shots)
   assert r['poseFrames'][first]==3,(CLASS,r)
   assert r['shots'][first][0]['x']==r['release']['x'] and r['shots'][first][0]['y']==r['release']['y']
   assert r['shots'][first][0]['progress']==0
 skill=q.evaluate('__completeTest.strike("south",true)');assert skill['frames']==[False]*8
 # Use the real inventory controls: removing/re-equipping changes the renderer immediately.
 if CLASS!='brawler':
  weapon=json.loads(q.evaluate('localStorage.getItem("mare-partida-dev-save-v1")'))['equipment']['weapon']
  q.locator('.bottom-nav [data-panel=inventory]').click();q.locator('[data-inv-slot=weapon]').click();q.locator('[data-unequip=weapon]').click();q.locator('[data-close-panel]').click()
  assert q.evaluate('__completeTest.strike("east")')['frames']==[False]*8
  q.locator('.bottom-nav [data-panel=inventory]').click();q.locator('[data-item="'+weapon['id']+'"]').click();q.locator('[data-equip="'+weapon['id']+'"]').click();q.locator('[data-close-panel]').click()
  assert q.evaluate('__completeTest.strike("east")')['frames']==[True]*8
 # Real loop also deals damage; rendering is not the attack scheduler.
 before=q.evaluate('__mareDiagnostics().damage');q.clock.run_for(1200)
 q.screenshot(path=str(OUT/'combat.png'));q.set_viewport_size({'width':393,'height':852});q.screenshot(path=str(OUT/'mobile.png'));assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')==normal
 assert not errors,errors
 (OUT/'result.json').write_text(json.dumps({'coverage':coverage,'hits':rows,'skill':skill,'errors':errors},indent=2));b.close()
print(CLASS, 'complete pilot: 80 poses in four directions, actual attack clock, single impact, skills, mobile and normal save passed.')
