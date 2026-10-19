"""Ship destination window, real travel and icon-only HUD in isolated Chromium."""
import copy,json,time
from playwright.sync_api import sync_playwright
from polish_support import *
OUT=ROOT/'docs/evidence-voyages';OUT.mkdir(exist_ok=True)
results=[];errors=[]
def record(name):results.append(dict(test=name,passed=True));print(name+': passed',flush=True)
def diag(q):return q.evaluate('__mareDiagnostics()')
def items(g):return {k:g[k] for k in ['name','factionId','classId','level','xp','gold','materials','inventory','equipment','attributes']}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);c,q=page_for(b,errors=errors);q.clock.run_for(300);template=create(q);c.close()
 for size in SIZES+[(393,852),(320,568)]:
  suffix=f'{size[0]}x{size[1]}';g=fixture(template);g.update(level=10,hp=10000,energy=1000);g['preferences']['menuExpanded']=True
  for item in g['equipment'].values():item.update(rarity='legendary',level=20,plus=15)
  c,q=page_for(b,g,size,errors);before=items(saved(q));d0=diag(q)
  assert q.locator('#mainMenu [data-panel]').count()==6
  assert not q.locator('#menuSizeToggle,[data-panel=hunts]').count()
  assert q.locator('#mainMenu').bounding_box()['width']<=270
  assert q.locator('#mainMenu [data-panel] .menu-tooltip').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).visibility==="hidden")')
  q.locator('#mainMenu [data-panel=inventory]').hover();assert q.locator('[data-panel=inventory] .menu-tooltip').is_visible()
  q.locator('#mainMenu [data-panel=forge]').focus();assert q.locator('[data-panel=forge] .menu-tooltip').is_visible();q.keyboard.press('Enter');assert q.locator('#dialogBody[data-view=forge]').is_visible();q.keyboard.press('Escape')
  panel(q,'map');assert q.locator('#panelOverlay.voyage-mode').is_visible();assert q.locator('.voyage-destination').count()==6
  assert q.locator('[data-voyage-id=ship-1] .voyage-level').inner_text()=='Meta 1–10'
  assert q.locator('[data-voyage-id=ship-2] .voyage-level').inner_text()=='Meta 10–20'
  assert diag(q)['scene']=='lobby' and diag(q)['hero']['x']==d0['hero']['x']
  assert q.locator('.voyage-destination:disabled').count()==4
  assert q.locator('.voyage-sea').evaluate('(e)=>getComputedStyle(e,"::before").animationName')=='voyage-water'
  assert not q.locator('#emberOverview,.map-options').count()
  # No overlapping ship targets; every node remains fully inside the sea window.
  sea=q.locator('.voyage-sea').bounding_box();nodes=q.locator('.voyage-destination').all();rects=[n.bounding_box() for n in nodes]
  for r in rects:assert r['x']>=sea['x']-1 and r['y']>=sea['y']-1 and r['x']+r['width']<=sea['x']+sea['width']+1 and r['y']+r['height']<=sea['y']+sea['height']+1,(suffix,r,sea)
  for i,a in enumerate(rects):
   for bb in rects[i+1:]:assert not(a['x']<bb['x']+bb['width'] and a['x']+a['width']>bb['x'] and a['y']<bb['y']+bb['height'] and a['y']+a['height']>bb['y']),(suffix,a,bb)
  q.screenshot(path=str(OUT/f'window-{suffix}.png'))
  q.locator('[data-voyage-id=ship-1]').click();assert diag(q)['scene']=='hunt' and diag(q)['map']['id']=='embers';assert not q.locator('#panelOverlay').is_visible()
  panel(q,'map');assert q.locator('[data-voyage-id=ship-1] em').inner_text()=='Você está aqui'
  q.locator('[data-voyage-id=ship-2]').focus();q.keyboard.press('Tab');assert q.locator('#closePanel').evaluate('(e)=>e===document.activeElement');q.keyboard.press('Shift+Tab');assert q.locator('[data-voyage-id=ship-2]').evaluate('(e)=>e===document.activeElement')
  q.keyboard.press('Space');assert diag(q)['map']['id']=='hunt';assert saved(q)['area']=='swamp'
  assert items(saved(q))==before
  q.locator('#returnLobby').click();q.locator('#enterHunt').click();assert q.locator('.voyage-window').is_visible();q.locator('[data-voyage-id=ship-1]').click();assert saved(q)['area']=='beach'
  q.reload();q.wait_for_load_state('networkidle');assert items(saved(q))==before
  panel(q,'map');q.emulate_media(reduced_motion='reduce');assert q.locator('.voyage-sea').evaluate('(e)=>getComputedStyle(e,"::before").animationName')=='none';q.keyboard.press('Escape');assert q.locator('#mainMenu [data-panel=map]').evaluate('(e)=>e===document.activeElement')
  record('voyages_'+suffix);c.close()
 c,q=page_for(b,template,errors=errors);panel(q,'map');assert q.locator('[data-voyage-id=ship-2]').is_disabled();assert 'Nv. 8' in q.locator('[data-voyage-id=ship-2]').inner_text()
 before=saved(q);q.locator('[data-voyage-id=ship-2]').evaluate('(e)=>e.click()');assert diag(q)['scene']=='lobby' and saved(q)==before
 for node in q.locator('.is-future').all():node.evaluate('(e)=>e.click()')
 assert diag(q)['scene']=='lobby' and saved(q)==before;q.screenshot(path=str(OUT/'level-one-locked.png'));record('level_gate_and_future_destinations');c.close()
 # A real clock proves the ocean moves, beyond checking the declared CSS animation.
 c=b.new_context(viewport=dict(width=1366,height=768));c.route('**/__dev_version',lambda r:r.fulfill(body='stable-test'))
 c.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(template))+')');q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.goto('http://127.0.0.1:8123/');q.wait_for_load_state('networkidle');panel(q,'map')
 first=q.locator('.voyage-sea').evaluate('(e)=>getComputedStyle(e,"::before").backgroundPosition');q.wait_for_timeout(250);second=q.locator('.voyage-sea').evaluate('(e)=>getComputedStyle(e,"::before").backgroundPosition');assert first!=second,(first,second);c.close();record('ocean_animation_real_clock')
 assert not errors,errors;record('no_javascript_errors');b.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')
