"""Unavailable prison preview, save-safe box opening and exclusive global loot."""
import copy,json
from playwright.sync_api import sync_playwright
from polish_support import *
OUT=ROOT/'docs/evidence-impel-down';OUT.mkdir(exist_ok=True)
results=[];errors=[]
def record(name):results.append(dict(test=name,passed=True));print(name+': passed',flush=True)
def diag(q):return q.evaluate('__mareDiagnostics()')
def prison(q):panel(q,'map');q.locator('[data-prison-tab]').click()
def inspect(q,floor):
 if q.viewport_size['width']<=760 and q.locator('.prison-window.is-inspecting').count():q.locator('[data-prison-back]').click()
 q.locator(f'[data-prison-floor="{floor}"]').click()
def openbox(q,id):
 q.locator('[data-inv-category=consumables]').click();q.locator(f'[data-item="{id}"]').click();q.locator(f'[data-open-pearl-box="{id}"]').click()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);c,q=page_for(b,errors=errors);q.clock.run_for(300);template=create(q);c.close()
 for size in SIZES+[(393,852),(320,568)]:
  g=fixture(template);g.pop('impelDown',None);c,q=page_for(b,g,size,errors);before=saved(q);initial=diag(q);prison(q)
  assert q.locator('#mainMenu [data-panel]').count()==6
  assert q.locator('[data-prison-floor]').count()==100
  assert q.locator('[data-prison-floor]').evaluate_all('(es)=>es.every((e,i)=>Number(e.dataset.prisonFloor)===i+1)')
  assert q.locator('.prison-milestones span').count()==10
  assert saved(q)['impelDown']==dict(version=1,cleared=0,claimed=[])
  assert q.evaluate('!MarePrison.available && !MarePrison.canEnter(JSON.parse(localStorage.getItem("'+KEY+'")),1)')
  q.screenshot(path=str(OUT/f'prison-{size[0]}x{size[1]}.png'))
  for f in [1,10,11,20,21,30,31,50,51,91,100]:
   inspect(q,f);assert q.locator('#prisonFloorTitle').inner_text()==f'Andar {f}'
   expected='0,5×' if f<=10 else str((f+9)//10)+'×';assert q.locator('.prison-scaling strong').inner_text()==expected
   assert q.locator('[data-prison-enter]').is_disabled();q.locator('[data-prison-enter]').evaluate('(e)=>{e.disabled=false;e.click()}')
   assert saved(q)==before;assert diag(q)['scene']==initial['scene'] and diag(q)['hero']['x']==initial['hero']['x']
   assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
  q.screenshot(path=str(OUT/f'floor-100-{size[0]}x{size[1]}.png'))
  q.locator('[data-voyage-region=east-blue]').click();assert q.locator('[data-island]').count()==8;assert not q.locator('.prison-window,.dungeon-details').count()
  q.locator('[data-island=dawn]').click();assert 'pérola' not in q.locator('.dungeon-drops').inner_text().lower()
  q.locator('[data-prison-tab]').click();assert q.locator('#prisonFloorTitle').inner_text()=='Andar 1'
  q.keyboard.press('Escape');assert q.locator('#mainMenu [data-panel=map]').evaluate('(e)=>e===document.activeElement')
  record(f'prison_preview_{size[0]}x{size[1]}');c.close()
 # Existing pearls survive; boxes are inventory consumables, never forge materials.
 g=fixture(template);g['inventory']=[{'id':'box1','def':58,'level':1,'plus':0,'locked':False},{'id':'box2','def':59,'level':1,'plus':0,'locked':True},{'id':'legacy','def':33,'pearlId':'pearl_for_1','level':1,'plus':0,'locked':False}]
 c,q=page_for(b,g,errors=errors);before=saved(q);panel(q,'forge');assert q.locator('[data-forge-item=box1],[data-forge-item=box2]').count()==0;q.keyboard.press('Escape')
 panel(q,'inventory');openbox(q,'box1');q.locator('[data-confirm-cancel]').click();assert saved(q)==before
 openbox(q,'box1');q.evaluate('Math.random=()=>.6');q.locator('[data-confirm-accept]').click();after=saved(q)
 assert len(after['inventory'])==3 and not any(i['id']=='box1' for i in after['inventory']);pearl=next(i for i in after['inventory'] if i['id']=='pearl-from-box1');assert pearl['pearlId']=='pearl_int_1'
 assert next(i for i in after['inventory'] if i['id']=='legacy')==next(i for i in before['inventory'] if i['id']=='legacy')
 for k in ['equipment','gold','materials','attributes','impelDown']:assert after[k]==before[k]
 q.screenshot(path=str(OUT/'box-opened.png'));q.locator('[data-inv-category=consumables]').click();q.locator('[data-item=box2]').click();assert q.locator('[data-open-pearl-box]').is_disabled()
 q.locator('[data-inv-lock=box2]').click();openbox(q,'box2');q.locator('[data-confirm-accept]').click();assert next(i for i in saved(q)['inventory'] if i['id']=='pearl-from-box2')['pearlId']=='pearl_int_2'
 expected_inventory=copy.deepcopy(saved(q)['inventory']);q.reload();q.wait_for_load_state('networkidle');assert saved(q)['inventory']==expected_inventory;assert len([i for i in saved(q)['inventory'] if i.get('pearlId')])==3
 record('boxes_cancel_unlock_consume_same_level_and_reload');c.close()
 # A storage failure must leave the in-memory box and saved inventory unchanged.
 c,q=page_for(b,g,errors=errors);before=saved(q);panel(q,'inventory');openbox(q,'box1')
 q.evaluate('()=>{window.restoreStorage=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==="'+KEY+'")throw Error("quota test");return window.restoreStorage.call(this,k,v)}}')
 q.locator('[data-confirm-accept]').click();assert saved(q)==before;assert q.locator('[data-open-pearl-box=box1]').is_visible()
 q.evaluate('()=>{Storage.prototype.setItem=window.restoreStorage}');openbox(q,'box1');q.locator('[data-confirm-accept]').click();assert not any(i['id']=='box1' for i in saved(q)['inventory']);record('box_storage_failure_atomic');c.close()
 # Force all rare loot rolls in both existing hunts: new supply must remain absent.
 for area in ['beach','swamp']:
  g=fixture(template);g.update(area=area,level=30,hp=10000,energy=1000);g['inventory']=[]
  for item in g['equipment'].values():item.update(rarity='legendary',level=30,plus=20)
  c,q=page_for(b,g,errors=errors);q.evaluate('MareEmberRenderer.boot');q.locator('#enterHunt').click();q.locator('[data-island][data-current=true]').click();q.locator('[data-travel-area]').click();q.evaluate('()=>{const original=Math.random;window.forcedLootRolls=0;Math.random=()=>{if(new Error().stack.includes("killMob")){window.forcedLootRolls++;return .01}return original()}}')
  start=diag(q)['kills']
  for _ in range(40):
   q.clock.run_for(3000)
   if diag(q)['kills']>=start+6:break
  assert diag(q)['kills']>=start+6,diag(q)['kills'];q.locator('#mainMenu [data-panel=map]').click();q.evaluate('dispatchEvent(new Event("beforeunload"))')
  assert not any(i.get('pearlId') or i['def']>=33 for i in saved(q)['inventory']),saved(q)['inventory'];assert len(saved(q)['inventory'])>0;assert q.evaluate('window.forcedLootRolls')>=6
  record('exclusive_loot_forced_rolls_'+area);c.close()
 assert not errors,errors;record('no_javascript_errors');b.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
