"""Real combat state transitions and delayed impacts in an isolated save."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs'/os.environ.get('MARE_BENTO_EVIDENCE_DIR','evidence-bento-combat');OUT.mkdir(exist_ok=True,parents=True)
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True);context=browser.new_context(viewport={'width':1366,'height':768});page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)));page.clock.install()
    page.goto('http://127.0.0.1:8123/');page.wait_for_load_state('networkidle')
    page.locator('#characterName').fill('Bento Teste');page.locator('[data-faction="pirate"]').click();page.locator('#nextToClass').click();page.locator('[data-class="sword"]').click();page.locator('#createCharacter').click();page.clock.run_for(200)
    save=json.loads(page.evaluate("localStorage.getItem('mare-partida-save-v1')"))
    page.screenshot(path=str(OUT/'lobby.png'));page.locator('#enterHunt').click();page.locator('[data-island][data-current=true]').click();page.locator('[data-travel-area]').click()
    seen=set();captures=set();impacts=0;last=page.evaluate('window.__mareDiagnostics()')
    for _ in range(2400):
        page.clock.run_for(50);d=page.evaluate('window.__mareDiagnostics()');state=d['combat']
        assert state is not None,'Inspected combat assets must be active for pirate+sword.'
        seen.add(state['action']);assert d['walkable']
        if state['action'] not in captures and state['elapsed']>.08:
            page.screenshot(path=str(OUT/(state['action']+'.png')));captures.add(state['action'])
        if d['damage']>last['damage']:
            impacts+=1
            assert (state['action'] in ['attack','skill'] and state['impactDone']) or (last.get('combat') and last['combat']['action'] in ['attack','skill']), (last['combat'],state)
        last=d
        if {'combat-idle','walk','attack','skill','hurt'}<=seen and d['kills']>=3:break
    assert {'combat-idle','walk','attack','skill','hurt'}<=seen,seen
    assert impacts>0 and d['kills']>0
    results.append({'test':'actual_combat','passed':True,'states':sorted(seen),'impacts':impacts,'kills':d['kills']})
    # A low-health save with no potions triggers a real defeat without injecting combat internals.
    context.close();save['hp']=1;save['potions']=0
    c=browser.new_context(viewport={'width':1366,'height':768})
    c.add_init_script("if(!sessionStorage.getItem('seeded')){localStorage.setItem('mare-partida-save-v1',"+json.dumps(json.dumps(save))+");sessionStorage.setItem('seeded','1')}")
    q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install();q.goto('http://127.0.0.1:8123/');q.wait_for_load_state('networkidle');q.locator('#enterHunt').click();q.locator('[data-island][data-current=true]').click();q.locator('[data-travel-area]').click()
    death=None
    paused=False
    for _ in range(1600):
        q.clock.run_for(50);d=q.evaluate('window.__mareDiagnostics()')
        if not paused and d['hp']>0 and d['autoPlay'] and any(((m['x']-d['hero']['x'])**2+(m['y']-d['hero']['y'])**2)**.5<90 for m in d['mobs']):
            q.locator('#autoToggle').click();paused=True
        if d['combat'] and d['combat']['action']=='death':death=d;break
    assert death,'Expected a real KO from enemies.'
    x,y=death['hero']['x'],death['hero']['y'];q.keyboard.down('d');q.clock.run_for(1500);q.keyboard.up('d')
    held=q.evaluate('window.__mareDiagnostics()');assert held['combat']['action']=='death' and held['combat']['locked'];assert abs(held['hero']['x']-x)<.01 and abs(held['hero']['y']-y)<.01
    assert held['combat']['elapsed']==held['combat']['duration']
    q.screenshot(path=str(OUT/'death-held.png'));q.clock.run_for(3000)
    revived=q.evaluate('window.__mareDiagnostics()');assert revived['hp']>0 and revived['combat']['action']!='death'
    q.screenshot(path=str(OUT/'respawn.png'));assert not errors,errors
    results.append({'test':'real_death_hold_respawn','passed':True,'stationary_while_dead':True,'last_frame_held':True,'save_identity_preserved':revived['classId']=='sword'})
    c.close()
    for faction,cls in [('marine','sword'),('pirate','brawler')]:
        c=browser.new_context();q=c.new_page();q.clock.install();q.goto('http://127.0.0.1:8123/');q.wait_for_load_state('networkidle')
        q.locator('#characterName').fill('Outro Estilo');q.locator('[data-faction="'+faction+'"]').click();q.locator('#nextToClass').click();q.locator('[data-class="'+cls+'"]').click();q.locator('#createCharacter').click();q.locator('#enterHunt').click();q.locator('[data-island][data-current=true]').click();q.locator('[data-travel-area]').click();q.clock.run_for(200)
        assert q.evaluate('window.__mareDiagnostics().combat') is None
        c.close()
    results.append({'test':'faction_and_class_scope','passed':True,'other_factions_and_classes_use_original_sprites':True})
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8');print(json.dumps(results))
