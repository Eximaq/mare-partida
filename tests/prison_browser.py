"""Unavailable prison preview, save-safe box opening and exclusive global loot."""
import copy,json
from playwright.sync_api import sync_playwright
from polish_support import *
OUT=ROOT/'docs/evidence-impel-down';OUT.mkdir(exist_ok=True)
results=[];errors=[]
def record(name):results.append(dict(test=name,passed=True));print(name+': passed',flush=True)
def diag(q):return q.evaluate('__mareDiagnostics()')
def prison(q):panel(q,'prison')

def openbox(q,id):
 q.locator('[data-inv-category=consumables]').click();q.locator(f'[data-item="{id}"]').click();q.locator(f'[data-open-pearl-box="{id}"]').click()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);c,q=page_for(b,errors=errors);q.clock.run_for(300);template=create(q);c.close()
 for size in SIZES+[(393,852),(320,568)]:
  g=fixture(template);c,q=page_for(b,g,size,errors);before=saved(q);initial=diag(q)
  q.keyboard.press('m');assert q.locator('#dialogTitle').inner_text()=='Modos de jogo'
  assert q.locator('[data-mode=map],[data-mode=prison]').count()==2;assert not q.locator('[data-island],.prison-window').count()
  q.screenshot(path=str(OUT/f'modes-{size[0]}x{size[1]}.png'))
  q.locator('[data-mode=prison]').click();assert q.locator('#dialogTitle').inner_text()=='Impel Down'
  assert q.locator('#prisonFloorTitle').inner_text()=='Andar 1'
  assert q.locator('[data-prison-step="-1"]').is_disabled() and q.locator('[data-prison-step="1"]').is_disabled()
  assert q.locator('[data-prison-enter]').is_disabled();q.locator('[data-prison-enter]').evaluate('(e)=>{e.disabled=false;e.click()}')
  assert saved(q)==before and diag(q)['scene']==initial['scene']
  assert q.locator('.prison-monster-card').count()==2
  q.wait_for_function('[...document.querySelectorAll(".prison-monster-card img")].every(i=>i.complete&&i.naturalWidth>0)')
  assert q.locator('.prison-monster-card dl').count()==2
  assert q.locator('[data-prison-milestone]').count()==10
  assert not q.locator('.prison-scaling,.prison-scaling-table,[data-prison-floor],[data-prison-tab]').count()
  assert q.locator('#dialogBody').evaluate('(e)=>!/(multiplicador|escala de dificuldade|0,5×|0[.]5×)/i.test(e.innerText)')
  assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
  q.screenshot(path=str(OUT/f'phase-{size[0]}x{size[1]}.png'))
  q.locator('[data-mode=modes]').click();q.locator('[data-mode=map]').click();assert q.locator('[data-island]').count()==8
  assert not q.locator('[data-mode=prison],[data-prison-tab]').count();assert 'Impel Down' not in q.locator('#dialogBody').inner_text()
  q.keyboard.press('Escape');assert q.locator('#mainMenu [data-panel=modes]').evaluate('(e)=>e===document.activeElement')
  record(f'modes_phase_{size[0]}x{size[1]}');c.close()
 # Existing progress limits navigation, including terminal floor 100; settings persist.
 for cleared in [4,9,99,100]:
  g=fixture(template);g['impelDown']=dict(version=1,cleared=cleared,claimed=[])
  c,q=page_for(b,g,errors=errors);prison(q);expected=min(100,cleared+1)
  assert q.locator('#prisonFloorTitle').inner_text()==f'Andar {expected}';assert q.locator('[data-prison-step="1"]').is_disabled()
  q.locator('[data-prison-step="-1"]').click();assert q.locator('#prisonFloorTitle').inner_text()==f'Andar {expected-1}'
  q.locator('[data-prison-step="1"]').click();assert q.locator('#prisonFloorTitle').inner_text()==f'Andar {expected}'
  q.locator('[data-prison-option=autoAdvance]').check();q.locator('[data-prison-option=pauseBeforeBoss]').uncheck()
  assert saved(q)['impelDown']['options']==dict(autoAdvance=True,pauseBeforeBoss=False)
  assert q.locator('[data-prison-enter]').is_disabled();q.reload();q.wait_for_load_state('networkidle');prison(q)
  assert q.locator('[data-prison-option=autoAdvance]').is_checked();assert not q.locator('[data-prison-option=pauseBeforeBoss]').is_checked()
  assert q.locator('[data-prison-enter]').is_disabled();c.close()
 record('unlocked_navigation_settings_and_terminal_floor')
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
  c,q=page_for(b,g,errors=errors);q.evaluate('MareEmberRenderer.boot');q.locator('#enterHunt').click();q.locator('[data-mode=map]').click();q.locator('[data-island][data-current=true]').click();q.locator('[data-travel-area]').click();q.evaluate('()=>{const original=Math.random;window.forcedLootRolls=0;Math.random=()=>{if(new Error().stack.includes("killMob")){window.forcedLootRolls++;return .01}return original()}}')
  start=diag(q)['kills']
  for _ in range(40):
   q.clock.run_for(3000)
   if diag(q)['kills']>=start+6:break
  assert diag(q)['kills']>=start+6,diag(q)['kills'];q.locator('#mainMenu [data-panel=modes]').click();q.evaluate('dispatchEvent(new Event("beforeunload"))')
  assert not any(i.get('pearlId') or i['def']>=33 for i in saved(q)['inventory']),saved(q)['inventory'];assert len(saved(q)['inventory'])>0;assert q.evaluate('window.forcedLootRolls')>=6
  record('exclusive_loot_forced_rolls_'+area);c.close()
 assert not errors,errors;record('no_javascript_errors');b.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
