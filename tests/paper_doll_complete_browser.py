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
 from paper_doll_emitter_qa import verify_emitters,verify_grounding,verify_lifecycle
 with sync_playwright() as p:
  b=p.chromium.launch();q=b.new_page();base=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8126/dist/');q.goto(base,wait_until='networkidle');out=Path(os.environ.get('MARE_EVIDENCE_ROOT','docs/evidence-paper-doll/complete'))/'geometry';verify_emitters(q,base,out);verify_grounding(q,base,out);verify_lifecycle(q,base,out);b.close()
 print('Seven-class shared review: all class combat checks passed.')
 sys.exit(0)
CATEGORY=CLASSES[CLASS]
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('MARE_EVIDENCE_ROOT',str(ROOT/'docs/evidence-paper-doll/complete')))/CLASS;OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8126/dist/')
HOOK="""
window.__completeTest={combatFixture(direction='east'){
 const nav=navigator(),[dx,dy]={south:[0,15],north:[0,-15],west:[-15,0],east:[15,0]}[direction],category=MarePaperDollCatalog.profile(game).category,m=world.mobs[0];
 if(!m)throw Error('Missing combat fixture target');
 Object.assign(m,{hp:100000,maxHP:100000,alive:true});
 for(let y=192;y<nav.map.height-192;y+=16)for(let x=192;x<nav.map.width-192;x+=16){const target={...m,x:x+dx,y:y+dy};if(!nav.walkable(x,y)||!nav.clear({x,y},target))continue;const emission=paperDollReview.inspect(game,{animationId:'attack-'+category,direction,frameIndex:3},{x,y}).emission,chest=combatChest(target);if(emission&&!nav.clear({x:emission.x,y:emission.y+24},{x:chest.x,y:chest.y+24}))continue;Object.assign(world.hero,{x,y});Object.assign(m,{x:target.x,y:target.y,anchorX:target.x,anchorY:target.y,engaged:false,returning:false,telegraph:null});return;}throw Error('No clear combat fixture for '+direction);
},strike(direction,skill=false){
 autoPlay=false;cancelBasicAttack();this.combatFixture(direction);const controller=classCombatController();controller?.reset('front');const m=livingMobs()[0],delta={south:[0,15],north:[0,-15],west:[-15,0],east:[15,0]}[direction];m.x=world.hero.x+delta[0];m.y=world.hero.y+delta[1];m.hp=m.maxHP=100000;m.alive=true;
 session.respawn=0;const old=Math.random;Math.random=()=>.5;
 world.projectiles=[];session.combatProjectiles=[];const before=game.stats.damage,frames=[],damageTimeline=[],poseFrames=[],shots=[],images=[];let duration,release=null;
 try{
 const accepted=heroAttack(m,1,skill?{damageType:'physical'}:null);if(!accepted)throw Error('Strike fixture rejected '+JSON.stringify({scene,area:game.area,hero:world.hero,target:{x:m.x,y:m.y,alive:m.alive},clear:navigator().clear(world.hero,m),range:getDerived().range,respawn:session.respawn}));duration=basicAttackPose()?.duration||controller?.snapshot().duration||.22;
 const canvas=document.createElement('canvas');canvas.width=200;canvas.height=200;
 for(let i=0;i<8;i++){
  const dt=duration*(i===0?.01:.125);world.time+=dt;if(controller)controller.step(dt,{inCombat:true,direction:world.hero.direction});else if(!skill)stepBasicAttack(dt);else if(i)world.hero.attackAnim=Math.max(0,world.hero.attackAnim-dt);stepCombatVfx(dt);
  const count=paperDollReview.snapshot().draws,damageBeforeRender=game.stats.damage;
  window.drawnProjectiles=[];presentWorld();
  if(game.stats.damage!==damageBeforeRender)throw Error('Rendering dealt damage');
  frames.push(paperDollReview.snapshot().draws>count);if(['sword','brawler'].includes(game.classId))images.push(this.capture());damageTimeline.push(game.stats.damage-before);poseFrames.push(paperDollReview.snapshot().lastPose?.frameIndex);shots.push((window.drawnProjectiles||[]).map(p=>({...p})));if(!release&&session.combatProjectiles.length)release=paperDollReview.snapshot().lastRelease;
 }
 }finally{Math.random=old;}
 const result={damage:game.stats.damage-before,images,frames,damageTimeline,poseFrames,shots,release,finalRelease:paperDollReview.snapshot().lastRelease,duration};cancelBasicAttack();controller?.reset('front');return result;
}, stress({speed=1,fps=60,spike=false,cancel=false,retime=false}){
 autoPlay=false;autoSkills=false;travelPath=[];world.spawnClock=1e9;cancelBasicAttack();this.combatFixture('east');const controller=classCombatController();controller?.reset('front');
 const m=livingMobs()[0];m.x=world.hero.x+15;m.y=world.hero.y;m.hp=m.maxHP=100000;m.alive=true;m.speed=0;m.attackClock=1e9;m.attack=0;m.defense=0;world.mobs=[m];world.target=m;world.projectiles=[];session.combatProjectiles=[];session.respawn=0;this.speed=speed;
 const old=Math.random;Math.random=()=>.5;const damage=game.stats.damage,beforeEnergy=game.energy;let first=null,firstPNG=null,hits=0,total=0,changed=false,cancelled=false;
 try{
  heroAttack(m);const duration=(basicAttackPose()||controller?.snapshot()).duration;
  for(let frame=0;total<duration+.6&&frame<800;frame++){
   const dt=spike&&frame===0?.22:1/fps;
   if(cancel&&!cancelled&&total>duration*.1){cancelBasicAttack();controller?.reset('front');cancelled=true;}
   if(retime&&!changed&&total>duration*.1){this.speed=speed*2;changed=true;}
   for(let left=dt;left>1e-8;left-=.05){const oldDamage=game.stats.damage;tick(Math.min(.05,left));if(game.stats.damage!==oldDamage)hits++;}total+=dt;
   const beforeDraw=game.stats.damage;window.drawnProjectiles=[];presentWorld();if(game.stats.damage!==beforeDraw)throw Error('Rendering dealt damage');
   if(!first&&window.drawnProjectiles?.length){const p=window.drawnProjectiles[0];first={pose:paperDollReview.snapshot().lastPose,release:paperDollReview.snapshot().lastRelease,elapsed:p.elapsed,phase:p.phase,x:p.x,y:p.y};firstPNG=ctx.canvas.toDataURL();}
  }
  return {first,firstPNG,hits,damage:game.stats.damage-damage,energySpent:beforeEnergy-game.energy,locked:!!basicAttackPose()||!!controller?.locked()};
 }finally{Math.random=old;delete this.speed;cancelBasicAttack();controller?.reset('front');}
}, factionSkills(){
 const faction=game.factionId,rows=[];try{for(const id of ['pirate','marine','revolutionary','government']){game.factionId=id;configureFactionVisual();const result=this.strike('south',true);rows.push({faction:id,frames:result.frames});}return rows;}finally{game.factionId=faction;configureFactionVisual();}
}, meleeContinuity(){
 autoPlay=false;autoSkills=false;keys.clear();travelPath=[];world.spawnClock=1e9;cancelBasicAttack();classCombatController()?.reset('front');
 const m=world.mobs[0];Object.assign(m,{x:world.hero.x+15,y:world.hero.y,hp:100000,maxHP:100000,alive:true,attackClock:1e9,speed:0});world.target=m;
 const equipment=JSON.stringify(game.equipment),old=Math.random,options=game.devOptions;game.devOptions={...options,godMode:false};game.hp=getDerived().maxHP;Math.random=()=>.99;const rows=[];
 try{heroAttack(m);takeDamage(1,m);for(let i=0;i<100;i++){tick(.025);const before=paperDollReview.snapshot().draws;presentWorld();const s=paperDollReview.snapshot();rows.push({modular:s.draws>before,action:classCombatController()?.snapshot().action,pose:s.lastPose});}return {rows,equipmentKept:JSON.stringify(game.equipment)===equipment};}
 finally{game.devOptions=options;Math.random=old;cancelBasicAttack();classCombatController()?.reset('front');}
}, transitions(){
 this.walkFixture('east');const rows=[],images=[],step=(name,n)=>{for(let i=0;i<n;i++)tick(1/60);window.drawnProjectiles=[];presentWorld();const s=paperDollReview.snapshot();rows.push({name,pose:s.lastPose,gait:s.motion.gait,locked:!!basicAttackPose()||!!classCombatController()?.locked()});images.push(this.capture());};
 keys.clear();step('idle',1);keys.add('d');step('walk-east',12);const phase=paperDollReview.snapshot().motion.gait.phase;keys.delete('d');keys.add('a');step('turn-west',1);if(paperDollReview.snapshot().motion.gait.phase===0)throw Error('Direction reset gait');
 const m=world.mobs[0];Object.assign(m,{x:world.hero.x-15,y:world.hero.y,hp:100000,maxHP:100000,alive:true});world.target=m;heroAttack(m);step('walk-attack',1);step('attack-walk',180);
 const old=Math.random;Math.random=()=>.5;try{takeDamage(1,m);}finally{Math.random=old;}step('walk-hurt-or-legacy',1);step('hurt-walk',70);keys.clear();step('walk-idle',20);cancelBasicAttack();classCombatController()?.reset('front');return {rows,images};
}, visibility(){
 cancelBasicAttack();classCombatController()?.reset('front');heroAttack(world.mobs[0]);for(let i=0;i<5;i++)tick(.05);const before=paperDollReview.snapshot();
 Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));const hidden=paperDollReview.snapshot();tick(.05);Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;const resumed=paperDollReview.snapshot();cancelBasicAttack();classCombatController()?.reset('front');return {before,hidden,resumed};
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
 inspector=b.new_page(viewport={'width':1366,'height':900});inspector.goto(BASE+'tools/paper-doll-inspector/index.html?pack=complete',wait_until='networkidle');inspector.wait_for_function('window.__paperDollInspector?.state().mode==="draft"')
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
 q.on('pageerror',lambda e:(errors.append(str(e)),print('PAGEERROR:',e,flush=True)))
 c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'));c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
 def game_route(route):
  response=route.fetch();s=response.text();needle='  window.__mareDiagnostics=';assert needle in s
  s=s.replace('function getDerived(', 'function originalDerived(').replace('function originalDerived(', 'function getDerived(...args){const s=originalDerived(...args);if(Number.isFinite(window.__completeTest?.speed)){s.speed=__completeTest.speed;s.accuracy=1;s.crit=0;}return s;}\n  function originalDerived(')
  route.fulfill(response=response,body=s.replace(needle,HOOK+needle))
 c.route('**/game.js*',game_route)
 c.add_init_script('''window.addEventListener('DOMContentLoaded',()=>{const draw=MareCombatVfx.drawProjectile;MareCombatVfx.drawProjectile=function(ctx,p,options){(window.drawnProjectiles ||= []).push({x:p.x,y:p.y,origin:options.origin||p.origin,elapsed:p.elapsed,phase:p.phase});return draw.call(this,ctx,p,options)}});''')
 q.goto(BASE,wait_until='networkidle');q.wait_for_function('typeof window.__mareDiagnostics==="function"');q.locator('#characterName').fill('Teste de adagas');q.locator('#nextToClass').click();q.locator('[data-class='+CLASS+']').click();q.locator('#createCharacter').click();q.clock.run_for(200)
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
 if CLASS in CLASSES:
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
  q.evaluate('__completeTest.restoreWalkTarget();__completeTest.combatFixture()')
 coverage=q.evaluate("fetch('pixellab-pip-generations/paper-doll-complete-20261026/review-pack.json').then(r=>r.json()).then(p=>p.coverage['attack-"+CATEGORY+"'])")
 rows=[]
 for d in ['south','west','east','north']:
  result=q.evaluate('(d)=>__completeTest.strike(d)',d);assert result['damage']>0,(CLASS,d,result);assert result['frames']==[d in coverage]*8,(d,result);images=result.pop('images');rows.append(result)
  if images:
   frames=[Image.alpha_composite(Image.new('RGBA',(200,200),'#203333'),Image.open(io.BytesIO(base64.b64decode(v.split(',')[1]))).convert('RGBA')).convert('RGB') for v in images]
   sheet=Image.new('RGB',(1600,200),'#203333')
   for i,frame in enumerate(frames):sheet.paste(frame,(i*200,0))
   sheet.save(OUT/('attack-'+d+'.png'));frames[0].save(OUT/('attack-'+d+'.gif'),save_all=True,append_images=frames[1:],duration=max(40,int(result['duration']*125)),loop=0)
 assert len({r['damage'] for r in rows})==1,rows
 for r in rows: assert r['damageTimeline'][0]==0 and sum(a!=b for a,b in zip(r['damageTimeline'],r['damageTimeline'][1:]))==1,r
 if CATEGORY in ['firearm','tech','focus']:
  for r in rows:
   first=next(i for i,shots in enumerate(r['shots']) if shots)
   assert r['poseFrames'][first]==3,(CLASS,r)
   assert r['shots'][first][0]['origin']['x']==r['release']['x'] and r['shots'][first][0]['origin']['y']==r['release']['y']
   assert r['shots'][first][0]['elapsed']==0 and r['shots'][first][0]['phase']=='flight'
 skill=q.evaluate('__completeTest.strike("south",true)');skill.pop('images');assert skill['frames']==[CLASS in ['sword','brawler']]*8
 if CLASS in ['sword','brawler']:
  factions=q.evaluate('__completeTest.factionSkills()');assert all(all(r['frames']) for r in factions),factions
  continuity=q.evaluate('__completeTest.meleeContinuity()');assert continuity['equipmentKept'];assert all(r['modular'] for r in continuity['rows']),continuity
  if CLASS=='sword':assert any(r['action']=='hurt' for r in continuity['rows']),continuity
  (OUT/'melee-transitions.json').write_text(json.dumps(continuity,indent=2))
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
 if CATEGORY in ['firearm','tech','focus']:
  stress=[]
  for fps in [30,60,120]:
   for speed in [.5,1,8]:
    case={'fps':fps,'speed':speed,'spike':fps==30};r=q.evaluate('(c)=>__completeTest.stress(c)',case)
    png=r.pop('firstPNG');
    if png and fps==30 and speed==8:(OUT/'release-spike.png').write_bytes(base64.b64decode(png.split(',')[1]))
    stress.append({'case':case,**r})
  (OUT/'stress.json').write_text(json.dumps(stress,indent=2))
  for r in stress:
   assert r['hits']==1 and r['damage']>0 and not r['locked'],r
   assert r['first']['pose']['frameIndex']==3 and r['first']['pose']['animationId']=='attack-'+CATEGORY,r
   assert r['first']['elapsed']==0 and r['first']['phase']=='flight',r
  assert len({r['damage']for r in stress})==1,stress
 extra=[]
 for flags in [{'cancel':True},{'retime':True}]:
  r=q.evaluate('(c)=>__completeTest.stress(c)',{'speed':1,'fps':60,**flags});r.pop('firstPNG');extra.append({'case':flags,**r});assert not r['locked'],r
  assert r['hits']==(0 if flags.get('cancel') else 1),r
 (OUT/'interruptions.json').write_text(json.dumps(extra,indent=2))
 transition=q.evaluate('__completeTest.transitions()');images=transition.pop('images');(OUT/'transitions.json').write_text(json.dumps(transition,indent=2))
 assert [r['pose']['animationId'] for r in [transition['rows'][0],transition['rows'][-1]]]==['idle','idle'],transition
 assert transition['rows'][3]['locked'] and not transition['rows'][4]['locked'],transition
 frames=[Image.alpha_composite(Image.new('RGBA',(200,200),'#203333'),Image.open(io.BytesIO(base64.b64decode(v.split(',')[1]))).convert('RGBA')).convert('RGB')for v in images];frames[0].save(OUT/'transitions.gif',save_all=True,append_images=frames[1:],duration=250,loop=0)
 visibility=q.evaluate('__completeTest.visibility()');assert visibility['hidden']['presentation']['suspended'] and visibility['hidden']['presentation']['pending']==0;assert not visibility['resumed']['presentation']['suspended'] and not visibility['resumed']['lastRelease'];(OUT/'visibility.json').write_text(json.dumps(visibility,indent=2))
 assert not errors,errors
 (OUT/'result.json').write_text(json.dumps({'coverage':coverage,'hits':rows,'skill':skill,'errors':errors},indent=2));b.close()
print(CLASS, 'complete pilot: 80 poses in four directions, actual attack clock, single impact, skills, mobile and normal save passed.')
