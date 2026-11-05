"""HUD composition acceptance in the running game; no production save is read."""
import os, json
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for, create, fixture

OUT = Path(os.environ.get('HUD_EVIDENCE', 'tmp/hud-nautical-v2'))
OUT.mkdir(parents=True, exist_ok=True)

def check_layout(page, label):
    result = page.evaluate('''() => {
      const selectors=['.topbar','#mainMenu','.location-heading','#floatingChat','#journeyHud','.action-panel','.world-command','#targetHud','#huntXpTracker'];
      const surfaces=selectors.map(selector=>({selector,e:document.querySelector(selector)}))
        .filter(({e})=>e&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden')
        .map(({selector,e})=>({selector,...e.getBoundingClientRect().toJSON()}));
      const failures=[];
      for(const r of surfaces) if(r.x<-.5||r.y<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5) failures.push(['bounds',r]);
      for(let i=0;i<surfaces.length;i++)for(let j=i+1;j<surfaces.length;j++){
        const a=surfaces[i],b=surfaces[j];
        if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)
          failures.push(['overlap',a.selector,b.selector]);
      }
      for(const id of ['miniHPText','miniEnergyText','miniXPText','miniGold','willpowerText']){
        const e=document.getElementById(id);
        if(e.getClientRects().length&&parseFloat(getComputedStyle(e).fontSize)<14)failures.push(['small text',id]);
      }
      for(const e of document.querySelectorAll('#mainMenu [data-panel],#socialMenuTrigger,.action-panel .skill-button')){
        if(!e.getClientRects().length)continue;
        const r=e.getBoundingClientRect();
        if(r.width<44||r.height<44)failures.push(['small target',e.id||e.dataset.panel]);
        if(e.closest('.action-panel')){
          const a=e.closest('.action-panel').getBoundingClientRect();
          if(r.left<a.left||r.right>a.right||r.top<a.top||r.bottom>a.bottom)failures.push(['slot overflow',e.id]);
        }
      }
      return {surfaces,failures};
    }''')
    assert not result['failures'], (label,result['failures'])
    return dict(state=label, **result)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'))
    context, page = page_for(browser, size=(1600, 900))
    seed = fixture(create(page))
    seed.update(level=53, gold=229378, has_haki_unlocked=True, hp=99999, energy=99999)
    context.close()
    context, page = page_for(browser, seed, size=(1600, 900))
    page.clock.run_for(500)
    page.evaluate('document.fonts.ready')
    page.screenshot(path=str(OUT / 'desktop.png'))
    geometry = page.evaluate('''() => {
      const rect=s=>document.querySelector(s).getBoundingClientRect();
      const profile=rect('.topbar'), emblem=rect('#characterPosterToggle'), title=rect('#hudHierarchyTitle'), hp=rect('#miniHPText').width;
      const meter=document.querySelector('#miniHP').closest('[role=meter]');
      return {leftEmblem:emblem.right<=title.left+2, wideVitals:meter.getBoundingClientRect().width/profile.width>.8,
        readableTitle:parseFloat(getComputedStyle(document.querySelector('#hudPlayerName')).fontSize)>=20,
        readableValue:parseFloat(getComputedStyle(document.querySelector('#miniHPText')).fontSize)>=14};
    }''')
    assert all(geometry.values()), geometry
    print('PASS nautical profile composition', geometry)
    results=[check_layout(page,'1600x900')]
    for width,height in [(1920,1080),(1366,768),(1280,720),(1024,768),(768,1024),(390,844),(412,915),(844,390)]:
        page.set_viewport_size(dict(width=width,height=height))
        page.clock.run_for(300)
        if (height<500 or width<=760) and page.locator('#floatingChat').is_visible():
            page.locator('#floatingChat [data-close-window]').click()
            page.clock.run_for(100)
        results.append(check_layout(page,f'{width}x{height}'))
        page.screenshot(path=str(OUT / f'hud-{width}x{height}.png'))
        if width<=760:
            page.locator('#chatCornerToggle').click()
            page.clock.run_for(100)
            results.append(check_layout(page,f'chat-{width}'))
            page.screenshot(path=str(OUT / f'chat-{width}.png'))
            page.locator('#floatingChat [data-close-window]').click()
        if height<500:
            page.locator('#journeyToggle').click()
            page.clock.run_for(100)
            assert page.locator('.journey-content').is_visible(), 'landscape diary must expand'
            results.append(check_layout(page,'landscape-diary-expanded'))
            page.locator('#floatingExpedition [data-close-window]').click()
    # Presentation fixture: simultaneous third skill, transformation and Haki.
    # Their gameplay rules are covered by the existing Zoan/Haki suites.
    for width,height in [(1366,768),(390,844),(844,390)]:
        page.set_viewport_size(dict(width=width,height=height))
        page.clock.run_for(100)
        page.evaluate("['skill3','zoanTransform','hakiQuickCast'].forEach(id=>document.getElementById(id).style.setProperty('display',id==='hakiQuickCast'?'flex':'grid','important'))")
        page.wait_for_timeout(100)
        results.append(check_layout(page,f'all-slots-{width}'))
        page.screenshot(path=str(OUT / f'all-slots-{width}.png'))
        page.evaluate("['skill3','zoanTransform','hakiQuickCast'].forEach(id=>document.getElementById(id).style.removeProperty('display'))")
    page.set_viewport_size(dict(width=1366,height=768))
    page.clock.run_for(100)
    page.locator('#modesMenuTrigger').click()
    page.locator('[data-quick-mode=map]').click()
    page.locator('[data-island=dawn]').click()
    page.locator('[data-travel-area=beach]').click()
    page.clock.run_for(500)
    # Initial map assets/navigation may finish after the first half-second on a cold runner.
    page.locator('#targetHud').wait_for(state='visible')
    page.clock.pause_at(page.evaluate('Date.now()+1'))
    if page.locator('#floatingChat').is_visible():
        page.locator('#floatingChat [data-close-window]').click()
    for width,height in [(1600,900),(1366,768),(1024,768),(768,1024),(390,844),(844,390)]:
        page.set_viewport_size(dict(width=width,height=height))
        # Compare responsive geometry at the same live combat frame, without killing the target between sizes.
        # The ResizeObserver publishes the wrapped action bar height after viewport layout.
        page.wait_for_function("""() => parseFloat(document.documentElement.style.getPropertyValue('--rpg-action-height'))
            === Math.ceil(document.querySelector('.action-panel').getBoundingClientRect().height)""", timeout=5000)
        assert page.locator('#targetHud').is_visible(), page.evaluate('()=>{const d=__mareDiagnostics();return {scene:d.scene,auto:d.autoPlay,map:d.map,hp:d.hp,mobs:d.alive}}')
        assert page.locator('#huntXpTracker').is_visible()
        results.append(check_layout(page,f'combat-{width}'))
        page.screenshot(path=str(OUT / f'combat-{width}.png'))
    (OUT/'layout-results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print(f'PASS {len(results)} layouts: bounds, overlap, readable resources and action targets')
    context.close()
    browser.close()
