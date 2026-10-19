"""Quick-cast keyboard, HUD, cooldown persistence and storage rollback in isolated Chromium."""
import copy,json,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for,create,saved,KEY
OUT=Path(tempfile.gettempdir())/'mare-haki-quickcast';OUT.mkdir(exist_ok=True)
def d(q):return q.evaluate('__mareDiagnostics()')
def travel(q):
    q.locator('#enterHunt').click();q.locator('[data-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area]').click()
    if d(q)['autoPlay']:q.locator('#autoToggle').click()
with sync_playwright() as p:
    b=p.chromium.launch(headless=True);errors=[];c,q=page_for(b,errors=errors);template=create(q)
    assert q.locator('#hakiQuickCast').is_hidden();c.close()
    seed=copy.deepcopy(template);seed.update(level=50,hp=99999,has_haki_unlocked=True,haki={'current':100,'unlocked':True})
    c,q=page_for(b,seed,errors=errors);assert q.locator('#hakiQuickCast').is_visible();assert q.locator('#hakiKing').is_disabled()
    travel(q);q.keyboard.press('h');assert d(q)['haki']['active']=='armament';assert q.locator('#hakiQuickCast [data-haki-toggle=armament]').get_attribute('aria-pressed')=='true'
    q.keyboard.down('h');q.keyboard.down('h');q.keyboard.up('h');assert d(q)['haki']['active'] is None
    q.keyboard.press('j');assert d(q)['haki']['active']=='observation';assert q.locator('#hakiQuickCast [data-haki-toggle=observation]').get_attribute('aria-pressed')=='true'
    q.keyboard.press('j');assert d(q)['haki']['active'] is None
    # Failed transactions leave resource, cooldown and combat effects untouched.
    q.evaluate("()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('quota')}}")
    held=d(q)['haki']['current'];q.keyboard.press('k');assert abs(d(q)['haki']['current']-held)<1;assert not d(q)['haki']['kingFX'];assert not d(q)['haki'].get('kingReadyAt',0)
    q.keyboard.press('h');assert d(q)['haki']['active'] is None
    q.evaluate('()=>{Storage.prototype.setItem=window.originalSet}')
    q.keyboard.press('k');assert abs(d(q)['haki']['current']-(held-50))<1;assert q.locator('#hakiKing').is_disabled();assert q.locator('#hakiKing .haki-quick-state').inner_text()=='8s'
    ready=saved(q)['haki']['kingReadyAt'];remaining=d(q)['haki']['current'];q.keyboard.press('k');assert abs(d(q)['haki']['current']-remaining)<1
    q.screenshot(path=str(OUT/'cooldown.png'))
    q.reload();q.wait_for_load_state('networkidle');assert saved(q)['haki']['kingReadyAt']==ready;travel(q);assert q.locator('#hakiKing').is_disabled()
    q.clock.run_for(8100);assert q.locator('#hakiKing').is_enabled()
    # Chat moved to L; text input and open modals cannot trigger combat keys.
    was_open=q.locator('#chatInput').is_visible();q.keyboard.press('l');assert q.locator('#chatInput').is_visible()!=was_open
    if not q.locator('#chatInput').is_visible():q.keyboard.press('l')
    q.locator('#chatInput').fill('hjk');q.keyboard.press('h');assert d(q)['haki']['active'] is None
    q.locator('#chatInput').blur();q.keyboard.press('Escape')
    q.keyboard.press('i');q.keyboard.press('h');assert d(q)['haki']['active'] is None;q.keyboard.press('Escape')
    for size in [(1920,1080),(1366,768),(1280,720),(393,852),(320,740)]:
        q.set_viewport_size(dict(width=size[0],height=size[1]));q.clock.run_for(100)
        button=q.locator('#hakiQuickCast [data-haki-toggle=armament]');button.click();assert d(q)['haki']['active']=='armament';q.screenshot(path=str(OUT/f'armament-{size[0]}.png'));button.click();assert d(q)['haki']['active'] is None
        assert q.evaluate('document.documentElement.scrollWidth<=innerWidth'),size
        assert q.locator('#hakiQuickCast').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),size
        if size[0]<=700:assert q.evaluate("document.querySelector('#mainMenu').getBoundingClientRect().top>=document.querySelector('.topbar').getBoundingClientRect().bottom"),size
        q.screenshot(path=str(OUT/f'hud-{size[0]}.png'))
    c.close()
    exhausted=copy.deepcopy(seed);exhausted['haki']['current']=0
    c=b.new_context(viewport=dict(width=1366,height=768));c.route('**/__dev_version',lambda route:route.fulfill(body='stable-test'))
    c.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(exhausted))+')')
    q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install(time=1760000000000);q.clock.pause_at(1760000000000)
    q.goto('http://127.0.0.1:8123/');q.wait_for_load_state('networkidle')
    assert q.locator('#hakiQuickCast button:disabled').count()==3;assert q.locator('#hakiQuickCast button.is-empty').count()==3
    assert not errors,errors;c.close();b.close()
    print(json.dumps(dict(passed=True,quick_keys='H/J/K',chat='L',cooldown_seconds=8,viewports=5,rollback=True,errors=errors)))
