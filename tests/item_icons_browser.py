"""Inventory, forge and prison icon coverage using an isolated browser save."""
import copy,json,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for,create,saved,ROOT

OUT=Path(tempfile.gettempdir())/'mare-item-icons';OUT.mkdir(exist_ok=True)
manifest=json.loads((ROOT/'assets/ui/items-pixellab/manifest.json').read_text(encoding='utf-8'))
expected={i['key'] for i in manifest['icons']}

def loaded(q):
    q.wait_for_function("[...document.querySelectorAll('#dialogBody img')].every(i=>i.complete&&i.naturalWidth>0)")
    return q.locator('#dialogBody img[src*="items-pixellab/"]').evaluate_all("xs=>xs.map(i=>({key:i.src.split('/').pop().split('.png')[0],width:i.naturalWidth,height:i.naturalHeight}))")

with sync_playwright() as p:
    b=p.chromium.launch();errors=[];c,q=page_for(b,errors=errors)
    q.wait_for_function("[...document.querySelectorAll('.class-art img')].every(i=>i.complete&&i.naturalWidth===32)")
    template=create(q);c.close()
    seed=copy.deepcopy(template);seed['inventory']=[dict(id='icon-'+str(i),def_=i) for i in range(62)]
    for i,item in enumerate(seed['inventory']):
        item['def']=item.pop('def_');item.update(level=1,plus=0,locked=False,obtainedAt=i+1)
        if 33<=i<58:item['pearlId']='pearl_'+['for','des','vit','int','esp'][(i-33)//5]+'_'+str((i-33)%5+1)
    for size in [(1366,768),(393,852)]:
        c,q=page_for(b,seed,size,errors);before=saved(q)
        q.locator('#mainMenu [data-panel=inventory]').click();rows=loaded(q)
        q.locator('.op-pagination [data-inv-page="1"]').first.click();rows+=loaded(q)
        assert {r['key'] for r in rows}==expected,(expected-{r['key'] for r in rows})
        assert all(r['width']==r['height']==32 for r in rows)
        assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
        q.screenshot(path=str(OUT/f'inventory-{size[0]}.png'))
        q.locator('[data-inv-category=consumables]').click();q.locator('[data-item=icon-61]').click();loaded(q)
        assert q.locator('#dialogBody .haki-icon').get_attribute('src').startswith('assets/ui/items-pixellab/book.png')
        q.keyboard.press('Escape');q.locator('#mainMenu [data-panel=forge]').click();loaded(q)
        q.locator('[data-forge-tab=imbue]').click();rows=loaded(q)
        assert len({r['key'] for r in rows if r['key'].startswith('pearl_')})==25
        q.screenshot(path=str(OUT/f'forge-{size[0]}.png'))
        q.keyboard.press('Escape');q.locator('#modesMenuTrigger').click();q.locator('[data-quick-mode=prison]').click();rows=loaded(q)
        assert any(r['key']=='pearl-box-1' for r in rows)
        q.keyboard.press('Escape');q.reload();q.wait_for_load_state('networkidle');after=saved(q)
        for key in ['inventory','equipment','gold','materials','potions','level','xp','attributes','claimed']:assert before.get(key)==after.get(key),key
        print('All 64 icons, creation, inventory, forge, prison and save persistence:',size,'passed',flush=True)
        c.close()
    assert not errors,errors;b.close()
