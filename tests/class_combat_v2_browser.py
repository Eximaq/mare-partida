"""Real combat samples; reports missing production sets rather than claiming new art."""
import copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/evidence-class-combat-v2';OUT.mkdir(parents=True,exist_ok=True)
KEY='mare-partida-save-v1';URL=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
WEAPONS=dict(sword=0,brawler=2,gunner=4,rogue=12,cyborg=14,strategist=16,healer=31)
errors=[]
def page(browser,seed=None):
 c=browser.new_context(viewport={'width':1366,'height':768})
 c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'))
 c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
 c.add_init_script('Math.random=(()=>{let x=781;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}})()')
 if seed:c.add_init_script('if(!sessionStorage.seeded){localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(seed))+');sessionStorage.seeded="1"}')
 # Freeze before loading: screenshots and CI speed must not advance combat or RNG.
 q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install(time=1792500000000);q.clock.pause_at(1792500000000);q.goto(URL,wait_until='networkidle');assert q.evaluate('typeof __mareDiagnostics==="function"');q.evaluate('Promise.all([MareDawnRenderer.boot,MareEmberRenderer.boot])');return c,q
def travel(q):
 q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area=beach]').click()
def state(q):return q.evaluate('__mareDiagnostics()')
with sync_playwright() as p:
 b=p.chromium.launch();c,q=page(b);q.locator('#characterName').fill('Animacoes isoladas');q.locator('#nextToClass').click();q.locator('#createCharacter').click();q.clock.run_for(100);template=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'));c.close();rows=[]
 for cls,weapon in WEAPONS.items():
  seed=copy.deepcopy(template);seed.update(classId=cls,level=10,hp=140,energy=9999,potions=10);seed['equipment']['weapon']['def']=weapon
  c,q=page(b,seed);travel(q);seen=set();hits=0;last=state(q);captured=False
  for _ in range(1000):
   q.clock.run_for(50);d=state(q)
   if d['combat']:seen.add(d['combat']['action'])
   if d['damage']>last['damage']:
    hits+=1
    # Ranged damage belongs to a projectile already in flight, which can land
    # while the next attack is winding up. Melee still uses its impact latch.
    if d['combat'] and d['skillUses']==last['skillUses']:
     if cls in ['gunner','cyborg','strategist','healer']:
      shots=d['akuma']['combatVfx']['projectiles']
      assert any(p['phase']=='impact' for p in shots),(cls,'damage without projectile collision',shots)
     else:
      assert d['combat']['impactDone'] or (last['combat'] and last['combat']['impactDone']),(cls,last['combat'],d['combat'])
    if not captured:q.screenshot(path=str(OUT/(cls+'-combat.png')));captured=True
   last=d
   if hits>=4 and d['kills']>=2:break
  assert d['walkable'] and hits>0 and d['kills']>0,(cls,d)
  row={'classId':cls,'observed_states':sorted(seen),'impacts':hits,'kills':d['kills'],'production_combat_set':bool(d['combatAssetId']),'skill_uses':d['skillUses']}
  rows.append(row);print(json.dumps(row),flush=True);q.locator('#returnLobby').click();q.reload(wait_until='networkidle');assert state(q)['classId']==cls;c.close()
 # A marine never receives pirate combat art, including a class change after loading.
 for faction in ['marine','revolutionary','government']:
  seed=copy.deepcopy(template);seed.update(factionId=faction,classId='sword')
  c,q=page(b,seed);travel(q);q.clock.run_for(200);assert state(q)['combatAssetId'] is None;c.close()
 assert not errors,errors
 (OUT/'regression.json').write_text(json.dumps({'scope':'combat regression; missing sets remain pending','rows':rows,'errors':errors},indent=2),encoding='utf-8');b.close()
