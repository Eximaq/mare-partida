"""Owner's native Dawn export: real game, old saves, combat and pixel-fidelity checks."""
import copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/evidence-dawn-manual/after';OUT.mkdir(parents=True,exist_ok=True)
KEY='mare-partida-save-v1';URL=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/');errors=[]
def state(q):return q.evaluate('__mareDiagnostics()')
def saved(q,key=KEY):return json.loads(q.evaluate('(key)=>localStorage.getItem(key)',key))
def page(b,seed=None,size=(1366,768)):
 c=b.new_context(viewport={'width':size[0],'height':size[1]});c.route('**/__dev_version',lambda r:r.fulfill(body='stable'));c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'))
 c.add_init_script('Math.random=(()=>{let x=17391;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296}})()')
 if seed:c.add_init_script('if(!sessionStorage.seeded){localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(seed))+');sessionStorage.seeded="1"}')
 q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install(time=1792500000000);q.goto(URL);q.wait_for_function('typeof __mareDiagnostics==="function"');q.evaluate('Promise.all([MareDawnRenderer.boot,MareEmberRenderer.boot])');assert q.evaluate('MareDawnRenderer.stats().ready');return c,q
def travel(q):
 q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area=beach]').click();q.clock.run_for(100)
 if state(q)['autoPlay']:q.locator('#autoToggle').click()
def route(q,id):
 if q.locator('#journeyToggle').get_attribute('aria-expanded')=='false':q.locator('#journeyToggle').click()
 q.locator('#huntRoute').click();q.locator('[data-hunt-sector='+id+']').click()
 for _ in range(200):
  q.clock.run_for(250)
  if not state(q)['path']:break
 d=state(q);p=q.evaluate('(id)=>MareDawn.paths.find(p=>p.id===id)',id);assert d['walkable'] and not d['path'] and ((d['hero']['x']-p['x'])**2+(d['hero']['y']-p['y'])**2)**.5<3,(id,d['hero'])
with sync_playwright() as p:
 b=p.chromium.launch();c,q=page(b);q.locator('#characterName').fill('Nauta Dawn');q.locator('#nextToClass').click();q.locator('#nextToAppearance').click();q.locator('#createCharacter').click();q.locator('[data-confirm-accept]').click();q.clock.run_for(100);template=saved(q);c.close();high=copy.deepcopy(template);high['level']=10
 for size in [(1920,1080),(1366,768),(1280,720),(393,852),(320,568)]:
  c,q=page(b,high,size);travel(q);d=state(q);assert d['map']=={'id':'dawn','width':3584,'height':2560} and d['walkable'] and d['alive']>0;assert all(m['level']==5 and m['skin'] for m in d['mobs']);q.screenshot(path=str(OUT/f'chegada-{size[0]}.png'))
  if q.locator('#journeyToggle').get_attribute('aria-expanded')=='false':q.locator('#journeyToggle').click()
  q.locator('#huntRoute').click();assert q.locator('[data-hunt-sector]').count()==7;assert q.locator('#dialogBody').evaluate('e=>e.scrollWidth<=e.clientWidth+1');q.locator('#closePanel').click();q.locator('#returnLobby').click();q.reload();q.wait_for_function('typeof __mareDiagnostics==="function"');g=saved(q)
  for key in ['name','classId','factionId','equipment','inventory','gold','materials','claimed']:assert g[key]==high[key],key
  assert g['area']=='beach' and g['level']==10;c.close();print('Native Dawn arrival/route UI/old-save preservation',size,'passed',flush=True)
 c,q=page(b,high);travel(q);d=state(q);point=q.evaluate('MareDawn.returnPoint');box=q.locator('#worldCanvas').bounding_box();q.mouse.click(box['x']+point['x']-round(d['camera']['x']),box['y']+point['y']-round(d['camera']['y']))
 for _ in range(40):
  q.clock.run_for(250)
  if state(q)['scene']=='lobby':break
 assert state(q)['scene']=='lobby','Quay return click failed';c.close()
 ready=copy.deepcopy(high);ready['hunts']['areas']['beach']['kills']=12
 c,q=page(b,ready);q.locator('#devLauncher').click();q.locator('[data-dev-enter]').click();q.wait_for_url('**/?dev=1');q.wait_for_function('__mareDiagnostics().dev.active');q.locator('#devLauncher').click();q.locator('[data-dev-option=godMode]').check();q.locator('[data-dev-travel=beach]').click();q.evaluate('Promise.all([MareDawnRenderer.boot,MareEmberRenderer.boot])')
 if state(q)['autoPlay']:q.locator('#autoToggle').click()
 q.clock.run_for(100);q.screenshot(path=str(OUT/'chegada.png'))
 for id in ['cais','corsarios','estaleiro','mercado','ancoras','farol','caldeira']:route(q,id);q.screenshot(path=str(OUT/(id+'.png')))
 # Main's East Blue rebalance keeps Dawn's boss at the end of levels1-5.
 assert any(m['type']=='boss' and m['level']==5 for m in state(q)['mobs']);warned=False
 # Reaching the sector anchor does not guarantee line of sight to the random boss spawn.
 # Walk through the real UI to a reachable point beside it; never move/spawn the boss in code.
 approach=q.evaluate('''()=>{const d=__mareDiagnostics(),boss=d.mobs.find(m=>m.type==='boss'),nav=new MareWorld.Navigation({...MareDawn.map,colliders:d.colliders});
 for(const radius of [32,48,64])for(let k=0;k<16;k++){const angle=Math.PI/2+k*Math.PI/8,p={x:boss.x+Math.cos(angle)*radius,y:boss.y+Math.sin(angle)*radius};
 if(nav.walkable(p.x,p.y)&&nav.clear(boss,p)&&nav.path(d.hero,p).length&&d.mobs.every(m=>Math.hypot(m.x-p.x,m.y-30-p.y)>=50))return p;}
 throw Error('No reachable boss approach point');}''')
 d=state(q);box=q.locator('#worldCanvas').bounding_box();zoom=d['camera']['zoom']
 q.mouse.click(box['x']+(approach['x']-d['camera']['x'])*zoom,box['y']+(approach['y']-d['camera']['y'])*zoom)
 for _ in range(200):
  q.clock.run_for(250);d=state(q);warned=warned or any(m['telegraph'] for m in d['mobs'])
  if not d['path']:break
 assert not state(q)['path'],'Boss approach path did not finish'
 assert not state(q)['autoPlay'],'Approach point must not click a monster or enable attacks'
 # Fixed-spawn monsters are neutral until hit. Explicitly select the real boss
 # through the canvas before expecting its attack warning; proximity is not aggro.
 d=state(q);boss=next(m for m in d['mobs'] if m['type']=='boss');box=q.locator('#worldCanvas').bounding_box();zoom=d['camera']['zoom']
 q.mouse.click(box['x']+(boss['x']-d['camera']['x'])*zoom,box['y']+(boss['y']-30-d['camera']['y'])*zoom)
 assert state(q)['autoPlay'],'Selecting the boss must start combat'
 # Provoke with one real hit, then wait without killing the level5 boss first.
 # Pausing auto-hunt does not disengage an already provoked neutral monster.
 for _ in range(200):
  q.clock.run_for(50);target=next((m for m in state(q)['mobs'] if m['id']==boss['id']),None)
  assert target is not None,'Boss must survive the first provoking hit'
  if target['hp']<target['maxHP']:break
 else:raise AssertionError('The selected boss never received a provoking hit')
 q.locator('#autoToggle').click();assert not state(q)['autoPlay']
 for _ in range(150):
  q.clock.run_for(200)
  if any(m['telegraph'] for m in state(q)['mobs']):warned=True;break
 assert warned,{'hero':state(q)['hero'],'bosses':[m for m in state(q)['mobs'] if m['type']=='boss']};q.screenshot(path=str(OUT/'chefe-aviso.png'))
 q.locator('#autoToggle').click();assert state(q)['autoPlay']
 for _ in range(240):
  q.clock.run_for(1000)
  if state(q)['hunt']['progress']['areas']['beach']['bosses']>0:break
 assert state(q)['hunt']['progress']['areas']['beach']['bosses']>0
 q.locator('#huntRoute').click();claim=q.locator('[data-hunt-first=beach]');assert claim.is_enabled();q.evaluate('()=>{window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error("quota")}}');claim.click();assert not state(q)['hunt']['progress']['areas']['beach']['firstRewardClaimed'];q.evaluate('()=>{Storage.prototype.setItem=window.realSet}');claim.click();assert claim.is_disabled();q.locator('#closePanel').click();q.locator('#returnLobby').click();q.reload();q.wait_for_function('typeof __mareDiagnostics==="function"');dev=saved(q,'mare-partida-dev-save-v1');items=[i for i in dev['inventory'] if i.get('origin')=='Primeira vitória · Ilha Dawn'];assert len(items)==1 and items[0]['rarity']=='rare' and items[0]['level']==1;assert not saved(q)['hunts']['areas']['beach']['bosses'];print('Seven real routes, boss/warning/victory and reward rollback/single claim/reload passed',flush=True)
 q.evaluate('MareDawnRenderer.boot')
 technical=q.evaluate('''async()=>{const make=(w,h)=>{const e=document.createElement('canvas');e.width=w;e.height=h;return e},w=MareDawn.map.width,h=MareDawn.map.height,source=new Image();source.src='assets/dawn-manual/map.png';await source.decode();const a=make(w,h),raw=make(w,h);raw.getContext('2d').drawImage(source,0,0);MareDawnRenderer.ground(a.getContext('2d'),{x:0,y:0},w,h);const ad=a.getContext('2d').getImageData(0,0,w,h).data,rd=raw.getContext('2d').getImageData(0,0,w,h).data;let changed=0,compared=0;for(let i=0;i<ad.length;i+=4)if(rd[i+3]===255){compared++;for(let j=0;j<4;j++)if(ad[i+j]!==rd[i+j])changed++;}
 let camera=0,holes=0;for(const [x,y]of [[511,511],[512,512],[1535,1535],[2047,1023],[2559,1663]]){const e=make(384,256),c=e.getContext('2d');c.translate(-x,-y);MareDawnRenderer.ground(c,{x,y},384,256);const got=c.getImageData(0,0,384,256).data,want=a.getContext('2d').getImageData(x,y,384,256).data;for(let i=0;i<got.length;i++){if(got[i]!==want[i])camera++;if(i%4===3&&got[i]!==255)holes++;}}
 const p=MareDawn.props.find(p=>p.kind==='tree'),b=p.bounds,oc=make(192,192),cx=oc.getContext('2d');cx.translate(-Math.floor(b.x),-Math.floor(b.y));cx.fillStyle='#ff00ff';cx.fillRect(b.x,b.y,b.width,b.height);const before=cx.getImageData(0,0,192,192).data;MareDawnRenderer.prop(cx,p,[{x:p.foot.x+p.foot.width/2,y:p.foot.y-12}]);const after=cx.getImageData(0,0,192,192).data;let hidden=0;for(let i=0;i<before.length;i++)if(before[i]!==after[i])hidden++;cx.fillStyle='#ff00ff';cx.fillRect(b.x,b.y,b.width,b.height);const frontBefore=cx.getImageData(0,0,192,192).data;MareDawnRenderer.prop(cx,p,[{x:p.foot.x,y:p.y+20}]);const frontAfter=cx.getImageData(0,0,192,192).data;let frontChanged=0;for(let i=0;i<frontBefore.length;i++)if(frontBefore[i]!==frontAfter[i])frontChanged++;
 const e=document.createElement('canvas');e.id='map-review';e.width=w;e.height=h;e.style.cssText='position:absolute;left:0;top:0;z-index:100000;image-rendering:pixelated';document.body.append(e);MareDawnRenderer.ground(e.getContext('2d'),{x:0,y:0},w,h);return{source_pixel_errors:changed,source_pixels_compared:compared,camera_errors:camera,uncovered_pixels:holes,occlusion_changed:hidden,front_actor_errors:frontChanged,...MareDawnRenderer.stats()};}''')
 assert technical['source_pixel_errors']==technical['camera_errors']==technical['uncovered_pixels']==technical['front_actor_errors']==0 and technical['occlusion_changed']>0 and technical['chunks']<=20,technical
 q.locator('#map-review').screenshot(path=str(OUT/'mapa-completo.png'));assert not errors,errors;(OUT/'results.json').write_text(json.dumps({'errors':errors,'map':[56,40],'browser_cases':5,'technical':technical},indent=2),encoding='utf-8');c.close();b.close();print('Native export pixels, foreground occlusion and chunk/camera checks:',technical,flush=True)
