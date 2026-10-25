"""Real-browser inventory grid and rarity visual regression, isolated saved progress."""
import copy
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for, create, fixture, saved

OUT=Path(os.environ.get('MARE_INVENTORY_EVIDENCE','/tmp/mare-inventory-visual'))
OUT.mkdir(parents=True,exist_ok=True)
SIZES=[(1440,900,9),(1280,800,9),(1180,800,8),(1024,768,7),(768,900,7),(390,844,6),(360,800,5)]
def verify_grid(page, columns):
    result=page.locator('#panelOverlay.inventory-mode .op-grid').evaluate("""e=>{
      const wrap=e.parentElement, item=e.querySelector('.op-item');
      const r=e.getBoundingClientRect(),p=wrap.getBoundingClientRect(),s=item.getBoundingClientRect();
      return {grid:r.width,wrap:p.width,slotWidth:s.width,slotHeight:s.height,
        visibleColumns:getComputedStyle(e).gridTemplateColumns.split(' ').length,
        count:e.children.length};
    }""")
    assert result['visibleColumns']==columns,result
    assert result['count']==columns*7,result
    assert result['grid']/result['wrap']>.9,result
    assert abs(result['slotWidth']-result['slotHeight'])<1.5,result
    frames=page.locator('#panelOverlay.inventory-mode .op-equip-slot.filled')
    assert frames.count()>0
    for i in range(frames.count()):
        background=frames.nth(i).evaluate('e=>getComputedStyle(e).backgroundImage')
        assert background=='none',(i,background)
    return result

with sync_playwright() as p:
    browser=p.chromium.launch()
    c,q=page_for(browser)
    base=create(q);c.close()
    data=fixture(base)
    data['inventory']=[
       {'id':f'grid-{i}','def':i%33,'level':1,'plus':0,'locked':False,'obtainedAt':i+30,
        'origin':'Teste visual isolado'} for i in range(119)]
    results=[]
    for width,height,columns in SIZES:
        c,q=page_for(browser,copy.deepcopy(data),(width,height))
        keys=('inventory','equipment','gold','materials','potions','attributes','classId','factionId')
        before={key:saved(q).get(key) for key in keys}
        q.locator('#mainMenu [data-panel=inventory]').click()
        r=verify_grid(q,columns)
        q.locator('.op-grid .op-item:not(.empty)').first.click()
        assert q.locator('.op-grid .op-item.selected').count()==1
        q.screenshot(path=str(OUT/f'inventory-{width}.png'),full_page=True)
        assert {key:saved(q).get(key) for key in keys}==before,'UI changed persistent inventory/equipment data'
        results.append({'size':[width,height],'columns':columns,'grid':r})
        c.close()
    # Exercise in-place responsive pagination: page 2 at 9x7 -> page 2 at 6x7.
    c,q=page_for(browser,copy.deepcopy(data),(1440,900))
    q.locator('#mainMenu [data-panel=inventory]').click()
    q.locator('.op-pagination [data-inv-page="1"]').first.click()
    assert verify_grid(q,9)['count']==63
    q.set_viewport_size({'width':390,'height':844})
    q.wait_for_function("document.querySelectorAll('#panelOverlay .op-grid > .op-item').length===42")
    verify_grid(q,6)
    assert q.locator('.op-pagination [data-inv-page="1"].active').count()==1
    q.screenshot(path=str(OUT/'inventory-after-resize-390.png'),full_page=True)
    c.close();browser.close()
    (OUT/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print('Inventory grid desktop/tablet/mobile and resize: passed',flush=True)
