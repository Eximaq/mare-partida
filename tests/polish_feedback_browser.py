"""Regression of the completed polish while keeping Forge2 transactions active."""
from playwright.sync_api import sync_playwright
from polish_support import *
OUT=ROOT/'docs/evidence-polish/feedback';OUT.mkdir(parents=True,exist_ok=True);results=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);c,q=page_for(b,errors=errors);template=create(q);c.close()
 for size in SIZES:
  c,q=page_for(b,fixture(template),size,errors);suffix=f'{size[0]}x{size[1]}'
  assert q.locator('#mainMenu [data-panel]').count()==6;assert not q.locator('#menuSizeToggle').count()
  q.locator('#mainMenu [data-panel=inventory]').hover();assert q.locator('#mainMenu [data-panel=inventory] .menu-tooltip').is_visible()
  q.screenshot(path=str(OUT/f'compact-{suffix}.png'));panel(q,'inventory');q.locator('#invSearch').fill('Sabre de Coral');q.locator('[data-item=bag-1]').click();assert q.locator('.op-comparison .positive').count()>0
  before=q.evaluate('window.__mareDiagnostics().stats.power');q.locator('[data-equip=bag-1]').click();assert q.evaluate('window.__mareDiagnostics().stats.power')>before;assert q.locator('[data-inv-slot=weapon]').evaluate('(e)=>e.classList.contains("recent-equip")');assert q.locator('.op-equip-feedback').is_visible();q.screenshot(path=str(OUT/f'equip-feedback-{suffix}.png'))
  q.locator('#invSearch').fill('Espada de Ferro');q.locator('[data-item=bag-0]').click();assert q.locator('.op-comparison .negative').count()>0
  q.locator('#invSearch').fill('');q.locator('#invSort').select_option('power');q.locator('#invRarity').select_option('rare');assert q.locator('.op-grid [data-item]').count()>0;q.locator('#invRarity').select_option('all');q.locator('[data-auto-equip]').click();assert q.locator('.recent-equip').count()>0
  assert q.locator('.op-grid').evaluate('(e)=>getComputedStyle(e).gridTemplateColumns.split(" ").length===7&&getComputedStyle(e).gridTemplateRows.split(" ").length===5');close(q)
  panel(q,'character');old=saved(q)['attributes'];q.locator('[data-attribute-quantity="5"]').click();q.locator('[data-attribute-add=strength]').click();q.locator('#cancelAttributes').click();assert saved(q)['attributes']==old
  panel(q,'character');q.locator('[data-attribute-add=strength]').click();q.locator('#confirmAttributes').click();assert q.locator('.character-layout').evaluate('(e)=>e.classList.contains("attributes-confirmed")');assert saved(q)['attributes']['strength']==old['strength']+5
  q.emulate_media(reduced_motion='reduce');assert q.locator('.character-allocation').evaluate('(e)=>getComputedStyle(e).animationName')=='none';close(q)
  for key in ['forge','map','contracts','help']:
   q.locator('.bottom-nav [data-panel='+('modes' if key=='map' else key)+']').focus();q.keyboard.press('Enter');assert q.locator('#panelOverlay').is_visible();close(q)
  results.append({'test':'polish_feedback_'+suffix,'passed':True,'detail':'Icon-only menu, hover names and keyboard access, real positive/negative equip deltas, slot flash, filters/sort/best, 7x5 grid, cancel/confirm, reduced motion and keyboard routes.'});print('polish_feedback_'+suffix+': passed',flush=True);c.close()
 assert not errors,errors;b.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
