"""Haki end-to-end: isolated saves, real UI, atomic unlock, resource and live combat."""
import copy,json,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for,create,saved,KEY
OUT=Path(tempfile.gettempdir())/'mare-haki-qa';OUT.mkdir(exist_ok=True)
def diag(q):return q.evaluate('__mareDiagnostics()')
def char(q):q.locator('.bottom-nav [data-panel=character]').click()
def haki(q):char(q);q.locator('#characterTabs [data-character-tab=haki]').click(force=True)
def travel(q):
 q.locator('#enterHunt').click();q.locator('[data-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area]').click()
def book(q):
 q.locator('.bottom-nav [data-panel=inventory]').click();q.locator('[data-item=will-book-test]').click();q.wait_for_function("(()=>{const i=document.querySelector('.op-detail-wrap .haki-icon');return i&&i.complete&&i.naturalWidth===32&&i.naturalHeight===32})()");q.locator('[data-use-haki-book]').click()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);errors=[];c,q=page_for(b,errors=errors);template=create(q);bookdef=diag(q)['hakiBookDef']
 haki(q);assert q.locator('.confirmation-overlay').is_visible();assert 'nível 50' in q.locator('#confirmationMessage').inner_text();q.locator('[data-confirm-accept]').click();assert q.locator('#miniWillpower').is_hidden();assert not diag(q)['haki']['unlocked'];c.close()
 print('locked tab requirements and hidden HUD: passed',flush=True)
 seed=copy.deepcopy(template);seed.update(level=50,gold=50000,hp=5000);seed['inventory']=[{'id':'will-book-test','def':bookdef,'level':1,'locked':False}]
 c,q=page_for(b,seed,errors=errors);book(q)
 # Fail the exact local-storage transaction: neither consume nor unlock may occur.
 q.evaluate("()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mare-partida-save-v1')throw Error('quota');return originalSet.call(this,k,v)}}")
 q.locator('[data-confirm-accept]').click();assert not diag(q)['haki']['unlocked'];assert any(i['id']=='will-book-test' for i in saved(q)['inventory'])
 q.evaluate('()=>Storage.prototype.setItem=window.originalSet');q.locator('[data-use-haki-book]').click();q.locator('[data-confirm-accept]').click()
 assert diag(q)['haki']['unlocked'];assert q.locator('.haki-chamber').is_visible();assert not saved(q)['inventory'];assert saved(q)['achievements']['records']['haki']==['armament','observation','conqueror']
 assert q.locator('#characterTabs [data-character-tab]').count()==4
 q.wait_for_function("(()=>{const icons=[...document.querySelectorAll('.haki-disciplines .haki-icon')];return icons.length===3&&icons.every(i=>i.complete&&i.naturalWidth===32&&i.naturalHeight===32&&!i.hidden)})()")
 assert q.locator('[data-haki-cast]').is_disabled();assert q.locator('#miniWillpower').is_visible()
 q.locator('[data-haki-auto=armament]').check();assert saved(q)['haki']['auto']=='armament'
 q.locator('[data-haki-auto=observation]').check();assert saved(q)['haki']['auto']=='observation';assert not q.locator('[data-haki-auto=armament]').is_checked()
 for w,h in [(1920,1080),(1366,768),(1280,720),(393,852),(320,740)]:
  q.set_viewport_size(dict(width=w,height=h));q.screenshot(path=str(OUT/f'haki-{w}.png'));assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
 q.set_viewport_size(dict(width=1366,height=768));q.reload();q.wait_for_load_state('networkidle');assert diag(q)['haki']['unlocked'];assert diag(q)['haki']['active'] is None
 print('atomic book consumption, achievements, single auto preference, save/reload, five viewports: passed',flush=True)
 q.evaluate('()=>{let n=27183;Math.random=()=>((n=(1664525*n+1013904223)>>>0)/4294967296)}');travel(q);q.clock.run_for(1000);haki(q)
 q.locator('[data-haki-toggle=armament]').click();q.screenshot(path=str(OUT/'armament-live.png'));assert diag(q)['haki']['active']=='armament';assert diag(q)['stats']['penetration']>=.15
 q.locator('[data-haki-toggle=observation]').click();assert diag(q)['haki']['active']=='observation';assert diag(q)['stats']['accuracy']==1
 q.screenshot(path=str(OUT/'observation-live.png'));before=diag(q)['haki']['current'];q.clock.run_for(1000);assert diag(q)['haki']['current']<before
 q.locator('#closePanel').click();q.locator('#autoToggle').click();q.clock.run_for(4000);haki(q)
 held=diag(q)['haki']['current'];q.evaluate("()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mare-partida-save-v1')throw Error('quota');return originalSet.call(this,k,v)}}")
 q.locator('[data-haki-cast]').click();assert abs(diag(q)['haki']['current']-held)<1;assert diag(q)['haki']['kingFX']==0;assert 'cancelado' in q.locator('#toastContainer').inner_text()
 q.evaluate('()=>Storage.prototype.setItem=window.originalSet')
 q.locator('[data-haki-cast]').click();assert diag(q)['haki']['current']<=before-50;assert diag(q)['haki']['kingFX']>0;q.clock.run_for(150);q.screenshot(path=str(OUT/'king-live.png'))
 assert any(m['control'] and m['control']['remaining']>0 for m in diag(q)['mobs']),diag(q)['mobs']
 q.locator('#closePanel').click();q.locator('#returnLobby').click();assert diag(q)['haki']['active'] is None;before=diag(q)['haki']['current'];q.clock.run_for(2000);assert diag(q)['haki']['current']>before
 print('manual switch, real derived modifiers, drain, Rei cost and live stun, port shutdown and regeneration: passed',flush=True)
 # First real hit must turn on the auto choice without clicking a Haki button.
 q.clock.run_for(20000);assert diag(q)['haki']['current']==100;travel(q);q.clock.run_for(9000);d=diag(q);assert d['haki']['inCombat'] and d['haki']['active']=='observation',d['haki']
 q.clock.run_for(22000);d=diag(q);assert d['haki']['current']==0 and d['haki']['active'] is None,d['haki']
 q.reload();q.wait_for_load_state('networkidle');assert diag(q)['haki']['active'] is None
 print('real first-hit automatic activation, zero-resource shutdown and reload safety: passed',flush=True)
 c.close()
 strong=copy.deepcopy(template);strong.update(level=50,hp=500,has_haki_unlocked=True,haki={'unlocked':True,'current':100,'auto':'armament','equipped':'armament'});strong['attributes']={'strength':200,'dexterity':0,'vitality':45,'intelligence':0,'spirit':0}
 c,q=page_for(b,strong,errors=errors);travel(q);q.clock.run_for(120000);d=diag(q);assert d['kills']>=20,d['kills'];assert d['damage']>0;q.locator('#returnLobby').click();q.reload();q.wait_for_load_state('networkidle');assert diag(q)['kills']==d['kills'];print('20+ real consecutive kills, sustainable spawns, XP/loot, return and persistence: passed',flush=True)
 assert not errors,errors;b.close();print('Zero JavaScript errors',flush=True)
