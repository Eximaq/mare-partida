"""Real UI acceptance in isolated contexts; user LocalStorage is never accessed."""
import copy,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/evidence-ui-nautical';OUT.mkdir(parents=True,exist_ok=True)
KEY='mare-partida-save-v1';results=[];errors=[]
def record(name,detail):results.append({'test':name,'passed':True,'detail':detail});print(name+': passed',flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    def page_for(seed=None,size=(1366,768)):
        context=browser.new_context(viewport={'width':size[0],'height':size[1]});context.route('**/__dev_version',lambda route:route.fulfill(body='stable-test'))
        if seed:context.add_init_script("if(!sessionStorage.seeded){localStorage.setItem("+json.dumps(KEY)+","+json.dumps(json.dumps(seed))+");sessionStorage.seeded='1'}")
        page=context.new_page();page.on('pageerror',lambda e:errors.append({'error':str(e),'stack':e.stack,'url':page.url}));page.clock.install();page.goto('http://127.0.0.1:8123/');page.wait_for_load_state('networkidle');return context,page
    def saved(q):return json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'))
    def page_birth(q):return q.evaluate('MareCharacters.birth[window.__mareDiagnostics().classId]')
    def diag(q):return q.evaluate('window.__mareDiagnostics()')
    def panel(q,key):q.locator('.bottom-nav [data-panel="'+key+'"]').click();q.wait_for_timeout(20)
    def close(q):q.locator('[data-close-panel]' if q.locator('.inventory-mode').count() else '#closePanel').click();assert q.locator('#panelOverlay').is_hidden()
    expected={'sword':[15,14,9,6,6],'brawler':[14,9,13,5,9],'gunner':[9,15,8,10,8],'rogue':[10,16,9,7,8],'cyborg':[11,6,17,8,8],'strategist':[5,8,8,17,12],'healer':[5,8,10,12,15]}
    for cls,values in expected.items():
        c,q=page_for();q.locator('#characterName').fill('Nauta '+cls);q.locator('#nextToClass').click();assert q.locator('[data-class="'+cls+'"] .birth-stats').is_visible();q.locator('[data-class="'+cls+'"]').click();q.locator('#createCharacter').click();d=diag(q);assert list(page_birth(q).values())==values;assert all(a>=b for a,b in zip(d['stats']['attributes'].values(),values));assert sum(values)==50 and d['attributePoints']==0
        if cls=='sword':template=saved(q)
        c.close()
    record('seven_class_births','All seven created through actual UI; exact birth tables, total50, zero spent/unspent at level1.')
    seed=copy.deepcopy(template);seed.update(level=25,attributeVersion=1,attributes={'strength':7,'dexterity':3,'vitality':0,'intelligence':0,'spirit':0},attributePoints=999,gold=5000,materials=100,potions=8)
    c,q=page_for(seed);assert diag(q)['attributePoints']==110;assert saved(q)['attributeVersion']==2;assert json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY+'-before-attributes-v2')+')'))==seed
    panel(q,'character');before=diag(q)
    for amount in [1,5,10,25]:
        q.locator('[data-attribute-quantity="'+str(amount)+'"]').click();assert q.locator('[data-attribute-quantity="'+str(amount)+'"]').get_attribute('aria-pressed')=='true'
        q.locator('[data-attribute-add=strength]').click();assert q.locator('#pointsAvailable').inner_text()==str(110-amount);assert diag(q)['attributes']==before['attributes'];q.locator('#resetAttributeDraft').click()
    q.locator('[data-attribute-quantity="25"]').click()
    for _ in range(4):q.locator('[data-attribute-add=strength]').click()
    q.locator('[data-attribute-add=strength]').click();assert 'Pontos insuficientes' in q.locator('#allocationStatus').inner_text();assert q.locator('#pointsAvailable').inner_text()=='10'
    q.locator('#cancelAttributes').click();assert diag(q)['attributes']==before['attributes'] and diag(q)['attributePoints']==110
    panel(q,'character');q.locator('[data-attribute-quantity=max]').click();q.locator('[data-attribute-add=vitality]').click();assert q.locator('#pointsAvailable').inner_text()=='0';assert '→' in q.locator('[data-derived=maxHP]').inner_text();assert diag(q)['stats']==before['stats'];q.locator('#confirmAttributes').click();assert diag(q)['attributes']['vitality']==110 and diag(q)['attributePoints']==0;assert q.locator('#confirmAttributes').is_disabled()
    committed=saved(q)
    for _ in range(3):q.reload();q.wait_for_load_state('networkidle');assert diag(q)['attributes']==committed['attributes'] and diag(q)['attributePoints']==0
    for key in ['equipment','inventory','gold','xp','factionId','classId']:assert committed[key]==seed[key]
    record('quantity_transactions_migration','+1/+5/+10/+25/MAX, highlight, insufficient budget, preview, cancel/clear, confirm, v1 backup, three reloads preserve investment and progress.')
    panel(q,'character')
    for selector in ['#changeIdentity','#showFactionPreview','.identity-manager','.inv-profile-visible']:
        assert q.locator(selector).count()==0
    close(q)
    record('character_menu_cleanup','Removed identity reconfiguration, sprite inspection and equipment summary; main attributes remain available.')
    c.close()
    manifest=json.loads((ROOT/'assets/ui/items/manifest.json').read_text(encoding='utf-8'))
    gallery=copy.deepcopy(template);gallery.update(level=12,gold=5000,materials=100,potions=5)
    gallery['inventory']=[{'id':f'gallery-{i}','def':i,'level':1,'plus':i%4,'locked':False,'obtainedAt':i} for i in range(33)]
    for slot,index in {'head':18,'necklace':20,'coat':6,'legs':21,'boots':8,'weapon':0,'cloak':23,'gloves':25,'ring':27,'belt':29,'charm':10}.items():
        gallery['equipment'][slot]={'id':'equipped-'+slot,'def':index,'level':1,'plus':index%3,'locked':False,'obtainedAt':1}
    for size in [(1920,1080),(1366,768),(1280,720)]:
        w,h=size;c,q=page_for(gallery,size);q.screenshot(path=str(OUT/f'menu-{w}x{h}.png'))
        assert q.locator('.bottom-nav [data-panel]').count()==6
        assert q.locator('.bottom-nav img').evaluate_all('(els)=>els.every(i=>i.complete&&i.naturalWidth>0)')
        bounds=q.locator('.bottom-nav').bounding_box();assert bounds['x']>=0 and bounds['x']+bounds['width']<=w
        for key in ['inventory','character','forge','map','contracts','help']:
            panel(q,key);box=q.locator('#panelOverlay .dialog').bounding_box();assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=w+1 and box['y']+box['height']<=h+1
            assert q.locator('#dialogBody').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1'),(key,size,'horizontal overflow')
            if key=='inventory':
                assert q.locator('#inventorySprite').evaluate('(c)=>c.getContext("2d").getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4===3&&n>0)')
                assert q.locator('.op-slot-icon .item-icon').count()==11
                assert q.locator('.op-grid .item-icon').count()==35
                assert q.locator('.op-grid .item-icon').evaluate_all('(els)=>els.every(i=>i.complete&&i.naturalWidth>0)')
                assert q.locator('.op-body-grid').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
                # Bottom equipment and controls remain in the visible viewport.
                for selector in ['[data-inv-slot=charm]','.op-hide-check','.op-pagination','.op-action.primary']:
                    b=q.locator(selector).bounding_box();assert b['y']>=0 and b['y']+b['height']<=h,(selector,size,b)
            q.screenshot(path=str(OUT/f'{key}-{w}x{h}.png'));close(q)
        # Real item actions still work after replacing the icon markup.
        panel(q,'inventory');q.locator('[data-item="gallery-1"]').click();q.locator('[data-equip="gallery-1"]').click();assert saved(q)['equipment']['weapon']['def']==1
        q.locator('[data-inv-lock="gallery-1"]').click();assert saved(q)['equipment']['weapon']['locked'];q.locator('[data-inv-lock="gallery-1"]').click()
        q.locator('[data-inv-category=consumables]').click();q.locator('[data-item=virtual-potion]').click();potions=saved(q)['potions'];q.locator('[data-inv-use-potion]').click();assert saved(q)['potions']==potions-1
        q.locator('[data-panel=shop]').filter(has_text='COMPRAR MAIS').click();q.screenshot(path=str(OUT/f'shop-{w}x{h}.png'));gold=saved(q)['gold'];q.locator('[data-buy-potion]').click();assert saved(q)['gold']==gold-35;close(q)
        panel(q,'forge');plus=saved(q)['equipment']['weapon']['plus'];q.locator('[data-forge=weapon]').click();q.locator('[data-confirm-accept]').click();assert saved(q)['equipment']['weapon']['plus']==plus+1;close(q)
        panel(q,'help');before=saved(q);q.locator('[data-reset]').click();q.screenshot(path=str(OUT/f'confirmation-{w}x{h}.png'));q.locator('[data-confirm-cancel]').click();after=saved(q)
        for key in ['name','classId','factionId','level','xp','gold','inventory','equipment','potions','materials','attributes']:assert after[key]==before[key],(key,before[key],after[key])
        close(q)
        c.close();c,q=page_for(size=size);q.locator('#characterName').fill('Nauta Teste');q.screenshot(path=str(OUT/f'selection-{w}x{h}.png'));q.locator('#nextToClass').click();q.screenshot(path=str(OUT/f'classes-{w}x{h}.png'))
        record(f'windows_items_{w}x{h}','Seven windows, selection/classes, shop, confirmation, all35 icons, current sprite, aligned equipment, equip/lock/forge/buy and cancel reset; no horizontal overflow.')
        c.close()
    # Isolated native browser SVG rasterization provides an overview for visual inspection.
    c=browser.new_context(viewport={'width':1160,'height':850});q=c.new_page();q.set_content('<body style="background:#152d34;color:#f6e6bf;font:12px sans-serif;display:grid;grid-template-columns:repeat(7,150px);gap:12px">'+''.join(f'<div style="text-align:center;border:1px solid #b58b4b;padding:8px"><img style="width:64px;height:64px;image-rendering:pixelated" src="http://127.0.0.1:8123/assets/ui/items/{a["file"]}"><p>{a["name"]}</p></div>' for a in manifest)+'</body>');q.wait_for_load_state('networkidle');assert q.locator('img').evaluate_all('(els)=>els.every(i=>i.complete&&i.naturalWidth>0)');q.screenshot(path=str(OUT/'item-catalog.png'),full_page=True);c.close()
    assert not errors,errors;record('javascript','No uncaught JavaScript errors in acceptance contexts.');browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
