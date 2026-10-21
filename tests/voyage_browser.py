"""Archipelago regions, inspectable destinations, previews and real travel; isolated saves."""
import json
from playwright.sync_api import sync_playwright
from polish_support import *
OUT=ROOT/'docs/evidence-arquipelago';OUT.mkdir(exist_ok=True)
results=[];errors=[]
NAMES=['Ilha Dawn','Cidade das Conchas','Orange Town','Ilha dos Animais Raros','Vila Syrup','Baratie','Parque Arlong','Loguetown']
IDS=['dawn','conchas','orange-town','animais-raros','syrup','baratie','arlong','loguetown']
def record(name):
 results.append(dict(test=name,passed=True));print(name+': passed',flush=True)
def diag(q):return q.evaluate('__mareDiagnostics()')
def items(g):return {k:g[k] for k in ['name','factionId','classId','level','xp','gold','materials','inventory','equipment','attributes']}
def choose(q,id):
 if q.viewport_size['width']<=760 and q.locator('.dungeon-details').count():q.locator('[data-voyage-back]').click()
 q.locator('[data-island='+id+']').click()
def bounds(q):
 assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
 assert q.locator('#panelOverlay .dialog').evaluate('(e)=>e.getBoundingClientRect().right<=innerWidth+1')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);c,q=page_for(b,errors=errors);q.clock.run_for(300);template=create(q);c.close()
 for size in SIZES+[(393,852),(320,568)]:
  suffix=f'{size[0]}x{size[1]}';g=fixture(template);g.update(level=11,hp=10000,energy=1000);g['preferences']['menuExpanded']=True
  for item in g['equipment'].values():item.update(rarity='legendary',level=20,plus=15)
  c,q=page_for(b,g,size,errors);before=items(saved(q));d0=diag(q)
  assert q.locator('#mainMenu [data-panel]').count()==6
  assert not q.locator('#menuSizeToggle,[data-panel=hunts]').count()
  assert q.locator('#mainMenu').bounding_box()['width']<=270
  q.locator('#mainMenu [data-panel=inventory]').hover();assert q.locator('[data-panel=inventory] .menu-tooltip').is_visible()
  panel(q,'map');assert q.locator('#dialogTitle').inner_text()=='Mapa do Arquipélago'
  east=q.locator('[data-voyage-region=east-blue]');alabasta=q.locator('[data-voyage-region=alabasta]')
  assert east.get_attribute('aria-selected')=='true';assert alabasta.is_disabled() and alabasta.get_attribute('data-status')=='locked'
  assert east.bounding_box()['y']>=q.locator('#dialogTitle').bounding_box()['y']+q.locator('#dialogTitle').bounding_box()['height']
  assert q.locator('[data-island] strong').all_text_contents()==NAMES
  assert not q.locator('.dungeon-details').count();bounds(q)
  q.screenshot(path=str(OUT/f'list-{suffix}.png'))
  for n,id in enumerate(IDS):
   choose(q,id);assert q.locator('#dungeonName').inner_text()==NAMES[n]
   assert q.locator('.dungeon-range strong').inner_text()==f'{n*10+1}–{n*10+10}'
   assert diag(q)['scene']=='lobby' and diag(q)['hero']['x']==d0['hero']['x']
   assert items(saved(q))==before;assert 'Não estimada' in q.locator('.dungeon-facts').inner_text();bounds(q)
   if n<6:
    q.wait_for_function('document.querySelector("[data-monster-preview]")?.naturalWidth>0')
    assert q.locator('.dungeon-monster').get_attribute('data-state')=='available'
    assert q.locator('[data-travel-island]').is_enabled()==(n<2)
   else:
    assert q.locator('.dungeon-monster').inner_text().endswith('Indisponível')
    assert not q.locator('[data-monster-preview]').count();assert q.locator('[data-travel-island]').is_disabled()
    assert q.locator('.dungeon-pending').inner_text()=='A definir'
   if n in [0,2]:q.screenshot(path=str(OUT/f'details-{id}-{suffix}.png'))
  alabasta.evaluate('(e)=>e.click()');assert q.locator('#dungeonName').inner_text()=='Loguetown'
  east.click();assert not q.locator('.dungeon-details').count();assert q.locator('[data-island]').count()==8
  choose(q,'dawn');q.locator('[data-travel-island=dawn]').click();assert diag(q)['map']['id']=='dawn';assert saved(q)['area']=='beach'
  panel(q,'map');assert not q.locator('.dungeon-details').count();assert q.locator('[data-island=dawn]').get_attribute('data-current')=='true'
  choose(q,'conchas');q.locator('[data-travel-island=conchas]').focus();q.keyboard.press('Space');assert diag(q)['map']['id']=='hunt';assert saved(q)['area']=='swamp'
  assert items(saved(q))==before
  q.locator('#returnLobby').click();q.locator('#enterHunt').click();q.locator('[data-mode=map]').click();choose(q,'dawn');q.locator('[data-travel-island=dawn]').click();assert saved(q)['area']=='beach'
  q.reload();q.wait_for_load_state('networkidle');assert items(saved(q))==before
  panel(q,'map');q.emulate_media(reduced_motion='reduce');assert q.locator('.voyage-sea').evaluate('(e)=>getComputedStyle(e,"::before").animationName')=='none'
  q.keyboard.press('Escape');assert q.locator('#mainMenu [data-panel=modes]').evaluate('(e)=>e===document.activeElement')
  record('regions_details_travel_'+suffix);c.close()
 # Entry requirements remain independent from the recommended level band.
 c,q=page_for(b,template,errors=errors);panel(q,'map');before=saved(q);choose(q,'conchas')
 assert q.locator('[data-travel-island]').is_disabled();assert 'Nv. 11' in q.locator('[data-travel-island]').inner_text()
 q.locator('[data-travel-island]').evaluate('(e)=>e.click()');assert diag(q)['scene']=='lobby' and saved(q)==before
 choose(q,'orange-town');assert q.locator('[data-travel-island]').is_disabled();assert saved(q)==before
 q.locator('[data-voyage-back]').click();q.locator('[data-island=dawn]').focus();q.keyboard.press('Enter');assert q.locator('#dungeonName').inner_text()=='Ilha Dawn'
 q.keyboard.press('Tab');assert q.locator('[data-island=conchas]').evaluate('(e)=>e===document.activeElement')
 q.keyboard.press('Escape');record('level_gate_keyboard_and_future_saves');c.close()
 # Missing configured files must use the same fallback as an unconfigured monster.
 c=b.new_context(viewport=dict(width=1366,height=768));c.route('**/__dev_version',lambda r:r.fulfill(body='stable-test'));c.route('**/assets/monsters/boss.png',lambda r:r.fulfill(status=404,body=''))
 c.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(template))+')');q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install();q.goto('http://127.0.0.1:8123/');q.wait_for_load_state('networkidle')
 panel(q,'map');choose(q,'conchas');q.wait_for_function('document.querySelector(".dungeon-monster")?.dataset.state==="unavailable"')
 assert q.locator('.dungeon-monster').inner_text().endswith('Indisponível');assert not q.locator('[data-monster-preview]').count()
 choose(q,'dawn');q.wait_for_function('document.querySelector("[data-monster-preview]")?.naturalWidth>0');record('missing_preview_fallback_and_recovery');c.close()
 c=b.new_context(viewport=dict(width=1366,height=768));c.route('**/__dev_version',lambda r:r.fulfill(body='stable-test'))
 c.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(template))+')');q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.goto('http://127.0.0.1:8123/');q.wait_for_load_state('networkidle');panel(q,'map')
 first=q.locator('.voyage-sea').evaluate('(e)=>getComputedStyle(e,"::before").backgroundPosition');q.wait_for_timeout(250);second=q.locator('.voyage-sea').evaluate('(e)=>getComputedStyle(e,"::before").backgroundPosition');assert first!=second
 c.close();record('ocean_animation_real_clock');assert not errors,errors;record('no_javascript_errors');b.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')
