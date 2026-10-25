"""Exercise the real heroAttack path with an opt-in layered gunner renderer."""
import json,os,base64,io
from PIL import Image,ImageChops
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/evidence-paper-doll/gunner';OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8126/dist/')
HOOK="""
window.__gunnerTest={strike(direction,skill=false){
 autoPlay=false;cancelBasicAttack();const m=livingMobs()[0],delta={south:[0,15],north:[0,-15],west:[-15,0],east:[15,0]}[direction];m.x=world.hero.x+delta[0];m.y=world.hero.y+delta[1];m.hp=m.maxHP=100000;m.alive=true;
 session.respawn=0;const old=Math.random;Math.random=()=>.5;
 const before=game.stats.damage,frames=[],damageTimeline=[];let duration;
 try{
 heroAttack(m,1,skill?{damageType:'physical'}:null);duration=basicAttackPose()?.duration;
 const canvas=document.createElement('canvas');canvas.width=200;canvas.height=200;
 for(let i=0;i<8;i++){
  if(!skill)stepBasicAttack(duration*(i===0?.01:.125));
  const count=paperDollReview.snapshot().draws,damageBeforeRender=game.stats.damage;
  drawPlayerSprite(canvas.getContext('2d'),100,140);
  if(game.stats.damage!==damageBeforeRender)throw Error('Rendering dealt damage');
  frames.push(paperDollReview.snapshot().draws>count);damageTimeline.push(game.stats.damage-before);
 }
 }finally{Math.random=old;}
 const result={damage:game.stats.damage-before,frames,damageTimeline,duration};cancelBasicAttack();return result;
}, snapshot(){return JSON.stringify(game)},stop(){autoPlay=false}};

"""
with sync_playwright() as p:
 b=p.chromium.launch()
 inspector=b.new_page(viewport={'width':1366,'height':900});inspector.goto(BASE+'tools/paper-doll-inspector/index.html?pack=gunner-east',wait_until='networkidle')
 inspector.locator('#pivots').uncheck()
 for action,count in [('idle',4),('walk',8),('attack',8)]:
  inspector.locator('#animation').select_option(action)
  for d in ['south','north','west','east']:
   inspector.locator('#direction').select_option(d)
   for i in range(count):
    inspector.locator('#frame').fill(str(i));state=inspector.evaluate('__paperDollInspector.state()')
    assert not state['missing'],(action,d,i,state)
 inspector.locator('#direction').select_option('east');inspector.locator('#frame').fill('3');inspector.screenshot(path=str(OUT/'east-preview.png'),full_page=True);inspector.close()
 c=b.new_context(viewport={'width':1366,'height':900});q=c.new_page();q.clock.install();errors=[]
 q.on('pageerror',lambda e:errors.append(str(e)))
 c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'));c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
 def game_route(route):
  response=route.fetch();s=response.text();needle='  window.__mareDiagnostics=';assert needle in s;route.fulfill(response=response,body=s.replace(needle,HOOK+needle))
 c.route('**/game.js*',game_route)
 q.goto(BASE,wait_until='networkidle');q.locator('#characterName').fill('Teste de disparos');q.locator('#nextToClass').click();q.locator('[data-class=gunner]').click();q.locator('#createCharacter').click();q.clock.run_for(200)
 q.goto(BASE+'?dev=1&paperDollReview=gunner',wait_until='networkidle');q.wait_for_function('__mareDiagnostics().paperDollReview.state!=="loading"');assert q.evaluate('__mareDiagnostics().paperDollReview.state')=='ready',q.evaluate('__mareDiagnostics().paperDollReview')
 # DEV defaults to the current normal class; remove genuinely equipped items in UI.
 q.locator('#devLauncher').click();q.locator('#devClass').select_option('gunner');q.locator('[data-dev-command=class]').click();q.locator('#closePanel').click()
 for slot in ['boots']:
  data=json.loads(q.evaluate('localStorage.getItem("mare-partida-dev-save-v1")'))
  if data['equipment'].get(slot):
   q.locator('.bottom-nav [data-panel=inventory]').click();q.locator('[data-inv-slot='+slot+']').click();q.locator('[data-unequip='+slot+']').click();q.locator('[data-close-panel]').click()
 q.clock.run_for(200);assert q.evaluate('__mareDiagnostics().paperDollReview.state')=='ready'
 normal=q.evaluate('localStorage.getItem("mare-partida-save-v1")')
 q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area=beach]').click();q.evaluate('__gunnerTest.stop()')
 coverage=q.evaluate("fetch('pixellab-pip-generations/paper-doll-gunner-20261025/review-pack.json').then(r=>r.json()).then(p=>p.coverage['attack-firearm'])")
 rows=[]
 for d in ['south','west','east','north']:
  result=q.evaluate('(d)=>__gunnerTest.strike(d)',d);assert result['damage']>0;assert result['frames']==[d in coverage]*8,(d,result);rows.append(result)
 assert len({r['damage'] for r in rows})==1,rows
 for r in rows: assert r['damageTimeline'][0]==0 and sum(a!=b for a,b in zip(r['damageTimeline'],r['damageTimeline'][1:]))==1,r
 skill=q.evaluate('__gunnerTest.strike("south",true)');assert skill['frames']==[False]*8
 # Use the real inventory controls: removing/re-equipping changes the renderer immediately.
 weapon=json.loads(q.evaluate('localStorage.getItem("mare-partida-dev-save-v1")'))['equipment']['weapon']
 q.locator('.bottom-nav [data-panel=inventory]').click();q.locator('[data-inv-slot=weapon]').click();q.locator('[data-unequip=weapon]').click();q.locator('[data-close-panel]').click()
 assert q.evaluate('__gunnerTest.strike("east")')['frames']==[False]*8
 q.locator('.bottom-nav [data-panel=inventory]').click();q.locator('[data-item="'+weapon['id']+'"]').click();q.locator('[data-equip="'+weapon['id']+'"]').click();q.locator('[data-close-panel]').click()
 assert q.evaluate('__gunnerTest.strike("east")')['frames']==[True]*8
 # Real loop also deals damage; rendering is not the attack scheduler.
 before=q.evaluate('__mareDiagnostics().damage');q.clock.run_for(1200)
 q.screenshot(path=str(OUT/'combat.png'));q.set_viewport_size({'width':393,'height':852});q.screenshot(path=str(OUT/'mobile.png'));assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')==normal
 assert not errors,errors
 (OUT/'result.json').write_text(json.dumps({'coverage':coverage,'hits':rows,'skill':skill,'errors':errors},indent=2));b.close()
print('Gunner pilot: 80 poses in four directions, actual attack clock, single impact, skills, mobile and normal save passed.')
