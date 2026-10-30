"""Orange Town integration in isolated saves; local preview URL is configurable."""
import copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import ROOT,KEY,saved

OUT=ROOT/'docs/evidence-orange-town';OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
errors=[]
def state(q):return q.evaluate('__mareDiagnostics()')
def page(browser,seed=None,size=(1366,768)):
    c=browser.new_context(viewport={'width':size[0],'height':size[1]})
    c.route('**/__dev_version',lambda r:r.fulfill(body='stable-test'))
    if seed:c.add_init_script('if(!sessionStorage.seeded){localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(seed))+');sessionStorage.seeded="1"}')
    q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install();q.goto(URL)
    q.wait_for_function('typeof __mareDiagnostics==="function"');q.evaluate('MareOrangeRenderer.boot')
    return c,q
def inspect(q):
    q.locator('#modesMenuTrigger').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=orange-town]').click()
with sync_playwright() as p:
    b=p.chromium.launch();c,q=page(b);q.locator('#characterName').fill('Nauta Orange');q.locator('#nextToClass').click();q.locator('#nextToAppearance').click();q.locator('#createCharacter').click();q.locator('[data-confirm-accept]').click();q.clock.run_for(100);template=saved(q);c.close()
    low=copy.deepcopy(template);low['level']=20;c,q=page(b,low);inspect(q);assert q.locator('[data-travel-area=orange]').is_disabled();c.close()
    high=copy.deepcopy(template);high['level']=30
    for w,h in [(1920,1080),(1366,768),(1280,720),(393,852),(320,568)]:
        c,q=page(b,high,(w,h));inspect(q);q.locator('[data-travel-area=orange]').click();q.clock.run_for(250)
        d=state(q);assert d['map']=={'id':'orange','width':2048,'height':2048};assert d['walkable'];assert d['alive']>0
        assert q.locator('#journeyTitle').inner_text()=='Orange Town: recuperar o comércio'
        assert all(21<=m['level']<=22 and m['area']=='orange' and m['skin'] in ['awning-raider','dock-bruiser'] for m in d['mobs']),d['mobs']
        if d['autoPlay']:q.locator('#autoToggle').click()
        q.screenshot(path=str(OUT/f'arrival-{w}.png'))
        if q.locator('#journeyToggle').get_attribute('aria-expanded')=='false':q.locator('#journeyToggle').click()
        q.locator('#huntRoute').click();assert q.locator('[data-hunt-sector]').count()==5;assert q.locator('[data-hunt-first=orange]').is_disabled()
        assert q.locator('#dialogBody').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
        q.screenshot(path=str(OUT/f'route-{w}.png'));q.locator('[data-hunt-sector=rua]').click();assert state(q)['path'];q.clock.run_for(3000);assert state(q)['walkable']
        q.locator('#returnLobby').click();q.reload();q.wait_for_function('typeof __mareDiagnostics==="function"');g=saved(q);assert g['area']=='orange';assert 'orange' in g['hunts']['areas'];assert not errors,errors;c.close();print('Orange arrival/route/save',w,h,'passed',flush=True)
    ready=copy.deepcopy(high);ready['hunts']['areas']['orange']['kills']=12
    c,q=page(b,ready);q.locator('#devLauncher').click();q.locator('[data-dev-enter]').click();q.wait_for_url('**/?dev=1');q.wait_for_function('window.__mareDiagnostics?.().dev.active')
    q.locator('#devLauncher').click();q.locator('[data-dev-option=godMode]').check();q.locator('[data-dev-travel=orange]').click()
    if state(q)['autoPlay']:q.locator('#autoToggle').click()
    q.locator('#huntRoute').click();q.locator('[data-hunt-sector=picadeiro]').click()
    for _ in range(60):
        q.clock.run_for(1000)
        if not state(q)['path'] and any(m['type']=='boss' for m in state(q)['mobs']):break
    assert any(m['type']=='boss' and m['level']==30 and m['name']=='Capitão Fagulha' for m in state(q)['mobs']),state(q)
    warned=False
    for _ in range(100):
        q.clock.run_for(200)
        if any(m['telegraph'] for m in state(q)['mobs']):warned=True;break
    assert warned,'No live boss warning';q.screenshot(path=str(OUT/'boss-warning.png'));q.locator('#autoToggle').click()
    for _ in range(240):
        q.clock.run_for(1000)
        if state(q)['hunt']['progress']['areas']['orange']['bosses']>0:break
    assert state(q)['hunt']['progress']['areas']['orange']['bosses']>0,state(q)
    q.locator('#huntRoute').click();button=q.locator('[data-hunt-first=orange]');assert button.is_enabled()
    q.evaluate("()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('quota')}}")
    button.click();assert not state(q)['hunt']['progress']['areas']['orange']['firstRewardClaimed']
    q.evaluate('()=>{Storage.prototype.setItem=window.originalSet}');button.click();assert state(q)['hunt']['progress']['areas']['orange']['firstRewardClaimed'];assert button.is_disabled()
    q.locator('#closePanel').click();q.locator('#returnLobby').click();q.reload();q.wait_for_function('typeof __mareDiagnostics==="function"')
    after=q.evaluate("JSON.parse(localStorage.getItem('mare-partida-dev-save-v1'))")
    prizes=[i for i in after['inventory'] if i.get('origin')=='Primeira vitória · Orange Town']
    assert len(prizes)==1 and prizes[0]['rarity']=='epic' and prizes[0]['level']==6,prizes
    assert after['hunts']['areas']['orange']['firstRewardClaimed'];assert saved(q)['hunts']['areas']['orange']['bosses']==0
    assert not errors,errors;c.close();print('Orange boss/warning/reward rollback/single claim/reload/DEV isolation passed',flush=True)
    b.close()
    (OUT/'results.json').write_text(json.dumps({'errors':errors,'entry_gate':21,'map':[32,32],'browser_cases':5},indent=2),encoding='utf-8')
