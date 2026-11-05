"""Measured before/after HUD review and contextual expedition regression."""
import argparse, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import create

args=argparse.ArgumentParser()
args.add_argument('--baseline',action='store_true')
opts=args.parse_args()
OUT=Path(os.environ.get('HUD_COMPACT_EVIDENCE','tmp/hud-compact'))
phase='before' if opts.baseline else 'after'
(OUT/phase).mkdir(parents=True,exist_ok=True)
SIZES=[(1920,1080),(1366,768),(1280,720),(844,390),(390,844)]
HOOK="""  window.__compactQA={get game(){return game},get session(){return session},stats:getDerived,
refresh(){updateUI();renderPortrait();drawWorld();presentWorld()},enter:enterHunt,leave:returnLobby,
toggle:toggleFloating,defs:itemDefs,newItem,syncFruit:syncFruitVfx};window.__mareDiagnostics="""

def measurements(q):
    return q.evaluate('''() => Object.fromEntries(Object.entries({
      profile:'.topbar',hotbar:'.action-panel',potion:'#usePotion',buyPotion:'#buyPotion',
      chat:'#floatingChat',expedition:'#journeyHud',window:'#floatingExpedition',travel:'.world-command'
    }).map(([key,s])=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return [key,{x:r.x,y:r.y,width:r.width,height:r.height,area:r.width*r.height,visible:!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'}]}))''')

with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'));c=b.new_context(viewport=dict(width=1920,height=1080));errors=[]
    c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
    def bridge(route):
        r=route.fetch();body=r.text().replace('  window.__mareDiagnostics=',HOOK)
        route.fulfill(response=r,body=body)
    c.route('**/game.js*',bridge)
    q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)))
    q.clock.install();q.goto(os.environ.get('MARE_TEST_URL','http://127.0.0.1:8130/'),timeout=60000)
    q.wait_for_load_state('networkidle');q.wait_for_function('window.__compactQA')
    # Isolated browser context and generated character; no user's save is read.
    create(q)
    q.evaluate('''() => {const x=__compactQA,g=x.game;Object.assign(g,{name:'Nauta',level:53,gold:229378,xp:552,potions:411,hierarchyTier:3,hierarchyFaction:'pirate'});
      const fruit=x.defs.find(d=>d.fruitId==='akuma_mera_mera');if(fruit){g.equipment.akuma_no_mi=x.newItem(fruit);x.syncFruit()}
      g.hp=x.stats().maxHP;g.energy=x.stats().maxEnergy;x.refresh()}''')
    q.evaluate('document.fonts.ready');q.clock.run_for(4000)
    results=[]
    for w,h in SIZES:
        q.set_viewport_size(dict(width=w,height=h));q.clock.run_for(150)
        q.evaluate('(open)=>__compactQA.toggle("chat",open)',w>=1000)
        q.clock.run_for(100)
        results.append(dict(viewport=[w,h],components=measurements(q)))
        q.screenshot(path=str(OUT/phase/f'{w}x{h}.png'))
    (OUT/phase/'dimensions.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    if not opts.baseline:
        for sample in results:
            m=sample['components']
            assert m['profile']['width']<=320
            assert m['potion']['width']>=44 and m['potion']['height']>=44
            if sample['viewport'][0]>=1280:
                assert m['profile']['height']<=214
                assert m['hotbar']['height']<=80
        q.set_viewport_size(dict(width=1366,height=768));q.clock.run_for(200)
        assert q.locator('#hudPlayerName').inner_text()=='Nauta'
        assert q.locator('#hudClassName').inner_text()
        assert q.locator('#floatingExpedition').is_hidden(), 'Expedition starts closed'
        assert q.locator('.journey-content').is_hidden(), 'Objectives must not occupy the permanent HUD'
        assert q.locator('#journeyHud').bounding_box()['height']<=48,'Only a compact launcher remains'
        assert q.get_by_role('button', name='Explorar os mares').count()==0
        q.locator('#journeyToggle').click()
        assert q.locator('#floatingExpedition').is_visible()
        assert q.locator('.journey-content').is_visible()
        assert q.locator('#journeyToggle').get_attribute('aria-expanded')=='true'
        q.locator('#journeyAction').click()
        assert q.locator('#panelOverlay').is_visible()
        assert q.locator('#floatingExpedition').is_hidden(),'Contract window replaces the expedition context'
        q.keyboard.press('Escape')
        q.locator('#journeyToggle').click()
        q.keyboard.press('Escape')
        assert q.locator('#floatingExpedition').is_hidden()
        assert q.locator('#journeyToggle').evaluate('e=>e===document.activeElement')
        q.keyboard.press('o');assert q.locator('#floatingExpedition').is_visible()
        q.keyboard.press('o');assert q.locator('#floatingExpedition').is_hidden()
        q.locator('#modesMenuTrigger').click()
        q.locator('#expeditionMini').click()
        assert q.locator('#modesQuickMenu').is_hidden()
        assert q.locator('#floatingExpedition').is_visible()
        q.screenshot(path=str(OUT/phase/'expedition-desktop.png'))
        q.locator('[data-close-window=expedition]').click()
        assert q.locator('#modesMenuTrigger').evaluate('e=>e===document.activeElement')
        # Progress/reward changes while closed are reflected in the same live nodes.
        q.evaluate('__compactQA.game.stats.crab=6;__compactQA.refresh()')
        q.clock.run_for(100)
        assert q.locator('.journey-reward').is_visible()
        q.locator('#journeyToggle').click()
        assert q.locator('#journeyAction').get_attribute('data-claim')=='crab'
        q.locator('#journeyAction').click()
        assert q.evaluate('__compactQA.game.claimed.includes("crab")')
        q.locator('[data-close-window=expedition]').click()
        for w,h in [(844,390),(390,844)]:
            q.set_viewport_size(dict(width=w,height=h));q.clock.run_for(100)
            assert q.locator('#floatingExpedition').is_hidden(),'Resize never opens expedition'
            q.locator('#journeyToggle').click()
            r=q.locator('#floatingExpedition').bounding_box()
            assert r['y']>=0 and r['y']+r['height']<=h and r['x']>=0 and r['x']+r['width']<=w
            q.screenshot(path=str(OUT/phase/f'expedition-{w}.png'))
            q.locator('[data-close-window=expedition]').click()
        q.set_viewport_size(dict(width=1366,height=768));q.clock.run_for(100)
        q.evaluate('__compactQA.toggle("chat",true)')
        q.locator('#chatInput').fill('ojo: anotação local')
        q.locator('#chatInput').press('o')
        assert q.locator('#floatingExpedition').is_hidden(),'Typing O must not open expedition'
        q.locator('#chatInput').press('Enter')
        assert 'anotação local' in q.locator('#gameLog').inner_text()
        q.locator('#chatInput').blur()
        q.evaluate('__compactQA.game.hp=__compactQA.stats().maxHP/2;__compactQA.refresh()')
        old=q.evaluate('({potions:__compactQA.game.potions,gold:__compactQA.game.gold,hp:__compactQA.game.hp})')
        q.locator('#usePotion').click()
        assert q.evaluate('__compactQA.game.potions')==old['potions']-1
        assert q.evaluate('__compactQA.game.hp')>old['hp']
        q.locator('#buyPotion').click()
        assert q.evaluate('__compactQA.game.potions')==old['potions']
        assert q.evaluate('__compactQA.game.gold')==old['gold']-35
        # A self-targeted class skill exercises the real button and cooldown
        # without a timing dependency on enemy navigation.
        q.evaluate('''() => {const x=__compactQA;x.game.equipment.akuma_no_mi=null;
          x.game.classId='cyborg';x.syncFruit();x.enter();x.refresh()}''')
        if q.locator('#autoToggle').get_attribute('aria-pressed')=='true':
            q.locator('#autoToggle').click()
        q.evaluate('__compactQA.session.cooldowns[1]=0;__compactQA.game.energy=__compactQA.stats().maxEnergy;__compactQA.refresh()')
        q.locator('#classSkill2').click()
        for _ in range(20):
            q.clock.run_for(100)
            if 'is-cooling' in q.locator('#classSkill2').get_attribute('class'):break
        assert q.evaluate('__compactQA.session.cooldowns[1]')>0
        assert 'is-cooling' in q.locator('#classSkill2').get_attribute('class')
        assert q.locator('#classCooldown2').inner_text().endswith('s')
    assert not errors,errors
    print(json.dumps({'phase':phase,'measurements':results,'errors':errors}))
    c.close();b.close()

