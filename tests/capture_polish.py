"""Before/after screenshots of the current runtime, with controlled local fixtures."""
import sys,json
from playwright.sync_api import sync_playwright
from polish_support import *
phase=sys.argv[1] if len(sys.argv)>1 else 'after'
out=ROOT/'docs/evidence-polish'/phase;out.mkdir(parents=True,exist_ok=True)
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True);c,q=page_for(b,errors=errors);template=create(q);c.close()
    for size in SIZES:
        suffix=f'{size[0]}x{size[1]}';c,q=page_for(b,fixture(template),size,errors)
        q.screenshot(path=str(out/f'lobby-{suffix}.png'))
        if phase=='after' and q.locator('#menuSizeToggle').count():
            q.locator('#menuSizeToggle').click();q.screenshot(path=str(out/f'menu-expanded-{suffix}.png'));q.locator('#menuSizeToggle').click()
        for key in ['inventory','character','forge','contracts','help','map']:
            panel(q,key);q.wait_for_function("[...document.querySelectorAll('#dialogBody img')].every(i=>i.complete&&i.naturalWidth>0)");q.screenshot(path=str(out/f'{key}-{suffix}.png'));close(q)
        panel(q,'inventory');q.locator('[data-inv-category=consumables]').click();q.locator('[data-item=virtual-potion]').click();q.locator('[data-panel=shop]').click();q.screenshot(path=str(out/f'shop-{suffix}.png'));close(q)
        panel(q,'help');q.locator('[data-reset]').click();q.screenshot(path=str(out/f'confirmation-{suffix}.png'));q.locator('[data-confirm-cancel]').click();close(q)
        q.locator('#enterHunt').click();q.locator('[data-island][data-current=true]').click();q.locator('[data-travel-area]').click();q.clock.run_for(1200);q.screenshot(path=str(out/f'hunt-{suffix}.png'));c.close()
        c,q=page_for(b,size=size,errors=errors);q.locator('#characterName').fill('Nauta Polimento');q.screenshot(path=str(out/f'factions-{suffix}.png'));q.locator('#nextToClass').click();q.screenshot(path=str(out/f'classes-{suffix}.png'));c.close()
    assert not errors,errors;b.close()
(out/'capture-result.json').write_text(json.dumps({'phase':phase,'sizes':SIZES,'screenshots':len(list(out.glob('*.png'))),'javascript_errors':errors},indent=2))
print(f'{phase}: captured {len(list(out.glob("*.png")))} actual screenshots; no JS errors',flush=True)
