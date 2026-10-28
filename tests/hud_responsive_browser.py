"""Window reflow, mobile inventory jumps and safe UI-only navigation."""
import copy, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for, create, fixture, saved

OUT=Path(os.environ.get('MARE_INVENTORY_EVIDENCE','/tmp/mare-inventory-visual'))/'hud'
OUT.mkdir(parents=True,exist_ok=True)
SIZES=[(1366,768),(1024,768),(768,900),(390,844),(320,568),(844,390),(568,320)]
SECTIONS=['inventory','forge','status','talents','achievements','haki','akuma','hierarchy','contracts','map','prison','help','journal','myprofile','settings','appearance']
KEYS=['inventory','equipment','gold','potions','materials','attributes','level','classId','factionId','talentTrees']

def open_panel(q,name):
    if name in ['journal','myprofile','settings']:
        q.locator('#captainMenuTrigger').click()
        q.locator('[data-captain-section='+name+']').click()
    elif name=='appearance':
        open_panel(q,'status')
        q.get_by_role('button',name='Personalizar aparência',exact=True).click()
    elif name in ['status','talents','achievements','haki','akuma','hierarchy']:
        q.locator('#characterMenuBrowse').click()
        q.locator('[data-character-section='+name+']').click()
    elif name in ['map','prison']:
        q.locator('#modesMenuTrigger').click()
        q.locator('[data-quick-mode='+name+']').click()
    else:q.locator('#mainMenu [data-panel='+name+']').click()

with sync_playwright() as p:
    b=p.chromium.launch();errors=[]
    c,q=page_for(b,errors=errors);seed=fixture(create(q));c.close()
    seed.update(level=50,has_haki_unlocked=True,haki={'current':100,'unlocked':True})
    results=[]
    for w,h in SIZES:
        c,q=page_for(b,copy.deepcopy(seed),(w,h),errors)
        before={k:saved(q).get(k) for k in KEYS}
        for name in SECTIONS:
            open_panel(q,name)
            content=q.locator('#dialogBody')
            assert content.evaluate('e=>e.scrollWidth<=e.clientWidth+1'),(name,w,h,'horizontal overflow')
            close=q.locator('.op-close' if name=='inventory' else '#closePanel')
            rect=close.bounding_box()
            assert rect and 0<=rect['x'] and rect['x']+rect['width']<=w+1 and rect['y']+rect['height']<=h+1,(name,w,h,rect)
            if name=='inventory' and w<=760:
                nav=q.get_by_role('navigation',name='Seções do inventário')
                assert nav.is_visible()
                for label,target in [('Mochila','#inventory-bag'),('Detalhes','#inventory-detail'),('Equipamentos','#inventory-equipment')]:
                    nav.get_by_role('link',name=label,exact=True).click()
                    # Anchor navigation must reveal the heading below the sticky bar.
                    section=q.locator(target).bounding_box();bar=q.locator('.op-topbar').bounding_box()
                    assert section['y']>=bar['y']+bar['height']-2,(label,section,bar)
                    assert section['y']<h-50,(label,section)
            q.screenshot(path=str(OUT/f'{name}-{w}-{h}.png'))
            close.click()
        standard=q.locator('#mainMenu [data-panel=inventory]').bounding_box()['width']
        open_panel(q,'settings');q.locator('[data-settings-card=interface]').click()
        q.get_by_role('combobox',name='Densidade da HUD',exact=True).select_option('compact')
        q.locator('#closePanel').click()
        q.wait_for_function('(max)=>document.querySelector("#mainMenu [data-panel=inventory]").getBoundingClientRect().width<=max+1',arg=standard)
        open_panel(q,'settings')
        q.get_by_role('combobox',name='Densidade da HUD',exact=True).select_option('standard')
        q.locator('#closePanel').click()
        assert {k:saved(q).get(k) for k in KEYS}==before,'Presentation changed game progress'
        open_panel(q,'map');q.locator('[data-island=dawn]').click();q.locator('[data-travel-area=beach]').click()
        q.clock.run_for(300)
        if q.get_by_role('button',name='Fechar canal',exact=True).is_visible():
            q.get_by_role('button',name='Fechar canal',exact=True).click()
        q.clock.run_for(300)
        for a,bx in [('#targetHud','#mainMenu'),('#huntXpTracker','#journeyHud'),('#huntXpTracker','#mainMenu')]:
            first,second=q.locator(a),q.locator(bx)
            assert first.is_visible() and second.is_visible(),(a,bx,'combat fixture must expose both surfaces')
            r,t=first.bounding_box(),second.bounding_box()
            x=min(r['x']+r['width'],t['x']+t['width'])-max(r['x'],t['x'])
            y=min(r['y']+r['height'],t['y']+t['height'])-max(r['y'],t['y'])
            assert x<=1 or y<=1,(a,bx,w,h,x,y)
        q.screenshot(path=str(OUT/f'combat-{w}-{h}.png'))
        results.append({'viewport':[w,h],'windows':len(SECTIONS),'overflow':False})
        c.close()
    b.close();assert not errors,errors
    (OUT/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print('HUD/window reflow, inventory section jumps and preserved progress: passed')
