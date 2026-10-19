"""Five explicit fusion materials, dynamic owned stock and real consumption in isolated saves."""
import copy,json
from playwright.sync_api import sync_playwright
from polish_support import *
OUT=ROOT/'docs/evidence-fusion-slots';OUT.mkdir(parents=True,exist_ok=True)
results=[];errors=[]
def record(name):results.append(dict(test=name,passed=True));print(name+': passed',flush=True)
def same(q,g):
 a=saved(q)
 for k in ['equipment','inventory','gold','materials','forgeSeq','forgeHistory']:assert a.get(k)==g.get(k),k
def ids(q):return q.locator('[data-fusion-slot-index]').evaluate_all('(xs)=>xs.map(x=>x.dataset.fusionMaterialId)')
def count(q):return q.locator('.forge2-material-slot.filled').count()
def tab(q,mode):q.locator('[data-forge-tab=fusion]').click();q.locator('[data-forge-fusion-mode='+mode+']').click()
def accept(q):q.locator('[data-confirm-accept]').click()
def shot(q,name):
 q.locator('#dialogBody').evaluate('(e)=>e.scrollTop=0')
 for s in ['.forge2-selection','.forge2-operation']:q.locator(s).evaluate('(e)=>e.scrollTop=0')
 q.wait_for_function("[...document.querySelectorAll('#dialogBody img')].every(i=>i.complete&&i.naturalWidth>0)")
 assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
 assert q.locator('.forge2-fusion-workspace').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),q.locator('.forge2-fusion-workspace').evaluate('(e)=>({width:e.clientWidth,scroll:e.scrollWidth,children:[...e.children].map(x=>({width:x.clientWidth,scroll:x.scrollWidth}))})')
 for s in ['.forge2-selection','.forge2-fusion-materials','.forge2-fusion-details']:
  box=q.locator(s).bounding_box();assert box['x']>=0 and box['x']+box['width']<=q.viewport_size['width']+1,(name,s,box)
 q.screenshot(path=str(OUT/(name+'.png')))
def seed(template):
 g=fixture(template);g.update(gold=100000,materials=1000);g['inventory']=[]
 for i in range(10):g['inventory'].append({'id':f'e{i}','def':0,'level':i+1,'plus':i%3,'rarity':'common','locked':i==9})
 for i in range(3):g['inventory'].append({'id':f'r{i}','def':6,'level':5,'plus':0,'rarity':'rare','locked':False})
 for attr,n,quantity,locked in [('for',1,11,False),('for',1,1,True),('des',1,2,False),('des',2,1,True),('int',3,1,False),('esp',5,1,False)]:
  index=['for','des','vit','int','esp'].index(attr)*5+n-1
  for i in range(quantity):g['inventory'].append({'id':f'{attr}{n}-{locked}-{i}','def':33+index,'pearlId':f'pearl_{attr}_{n}','level':1,'plus':0,'locked':locked})
 return g
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);c,q=page_for(b,errors=errors);template=create(q);c.close()
 for size in SIZES:
  suffix=f'{size[0]}x{size[1]}';c,q=page_for(b,seed(template),size,errors);panel(q,'forge');tab(q,'equipment');before=saved(q)
  assert q.locator('[data-fusion-slot-index]').count()==5 and count(q)==0
  assert q.locator('[data-forge-action=fuseEquipment]').is_disabled()
  assert q.locator('[data-forge-item=worn-weapon]').count()==0
  assert q.locator('[data-forge-item=e9]').get_attribute('aria-disabled')=='true'
  # Native drag onto a chosen empty slot, then clicks fill next empty positions.
  q.locator('[data-forge-item=e0]').drag_to(q.locator('[data-fusion-slot-index="4"]'));assert ids(q)[4]=='e0' and count(q)==1;same(q,before)
  assert q.locator('[data-forge-item=r0]').get_attribute('aria-disabled')=='true'
  q.locator('[data-forge-item=r0]').dispatch_event('click');assert count(q)==1
  q.locator('[data-forge-item=e0]').dispatch_event('click');assert count(q)==1
  for i in range(1,5):q.locator(f'[data-forge-item=e{i}]').click();assert count(q)==i+1
  assert len(set(ids(q)))==5;same(q,before)
  selected=ids(q);q.locator('[data-fusion-slot-index="1"]').click();assert ids(q)[1]=='' and count(q)==4;assert q.locator('[data-forge-action=fuseEquipment]').is_disabled();assert ids(q)[4]=='e0'
  q.locator('[data-forge-item='+selected[1]+']').click();assert count(q)==5
  q.locator('[data-forge-clear]').click();assert count(q)==0;same(q,before)
  for i in range(5):q.locator(f'[data-forge-item=e{i}]').click()
  selected=ids(q);shot(q,'equipment-filled-'+suffix)
  q.locator('[data-forge-action=fuseEquipment]').click();same(q,before);assert 'Comum → Incomum' in q.locator('#confirmationMessage').inner_text();q.screenshot(path=str(OUT/f'equipment-confirm-{suffix}.png'));q.locator('[data-confirm-cancel]').click();same(q,before);assert ids(q)==selected
  q.locator('[data-forge-action=fuseEquipment]').click();accept(q);after=saved(q);assert len(after['inventory'])==len(before['inventory'])-4 and after['equipment']==before['equipment'];assert not any(i['id'] in selected for i in after['inventory']);assert count(q)==0
  assert q.locator('#forgeOperationResult.success').is_visible();shot(q,'equipment-result-'+suffix)
  # Actual pearl stock only. Locked stacks remain visible, never consumable.
  tab(q,'pearls');assert q.locator('[data-forge-fusion-pearl]').count()==5
  assert q.locator('[data-forge-fusion-pearl=pearl_des_2]').get_attribute('aria-disabled')=='true'
  assert 'bloqueada' in q.locator('[data-forge-fusion-pearl=pearl_des_2]').inner_text()
  assert q.locator('[data-forge-fusion-pearl=pearl_esp_5]').get_attribute('aria-disabled')=='true'
  q.locator('[data-forge-pearl-filter=attribute]').select_option('strength');assert q.locator('[data-forge-fusion-pearl]').count()==1
  q.locator('[data-forge-pearl-filter=level]').select_option('2');assert not q.locator('[data-forge-fusion-pearl]').count()
  q.locator('[data-forge-pearl-filter=attribute]').select_option('');q.locator('[data-forge-pearl-filter=level]').select_option('')
  q.locator('#forgePearlSearch').fill('Destreza');assert q.locator('[data-forge-fusion-pearl]').count()==2;q.locator('#forgePearlSearch').fill('')
  before=saved(q);q.locator('[data-forge-fusion-pearl=pearl_des_1]').click();q.locator('[data-forge-fusion-pearl=pearl_des_1]').click();assert count(q)==2
  q.locator('[data-forge-fusion-pearl=pearl_des_1]').dispatch_event('click');assert count(q)==2
  assert q.locator('[data-forge-fusion-pearl=pearl_for_1]').get_attribute('aria-disabled')=='true'
  q.locator('[data-forge-fusion-pearl=pearl_for_1]').dispatch_event('click');assert count(q)==2;same(q,before)
  q.locator('[data-forge-clear]').click();assert count(q)==0
  for i in range(5):q.locator('[data-forge-fusion-pearl=pearl_for_1]').click();assert count(q)==i+1
  selected=ids(q);assert len(set(selected))==5;same(q,before)
  q.locator('[data-forge-fusion-pearl=pearl_for_1]').dispatch_event('click');assert ids(q)==selected
  q.locator('[data-fusion-slot-index="2"]').click();assert count(q)==4;q.locator('[data-forge-fusion-pearl=pearl_for_1]').click();assert count(q)==5
  shot(q,'pearls-filled-'+suffix)
  q.locator('[data-forge-action=fuse]').click();same(q,before);assert all('Slot '+str(i) in q.locator('#confirmationMessage').inner_text() for i in range(1,6));q.locator('[data-confirm-cancel]').click();same(q,before)
  q.evaluate('Math.random=()=>0');q.locator('[data-forge-action=fuse]').click();accept(q);after=saved(q)
  assert after['gold']==before['gold']-40 and len(after['inventory'])==len(before['inventory'])-4 and count(q)==0
  assert q.locator('[data-forge-fusion-pearl=pearl_for_2]').count()==1
  assert '6 disponíveis' in q.locator('[data-forge-fusion-pearl=pearl_for_1]').inner_text()
  assert any(i['id']=='for1-True-0' for i in after['inventory'])
  shot(q,'pearls-success-'+suffix)
  # Refill and fail: exactly selected copies and gold consumed, no output.
  for i in range(5):q.locator('[data-forge-fusion-pearl=pearl_for_1]').click()
  before=saved(q);q.evaluate('Math.random=()=>0.999');q.locator('[data-forge-action=fuse]').click();accept(q);after=saved(q)
  assert after['gold']==before['gold']-40 and len(after['inventory'])==len(before['inventory'])-5 and count(q)==0
  assert '1 disponíveis' in q.locator('[data-forge-fusion-pearl=pearl_for_1]').inner_text();assert q.locator('#forgeOperationResult.failure').is_visible();shot(q,'pearls-failure-'+suffix)
  committed=saved(q);q.reload();q.wait_for_load_state('networkidle')
  for k in ['equipment','inventory','gold','materials','forgeSeq','forgeHistory']:assert saved(q)[k]==committed[k]
  record('five_slot_flows_'+suffix);c.close()
 # All five copies consumed disappear; new output appears without reopening.
 g=seed(template);g['inventory']=[i for i in g['inventory'] if i.get('pearlId')=='pearl_for_1' and not i['locked']][:5]
 c,q=page_for(b,g,errors=errors);panel(q,'forge');tab(q,'pearls');q.evaluate('Math.random=()=>0')
 for i in range(5):q.locator('[data-forge-fusion-pearl=pearl_for_1]').click()
 q.locator('[data-forge-action=fuse]').click();accept(q);assert q.locator('[data-forge-fusion-pearl=pearl_for_1]').count()==0;assert q.locator('[data-forge-fusion-pearl=pearl_for_2]').count()==1;c.close();record('depleted_stock_hidden_new_stock_visible')
 g['inventory']=[];c,q=page_for(b,g,errors=errors);panel(q,'forge');tab(q,'pearls');assert q.get_by_text('Você não possui pérolas disponíveis para fusão',exact=True).is_visible();assert q.locator('[data-forge-fusion-pearl]').count()==0;shot(q,'empty-stock');c.close();record('empty_inventory_message')
 # Actual hunt rewards update an already-open grid without changing tabs.
 g=fixture(template);g['level']=30;g['inventory']=[];g['hp']=10000
 for item in g['equipment'].values():item.update(rarity='legendary',level=30,plus=20)
 c,q=page_for(b,g,errors=errors);q.locator('#enterHunt').click();q.locator('[data-area][data-current=true]').click();panel(q,'forge');tab(q,'pearls');assert not q.locator('[data-forge-fusion-pearl]').count();q.evaluate('Math.random=()=>0');q.clock.run_for(30000)
 assert q.evaluate('__mareDiagnostics().kills')>0;assert q.locator('[data-forge-fusion-pearl=pearl_for_1]').count()==1
 assert q.locator('[data-forge-tab=fusion]').get_attribute('aria-selected')=='true';shot(q,'live-loot-update');c.close();record('live_hunt_rewards_update_open_grid')
 assert not errors,errors;record('no_javascript_errors');b.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')
