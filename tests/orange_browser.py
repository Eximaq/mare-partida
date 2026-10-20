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
    b=p.chromium.launch();c,q=page(b);q.locator('#characterName').fill('Nauta Orange');q.locator('#nextToClass').click();q.locator('#createCharacter').click();q.clock.run_for(100);template=saved(q);c.close()
    low=copy.deepcopy(template);low['level']=20;c,q=page(b,low);inspect(q);assert q.locator('[data-travel-area=orange]').is_disabled();c.close()
    high=copy.deepcopy(template);high['level']=30
    for w,h in [(1920,1080),(1366,768),(1280,720),(393,852),(320,568)]:
        c,q=page(b,high,(w,h));inspect(q);q.locator('[data-travel-area=orange]').click();q.clock.run_for(250)
        d=state(q);assert d['map']=={'id':'orange','width':2048,'height':2048};assert d['walkable'];assert d['alive']>0
        assert all(21<=m['level']<=22 and m['area']=='orange' and m['skin'] in ['awning-raider','dock-bruiser'] for m in d['mobs']),d['mobs']
        if d['autoPlay']:q.locator('#autoToggle').click()
        q.screenshot(path=str(OUT/f'arrival-{w}.png'))
        if q.locator('#journeyToggle').get_attribute('aria-expanded')=='false':q.locator('#journeyToggle').click()
        q.locator('#huntRoute').click();assert q.locator('[data-hunt-sector]').count()==5;assert q.locator('[data-hunt-first=orange]').is_disabled()
        assert q.locator('#dialogBody').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
        q.screenshot(path=str(OUT/f'route-{w}.png'));q.locator('[data-hunt-sector=rua]').click();assert state(q)['path'];q.clock.run_for(3000);assert state(q)['walkable']
        q.locator('#returnLobby').click();q.reload();q.wait_for_function('typeof __mareDiagnostics==="function"');g=saved(q);assert g['area']=='orange';assert 'orange' in g['hunts']['areas'];assert not errors,errors;c.close();print('Orange arrival/route/save',w,h,'passed',flush=True)
    b.close()
    (OUT/'results.json').write_text(json.dumps({'errors':errors,'entry_gate':21,'map':[32,32],'browser_cases':5},indent=2),encoding='utf-8')
