"""Validate generated faction sheets in the real game with isolated saves."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/os.environ.get('MARE_FACTION_EVIDENCE_DIR','evidence-factions')
OUT.mkdir(exist_ok=True,parents=True)
results=[]
def record(name,detail):
    results.append({'test':name,'result':'passed','detail':detail});print(name+': passed',flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    errors=[]
    for faction in ['revolutionary','pirate','marine','government']:
        context=browser.new_context(viewport={'width':1920,'height':1080})
        page=context.new_page();page.route('**/__dev_version',lambda route:route.fulfill(body='stable-test'));page.on('pageerror',lambda e:errors.append(str(e)))
        page.clock.install();page.goto('http://127.0.0.1:8123/');page.wait_for_load_state('networkidle')
        assert page.locator('[data-faction]').count()==4 and page.locator('[data-class]').count()==7
        for image in page.locator('.faction-choice img').all():assert image.evaluate('im=>im.complete&&im.naturalWidth===48')
        page.screenshot(path=str(OUT/'selection.png'))
        page.locator('#characterName').fill('Teste '+faction[:8]);page.locator('[data-faction="'+faction+'"]').click()
        page.locator('#nextToClass').click();page.locator('#createCharacter').click();page.clock.run_for(250)
        def diag():return page.evaluate('window.__mareDiagnostics()')
        def run(ms):page.clock.run_for(ms)
        meta=page.evaluate('(id)=>MareFactionSprites.assets[id].meta',faction)
        assert set(meta['directions'])=={'south','north','east','west'}
        for action in ['idle','walk']:
            assert meta['animations'][action]['frames']>1
            assert page.evaluate('(args)=>{const a=MareFactionSprites.assets[args.id],im=a.sheets[args.action];return im.complete&&im.naturalWidth===a.meta.frame_size[0]*a.meta.animations[args.action].frames&&im.naturalHeight===a.meta.frame_size[1]*4}',{'id':faction,'action':action})
        assert page.locator('#worldCanvas').evaluate('el=>el.getContext("2d").imageSmoothingEnabled===false')
        start=diag()['hero']
        for key,direction,axis,sign in [('w','back','y',-1),('s','front','y',1),('a','left','x',-1),('d','right','x',1)]:
            before=diag()['hero'];page.keyboard.down(key);run(250);walking=diag()['hero']
            assert walking['direction']==direction and walking['walking']>0
            assert (walking[axis]-before[axis])*sign>10 and diag()['walkable']
            page.screenshot(path=str(OUT/f'{faction}-walk-{direction}.png'))
            page.keyboard.up(key);run(300)
            assert diag()['hero']['walking']==0
            page.screenshot(path=str(OUT/f'{faction}-idle-{direction}.png'))
        # Approach a real NPC without changing faction, camera or coordinates by test hooks.
        d=diag();npc=next(n for n in d['npcs'] if n['art']=='ryuma');target={'x':npc['x']-70,'y':npc['y']+65}
        box=page.locator('#worldCanvas').bounding_box();sx=(target['x']-round(d['camera']['x']))/d['camera']['width']*box['width'];sy=(target['y']-round(d['camera']['y']))/d['camera']['height']*box['height']
        page.mouse.click(sx,sy)
        for _ in range(15):run(250)
        page.screenshot(path=str(OUT/f'{faction}-npc-scale.png'))
        assert diag()['walkable']
        record('faction_'+faction,'Selection loads new art; real idle/walk in four directions; movement, no smoothing, sheet dimensions and NPC scale capture.')
        assert page.locator('#showFactionPreview').count()==0, 'Inspection control was removed from the character menu by request.'
        before=json.loads(page.evaluate("localStorage.getItem('mare-partida-save-v1')"))
        page.reload();page.wait_for_load_state('networkidle');run(200)
        after=json.loads(page.evaluate("localStorage.getItem('mare-partida-save-v1')"))
        for field in ['factionId','classId','inventory','equipment','level','attributes','attributePoints']:assert before[field]==after[field]
        context.close()
    assert not errors,errors
    record('javascript_and_saves','No uncaught JS errors; faction/class/equipment and point investments survive reload in every isolated context.')
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
