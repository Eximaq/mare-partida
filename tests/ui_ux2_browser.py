"""UI2 real-browser acceptance: all primary surfaces, seven viewports, safe saves."""
import copy,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for,create,fixture,saved,ROOT

OUT=ROOT/'docs/evidence-ui-ux-2/after';OUT.mkdir(parents=True,exist_ok=True)
SIZES=[(1920,1080),(1366,768),(1280,720),(1024,768),(393,852),(360,800),(320,568)]
SURFACES=['inventory','forge','status','talents','achievements','haki','akuma','contracts','map','prison','shop','help']
errors=[];results=[]

def visible(q,s):return q.locator(s).is_visible()
def bounds(q,s):
    el=q.locator(s)
    if not el.is_visible():return None
    r=el.bounding_box();w=q.viewport_size['width'];h=q.viewport_size['height']
    assert r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1,(s,r,(w,h))
    return r
def no_overlap(q):
    selectors=['.topbar','#mainMenu','#hudUtilities','.action-panel','#journeyHud','#floatingChat','#chatCornerToggle','.world-command','#targetHud']
    if q.locator('#app>#toastContainer>.toast:visible').count():selectors.append('#toastContainer')
    rects=[(s,bounds(q,s)) for s in selectors if visible(q,s)]
    for i,(a,r) in enumerate(rects):
        for b,t in rects[i+1:]:
            x=min(r['x']+r['width'],t['x']+t['width'])-max(r['x'],t['x'])
            y=min(r['y']+r['height'],t['y']+t['height'])-max(r['y'],t['y'])
            assert x<=1 or y<=1,(a,b,x,y,q.viewport_size)
def loaded(q):
    q.wait_for_function("[...document.querySelectorAll('#dialogBody img,.class-art img')].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0)")
def open_surface(q,name):
    if name in ['status','talents','achievements','haki','akuma']:
        q.locator('#characterMenuTrigger').click();q.locator('[data-character-section='+name+']').click()
    elif name in ['map','prison']:
        q.locator('#modesMenuTrigger').click();q.locator('[data-quick-mode='+name+']').click()
    elif name=='shop':
        q.locator('#mainMenu [data-panel=inventory]').click();q.locator('[data-inv-category=consumables]').click();q.locator('[data-item=virtual-potion]').click();q.locator('[data-panel=shop]').click()
    else:q.locator('#mainMenu [data-panel='+name+']').click()
    loaded(q)
def safe_fields(g):return {k:g.get(k) for k in ['inventory','equipment','gold','materials','potions','attributes','level','xp','claimed','hunts','talents','talentTrees']}
def inspect_panel(q,name,w):
    bounds(q,'.dialog');bounds(q,'#closePanel' if name!='inventory' else '.op-close')
    assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),(name,w,'horizontal overflow')
    assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    assert q.locator('.dashboard').evaluate('e=>e.inert')
    q.screenshot(path=str(OUT/f'{name}-{w}.png'))
    # Keyboard stays within the current modal, even for inventory and generic help.
    for _ in range(2):q.keyboard.press('Shift+Tab');assert q.evaluate('document.activeElement.closest("#panelOverlay")!==null')
    q.keyboard.press('Escape');assert not visible(q,'#panelOverlay')
    assert q.evaluate('!document.activeElement.closest("[inert]")')

with sync_playwright() as p:
    browser=p.chromium.launch();c,q=page_for(browser,errors=errors);q.screenshot(path=str(OUT/'creation.png'));template=create(q);c.close()
    for w,h in SIZES:
        c,q=page_for(browser,size=(w,h),errors=errors);bounds(q,'.creation-dialog');q.screenshot(path=str(OUT/f'creation-faction-{w}.png'))
        q.locator('#characterName').fill('Nauta UI2');q.locator('#nextToClass').click();assert q.locator('.class-choice').count()==7;assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+1');q.screenshot(path=str(OUT/f'creation-class-{w}.png'));q.locator('#createCharacter').click();assert not visible(q,'#startOverlay');c.close()
    seed=fixture(template);seed.update(level=50,has_haki_unlocked=True,haki={'current':100,'unlocked':True})
    for w,h in SIZES:
        c,q=page_for(browser,seed,(w,h),errors);q.wait_for_timeout(120);no_overlap(q);q.clock.run_for(3800);before=safe_fields(saved(q));no_overlap(q)
        assert q.locator('#hakiQuickCast').evaluate('e=>!!e.closest(".action-panel")')
        assert q.locator('#usePotion').evaluate('e=>!!e.closest(".action-panel")')
        assert q.locator('#worldCanvas').bounding_box()['width']==w
        assert q.evaluate('document.elementFromPoint(innerWidth/2,innerHeight/2).id')=='worldCanvas','Map center obstructed at rest'
        q.screenshot(path=str(OUT/f'lobby-{w}.png'))
        for name in SURFACES:open_surface(q,name);inspect_panel(q,name,w)
        # Confirmation is above the main window; cancel preserves the actual save.
        open_surface(q,'help');q.locator('[data-reset]').click();bounds(q,'.confirmation-card')
        assert q.locator('#app').evaluate('e=>e.inert');q.locator('[data-confirm-cancel]').click();assert visible(q,'#panelOverlay')
        q.mouse.click(1,1);assert not visible(q,'#panelOverlay')
        # Chat tabs are local-only filters; type a note, then collapse it again.
        if not visible(q,'#floatingChat'):q.locator('#chatCornerToggle').click()
        q.locator('#chatInput').fill('Teste UI2');q.locator('#chatInput').press('Enter');q.locator('[data-chat-channel=notes]').click()
        assert all('Anotação local:' in x for x in q.locator('#gameLog>div:visible').all_text_contents())
        no_overlap(q);q.locator('[data-close-window=chat]').click()
        assert before==safe_fields(saved(q)),'UI-only navigation changed persistent game data'
        # Actual region travel; Haki actions keep their existing keyboard contracts.
        open_surface(q,'map');q.locator('[data-island=dawn]').click();q.locator('[data-travel-area]').click();q.clock.run_for(350);no_overlap(q)
        q.keyboard.press('h');assert q.evaluate('__mareDiagnostics().haki.active')=='armament'
        q.keyboard.press('j');assert q.evaluate('__mareDiagnostics().haki.active')=='observation'
        q.keyboard.press('j');assert q.evaluate('__mareDiagnostics().haki.active') is None
        q.screenshot(path=str(OUT/f'hunt-{w}.png'))
        if q.locator('#journeyToggle').get_attribute('aria-expanded')=='false':q.locator('#journeyToggle').click()
        q.locator('#huntRoute').click();loaded(q);inspect_panel(q,'route',w)
        # Real combat may grant loot; preserve that actual post-combat state on reload.
        q.locator('#returnLobby').click();post_combat=safe_fields(saved(q));q.reload();q.wait_for_load_state('networkidle')
        after=safe_fields(saved(q))
        assert post_combat==after,'Reload changed actual earned progress'
        assert not errors,errors;c.close();results.append({'size':[w,h],'surfaces':SURFACES+['route'],'passed':True});print('UI2 seven-viewports:',w,h,'passed',flush=True)
    # Reduced motion, landscape/zoom-equivalent viewport, and touch controls.
    c=browser.new_context(viewport={'width':640,'height':360},has_touch=True,reduced_motion='reduce');c.route('**/__dev_version',lambda r:r.fulfill(body='stable-test'))
    c.add_init_script('localStorage.setItem("mare-partida-save-v1",'+json.dumps(json.dumps(seed))+')');q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install();q.goto('http://127.0.0.1:8123');q.wait_for_load_state('networkidle');q.clock.run_for(3800)
    bounds(q,'.topbar');bounds(q,'#mainMenu');bounds(q,'.action-panel');q.locator('#mainMenu [data-panel=inventory]').tap();loaded(q);inspect_panel(q,'inventory',640)
    q.locator('#chatCornerToggle').tap();no_overlap(q);q.locator('[data-close-window=chat]').tap()
    # Future windows use the actual shared API without duplicating modal scaffolding.
    q.locator('#mainMenu [data-panel=help]').focus()
    q.evaluate('''()=>{window.qaWindow=MareUI.createWindow({id:'qa-window',title:'Janela compartilhada',body:MareUI.button({label:'Teste'})});MareUI.open(qaWindow)}''')
    assert visible(q,'#qa-window');q.keyboard.press('Tab');assert q.evaluate('!!document.activeElement.closest("#qa-window")');q.keyboard.press('Escape');assert not visible(q,'#qa-window');assert q.evaluate('document.activeElement.dataset.panel')=='help';q.evaluate('MareUI.destroy(qaWindow)')
    q.screenshot(path=str(OUT/'landscape-reduced-motion.png'));c.close()
    assert not errors,errors;browser.close()
    (OUT.parent/'results.json').write_text(json.dumps({'results':results,'errors':errors},indent=2),encoding='utf-8')
    print('UI2 touch, reduced motion and landscape passed; no JS errors.')
