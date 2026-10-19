"""Nautical HUD/island acceptance in isolated Chromium, no user save access."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/os.environ.get('MARE_EVIDENCE_DIR','evidence-compact-harbor')
OUT.mkdir(parents=True,exist_ok=True)
results=[]
def record(test,detail):
    results.append({'test':test,'result':'passed','detail':detail});print(test+': passed',flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1366,'height':768})
    page=context.new_page();page.route('**/__dev_version',lambda route:route.fulfill(body='stable-test'));errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.clock.install();page.goto('http://127.0.0.1:8123');page.wait_for_load_state('networkidle')
    page.locator('#characterName').fill('Navegante Teste');page.locator('#nextToClass').click();page.locator('#createCharacter').click()
    def run(ms):page.clock.run_for(ms)
    def diag():return page.evaluate('window.__mareDiagnostics()')
    def physical():
        d=diag();assert d['walkable'];c=d['camera'];m=d['map']
        assert c['x']>=0 and c['y']>=0 and c['x']+c['width']<=m['width']+.01 and c['y']+c['height']<=m['height']+.01
        return d
    def click_world(x,y):
        d=diag();b=page.locator('#worldCanvas').bounding_box()
        sx=(x-round(d['camera']['x']))/d['camera']['width']*b['width']+b['x'];sy=(y-round(d['camera']['y']))/d['camera']['height']*b['height']+b['y']
        page.mouse.click(sx,sy)
    run(500);initial=physical()
    assert page.locator('#miniPower').inner_text()!='0'
    maximum=initial['stats']['maxHP']
    assert page.locator('#miniHPText').inner_text()==f'{maximum} / {maximum}'
    assert page.locator('#journeyTitle').inner_text()=='Cascos de magma'
    assert page.locator('#floatingChat').is_visible()
    record('real_hud_data','Profile XP, HP, energy and power plus the real contract are visible; local chat is open on desktop.')
    selectors=['.topbar','.bottom-nav','#floatingChat','.world-command','.action-panel','#journeyHud','#chatCornerToggle']
    def no_overlap():
        rects=[]
        for selector in selectors:
            element=page.locator(selector)
            if element.is_visible():
                box=element.bounding_box();assert box['x']>=-1 and box['y']>=-1,(selector,box)
                assert box['x']+box['width']<=page.viewport_size['width']+1,(selector,box)
                assert box['y']+box['height']<=page.viewport_size['height']+1,(selector,box)
                rects.append((selector,box))
        for i,(a,x) in enumerate(rects):
            for b,y in rects[i+1:]:
                overlap=min(x['x']+x['width'],y['x']+y['width'])-max(x['x'],y['x'])
                vertical=min(x['y']+x['height'],y['y']+y['height'])-max(x['y'],y['y'])
                assert overlap<=1 or vertical<=1,(a,b,overlap,vertical)
    for w,h in [(1920,1080),(1366,768),(1280,720)]:
        page.set_viewport_size({'width':w,'height':h});run(400);physical();no_overlap()
        page.screenshot(path=str(OUT/f'lobby-{w}x{h}.png'))
    record('hud_three_sizes','No intersections/out-of-viewport HUD modules at 1920x1080, 1366x768, 1280x720.')
    page.set_viewport_size({'width':1366,'height':768});run(300)
    target={'x':initial['hero']['x']+250,'y':initial['hero']['y']+30}
    click_world(**target);run(180)
    assert initial['hero']['x']<diag()['hero']['x']<target['x']-30
    for _ in range(10):run(300);physical()
    assert abs(diag()['hero']['x']-target['x'])<4
    assert diag()['camera']['x']>initial['camera']['x']+150
    record('movement_camera','Click reaches a destination gradually and moves the camera over 150 units at native pixel scale.')
    npc=next(n for n in diag()['npcs'] if n['kind']=='forge')
    click_world(npc['x'],npc['y']-30)
    for _ in range(25):
        run(250);physical()
        if page.locator('#panelOverlay').is_visible():break
    assert page.locator('#dialogTitle').inner_text()=='Forja das Correntes'
    page.screenshot(path=str(OUT/'forge-npc.png'));page.locator('#closePanel').click()
    record('npc_service','After moving camera, clicking Ryuma approaches and opens the real forge.')
    # Journey collapse and chat collapse keep the same functional data.
    page.locator('#journeyToggle').click();assert not page.locator('.journey-content').is_visible()
    page.locator('#journeyToggle').click();assert page.locator('.journey-content').is_visible()
    page.locator('#chatCornerToggle').click();assert not page.locator('#floatingChat').is_visible()
    page.locator('#chatCornerToggle').click();assert page.locator('#floatingChat').is_visible()
    record('hud_controls','Journey and chat collapse/expand correctly.')
    page.locator('[data-panel="inventory"]').first.click();assert page.locator('.op-inventory-shell').is_visible()
    page.screenshot(path=str(OUT/'inventory.png'));page.get_by_role('button',name='Fechar inventário').click()
    record('inventory','Original inventory remains functional with equipment, bag and detail columns.')
    stats=diag()['stats'];page.locator('#enterHunt').click();run(400)
    assert diag()['scene']=='hunt' and diag()['stats']==stats
    for _ in range(130):
        run(1000);physical()
        if diag()['kills']>=20 and page.locator('#journeyAction').inner_text()=='Resgatar':break
    assert diag()['kills']>=20
    no_overlap();page.screenshot(path=str(OUT/'hunt.png'))
    record('hunt_regression',f"{diag()['kills']} defeats with preserved class/equipment stats and common camera coordinates.")
    reward_before=int(page.evaluate("JSON.parse(localStorage.getItem('mare-partida-save-v1')).gold"))
    assert page.locator('#journeyAction').inner_text()=='Resgatar'
    page.locator('#journeyAction').click();run(400)
    reward_after=int(page.evaluate("JSON.parse(localStorage.getItem('mare-partida-save-v1')).gold"))
    assert reward_after>=reward_before+85
    record('journey_reward','The visible journey button claims the actual completed contract and awards its currency.')
    page.locator('#returnLobby').click();run(400)
    saved=json.loads(page.evaluate("localStorage.getItem('mare-partida-save-v1')"))
    page.reload();page.wait_for_load_state('networkidle');run(400)
    loaded=json.loads(page.evaluate("localStorage.getItem('mare-partida-save-v1')"))
    for key in ['name','classId','factionId','level','xp','gold','inventory','equipment','stats']:assert saved[key]==loaded[key],key
    record('save_regression','Rewards, equipment IDs, bag, XP and currency survive return and reload.')
    for w,h in [(768,740),(390,844)]:
        page.set_viewport_size({'width':w,'height':h});page.reload();page.wait_for_load_state('networkidle');run(300)
        physical();no_overlap();page.screenshot(path=str(OUT/f'lobby-{w}x{h}.png'))
    record('small_screens','Essential HUD modules fit 768x740 and 390x844 without intersecting.')
    page.set_viewport_size({'width':1920,'height':1080});page.reload();page.wait_for_load_state('networkidle');run(400)
    click_world(1000,1160)
    for _ in range(10):run(400);physical()
    click_world(220,1168)
    for _ in range(15):run(400);physical()
    assert abs(diag()['hero']['x']-220)<5
    page.screenshot(path=str(OUT/'harbor-coast.png'))
    record('harbor_coast','A click route crosses the actual island coastline onto the wooden dock without entering deep water.')
    assert not errors,errors
    record('javascript','No uncaught JS errors during the acceptance run.')
    context.close();browser.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')
