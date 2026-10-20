"""Regional hunting acceptance in isolated Chromium contexts; no player's save access."""
import copy,json,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for,create,saved,KEY
OUT=Path(tempfile.gettempdir())/'mare-hunt-qa';OUT.mkdir(exist_ok=True)
def d(q):return q.evaluate('__mareDiagnostics()')
def travel(q,island='dawn'):
    q.locator('#enterHunt').click();q.locator('[data-mode=map]').click();q.locator('[data-island='+island+']').click();q.locator('[data-travel-area]').click()
    if d(q)['autoPlay']:q.locator('#autoToggle').click()
def route(q):q.locator('#huntRoute').click()
with sync_playwright() as p:
    b=p.chromium.launch(headless=True);errors=[];c,q=page_for(b,errors=errors);template=create(q);assert 'hunts' in saved(q);c.close()
    for size in [(1920,1080),(1366,768),(1280,720),(393,852),(320,740)]:
        c,q=page_for(b,template,size,errors);travel(q);state=d(q);assert state['alive']>0
        assert all(1<=m['level']<=2 and m['district']=='cais' for m in state['mobs']),state['mobs']
        route(q);assert q.locator('[data-hunt-sector]').count()==7;assert q.locator('[data-hunt-first]').is_disabled()
        assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
        q.screenshot(path=str(OUT/f'route-{size[0]}.png'))
        q.locator('[data-hunt-sector=corsarios]').click();assert d(q)['path'];assert not d(q)['autoPlay'];q.clock.run_for(2500);assert d(q)['walkable'];c.close()
    print('Dawn safe arrival, route walking and mobile UI: passed',flush=True)
    low=copy.deepcopy(template);low['level']=10
    c,q=page_for(b,low,errors=errors);q.locator('#enterHunt').click();q.locator('[data-mode=map]').click();q.locator('[data-island=conchas]').click();assert q.locator('[data-travel-area]').is_disabled();c.close()
    high=copy.deepcopy(template);high.update(level=80,hp=99999)
    c,q=page_for(b,high,errors=errors);travel(q,'conchas');assert all(11<=m['level']<=13 for m in d(q)['mobs'])
    route(q);assert q.locator('[data-hunt-sector]').count()==4;q.locator('#closePanel').click();q.locator('#returnLobby').click();q.reload();q.wait_for_load_state('networkidle');assert saved(q)['level']==80;c.close()
    print('Conchas gate 11, fixed enemies for Lv.80, preserved save: passed',flush=True)
    # The DEV sandbox is used for a real first boss victory and live warnings.
    ready=copy.deepcopy(template);ready.update(level=10,hp=99999);ready['hunts']['areas']['beach']['kills']=12
    c,q=page_for(b,ready,errors=errors);normal=q.evaluate('(key)=>localStorage.getItem(key)',KEY)
    q.locator('#devLauncher').click();q.locator('[data-dev-enter]').click();q.wait_for_url('**/?dev=1');q.wait_for_function('window.__mareDiagnostics?.().dev.active')
    q.locator('#devLauncher').click();q.locator('[data-dev-option=godMode]').check();q.locator('[data-dev-travel=beach]').click()
    if d(q)['autoPlay']:q.locator('#autoToggle').click()
    route(q);q.locator('[data-hunt-sector=caldeira]').click()
    for _ in range(45):
        q.clock.run_for(1000)
        if not d(q)['path'] and any(m['type']=='boss' for m in d(q)['mobs']):break
    assert any(m['type']=='boss' and m['level']==10 for m in d(q)['mobs']),d(q)
    warned=False
    for _ in range(100):
        q.clock.run_for(200)
        if any(m['telegraph'] for m in d(q)['mobs']):warned=True;break
    assert warned,'No live warning';q.screenshot(path=str(OUT/'boss-warning.png'))
    q.locator('#autoToggle').click()
    for _ in range(100):
        q.clock.run_for(1000)
        if d(q)['hunt']['progress']['areas']['beach']['bosses']>0:break
    assert d(q)['hunt']['progress']['areas']['beach']['bosses']>0,d(q)
    route(q);button=q.locator('[data-hunt-first=beach]');assert button.is_enabled()
    before=q.evaluate("JSON.parse(localStorage.getItem('mare-partida-dev-save-v1'))")
    q.evaluate("()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('quota')}}")
    button.click();assert not d(q)['hunt']['progress']['areas']['beach']['firstRewardClaimed']
    q.evaluate('()=>{Storage.prototype.setItem=window.originalSet}');button.click();assert d(q)['hunt']['progress']['areas']['beach']['firstRewardClaimed'];assert button.is_disabled()
    q.locator('#closePanel').click();q.locator('#returnLobby').click();q.reload();q.wait_for_load_state('networkidle')
    after=q.evaluate("JSON.parse(localStorage.getItem('mare-partida-dev-save-v1'))");assert after['hunts']['areas']['beach']['firstRewardClaimed']
    prizes=[i for i in after['inventory'] if i.get('origin')=='Primeira vitória · Ilha Dawn'];assert len(prizes)==1;assert prizes[0]['rarity']=='rare' and prizes[0]['level']==2
    assert not after['hunts']['areas']['swamp']['bosses'];assert not d(q)['hunt']['bossReady']
    # The normal save was only touched by its own page-exit save before entering DEV.
    assert json.loads(q.evaluate('(key)=>localStorage.getItem(key)',KEY))['hunts']['areas']['beach']['bosses']==0
    c.close()
    # The second island has its own final arena and first-victory tier.
    conchas=copy.deepcopy(template);conchas.update(level=20,hp=99999);conchas['hunts']['areas']['swamp']['kills']=12
    c,q=page_for(b,conchas,errors=errors);q.locator('#devLauncher').click();q.locator('[data-dev-enter]').click();q.wait_for_url('**/?dev=1');q.wait_for_function('window.__mareDiagnostics?.().dev.active')
    q.locator('#devLauncher').click();q.locator('[data-dev-option=godMode]').check();q.locator('[data-dev-travel=swamp]').click();q.locator('#autoToggle').click()
    route(q);q.locator('[data-hunt-sector=bastiao]').click()
    for _ in range(45):
        q.clock.run_for(1000)
        if not d(q)['path'] and any(m['type']=='boss' for m in d(q)['mobs']):break
    assert any(m['type']=='boss' and m['level']==20 and m['name']=='Guardião das Conchas' for m in d(q)['mobs'])
    q.locator('#autoToggle').click()
    for _ in range(120):
        q.clock.run_for(1000)
        if d(q)['hunt']['progress']['areas']['swamp']['bosses']>0:break
    assert d(q)['hunt']['progress']['areas']['swamp']['bosses']>0
    route(q);q.locator('[data-hunt-first=swamp]').click();assert d(q)['hunt']['progress']['areas']['swamp']['firstRewardClaimed']
    prizes=q.evaluate("JSON.parse(localStorage.getItem('mare-partida-dev-save-v1')).inventory.filter(i=>i.origin==='Primeira vitória · Cidade das Conchas')")
    assert len(prizes)==1 and prizes[0]['rarity']=='epic' and prizes[0]['level']==4
    assert not errors,errors;c.close();b.close()
    print('Real boss/warning, per-island progress, reward rollback/single claim/reload and DEV isolation: passed',flush=True)
