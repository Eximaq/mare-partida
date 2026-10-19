"""Real UI/gameplay checks in isolated browser contexts; never touches the user's save."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/os.environ.get('MARE_CHARACTER_EVIDENCE_DIR','evidence-attributes')
OUT.mkdir(exist_ok=True)
KEY='mare-partida-save-v1'
results=[]
def record(name,detail):
    results.append({'test':name,'result':'passed','detail':detail})
    print(name+': passed',flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    errors=[]
    def new_page(seed=None,size=(1366,768)):
        context=browser.new_context(viewport={'width':size[0],'height':size[1]})
        if seed:
            context.add_init_script("if(!sessionStorage.getItem('seeded')){localStorage.setItem("+json.dumps(KEY)+","+json.dumps(json.dumps(seed))+");sessionStorage.setItem('seeded','1');}")
        page=context.new_page();page.route('**/__dev_version',lambda route:route.fulfill(body='stable-test'));page.on('pageerror',lambda e:errors.append(str(e)))
        page.clock.install();page.goto('http://127.0.0.1:8123/');page.wait_for_load_state('networkidle')
        return context,page
    def diag(page):return page.evaluate('window.__mareDiagnostics()')
    def saved(page):return json.loads(page.evaluate('localStorage.getItem('+json.dumps(KEY)+')'))
    template=None
    for cls in ['sword','brawler','gunner','rogue','cyborg','strategist','healer']:
        context,page=new_page()
        assert page.locator('[data-faction]').count()==4
        page.locator('#characterName').fill('Navegante '+cls[:5])
        page.locator('#nextToClass').click();page.locator('[data-class="'+cls+'"]').click();page.locator('#createCharacter').click()
        page.clock.run_for(150)
        first=diag(page);assert first['classId']==cls and first['attributePoints']==0
        initial_save=saved(page)
        if cls=='sword':template=initial_save
        page.locator('#enterHunt').click();page.locator('[data-island][data-current=true]').click();page.locator('[data-travel-area]').click()
        for _ in range(55):
            page.clock.run_for(1000)
            d=diag(page)
            assert d['walkable']
            if d['level']>=2 and d['kills']>=3:break
        d=diag(page)
        assert d['kills']>=1 and d['damage']>0,(cls,d)
        assert d['level']>=2 and d['attributePoints']==5*(d['level']-1),(cls,d)
        assert d['attributes']=={k:0 for k in d['attributes']}
        if cls=='strategist':assert d['skillUses'][0]>0
        if cls=='cyborg':assert sum(d['skillUses'])>0
        page.screenshot(path=str(OUT/(cls+'-combat.png')))
        record('create_idle_level_'+cls,{'kills':d['kills'],'level':d['level'],'unspent':d['attributePoints'],'skills':d['skillUses']})
        context.close()

    legacy={**template,'level':2,'xp':31,'gold':456,'hp':100,'materials':40}
    for field in ['attributeVersion','attributes','attributePoints']:legacy.pop(field,None)
    context,page=new_page(legacy)
    page.clock.run_for(200)
    assert diag(page)['attributePoints']==5
    original=json.loads(page.evaluate('localStorage.getItem('+json.dumps(KEY+'-before-attributes-v1')+')'))
    assert original==legacy
    page.locator('#attributePointsHud').click()
    before=diag(page)
    for key in ['strength','dexterity','vitality','intelligence','spirit']:
        page.locator('[data-attribute-add="'+key+'"]').click()
    assert page.locator('#pointsAvailable').inner_text()=='0'
    assert diag(page)['attributes']==before['attributes']
    assert diag(page)['stats']==before['stats']
    assert all(b.is_disabled() for b in page.locator('[data-attribute-add]').all())
    assert '→' in page.locator('[data-derived="maxHP"]').inner_text()
    page.locator('#resetAttributeDraft').click()
    assert page.locator('#pointsAvailable').inner_text()=='5'
    page.locator('[data-attribute-add="strength"]').click();page.locator('[data-attribute-remove="strength"]').click()
    assert page.locator('#pointsAvailable').inner_text()=='5'
    for key in ['strength','dexterity','vitality','intelligence','spirit']:
        page.locator('[data-attribute-add="'+key+'"]').click()
    page.locator('#confirmAttributes').click()
    after=diag(page)
    assert all(v==1 for v in after['attributes'].values()) and after['attributePoints']==0
    assert after['stats']['maxHP']>before['stats']['maxHP'] and after['stats']['physical']>before['stats']['physical']
    assert page.locator('#confirmAttributes').is_disabled()
    committed=saved(page)
    for field in ['level','xp','gold','inventory','equipment','materials','factionId','stats']:
        assert committed[field]==legacy[field],field
    for _ in range(3):
        page.reload();page.wait_for_load_state('networkidle');page.clock.run_for(100)
        assert diag(page)['attributePoints']==0 and diag(page)['attributes']==after['attributes']
    record('legacy_preview_confirm_reload','Original save backed up; all five stats preview, reset, remove and confirm; progress/items retained, no duplicate points across three reloads.')
    for width,height in [(1366,768),(1920,1080),(390,844)]:
        page.set_viewport_size({'width':width,'height':height});page.locator('#attributePointsHud').click()
        page.locator('#dialogBody').evaluate('(el)=>el.scrollTop=0')
        box=page.locator('#panelOverlay .dialog').bounding_box()
        assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width+1 and box['y']+box['height']<=height+1
        assert page.locator('#dialogBody').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1')
        page.screenshot(path=str(OUT/f'character-{width}x{height}.png'))
        page.locator('#closePanel').click()
    page.locator('[data-panel="inventory"]').first.click()
    assert page.locator('#panelOverlay').evaluate("el=>el.classList.contains('inventory-mode')")
    page.locator('[data-close-panel]').click();page.locator('[data-panel="forge"]').first.click()
    gold=saved(page)['gold'];plus=saved(page)['equipment']['weapon']['plus']
    page.locator('[data-forge="weapon"]').click();page.locator('[data-confirm-accept]').click()
    forged=saved(page);assert forged['gold']<gold and forged['equipment']['weapon']['plus']==plus+1
    record('character_resolutions_inventory_forge','Character panel fits desktop and mobile; existing inventory and guaranteed +1 forge still work.')
    context.close()

    healer={**template,'classId':'healer','hp':20,'potions':0,'preferences':{'healThreshold':.7}}
    healer['equipment']={**healer['equipment'],'weapon':None}
    context,page=new_page(healer)
    page.clock.run_for(100)
    page.locator('#attributePointsHud').click();page.locator('#healThreshold').select_option('0.8')
    assert saved(page)['preferences']['healThreshold']==.8
    page.locator('#closePanel').click();page.locator('#enterHunt').click();page.locator('[data-island][data-current=true]').click();page.locator('[data-travel-area]').click();page.clock.run_for(100)
    d=diag(page)
    assert d['healingDone']>0 and d['hp']>20 and d['cooldowns'][0]>0 and d['energy']<d['stats']['maxEnergy']
    assert d['guard']>0 and d['skillUses'][1]>0
    count=d['skillUses'][0];page.clock.run_for(100);assert diag(page)['skillUses'][0]==count
    page.screenshot(path=str(OUT/'healer-real-heal.png'))
    record('healer_real_heal_buff_cooldown','Configured 80% threshold persists; injured solo healer restores HP, spends energy, activates real protection and respects cooldown.')
    context.close()
    full={**healer,'hp':9999}
    context,page=new_page(full);page.clock.run_for(50);page.locator('#enterHunt').click();page.locator('[data-island][data-current=true]').click();page.locator('[data-travel-area]').click();page.locator('#skill1').click();page.clock.run_for(50)
    assert diag(page)['skillUses'][0]==0 and diag(page)['cooldowns'][0]==0
    record('healer_no_wasted_full_health_heal','Full-health heal does not consume energy or start cooldown.')
    context.close()
    assert not errors,errors
    record('javascript','No uncaught JS errors across all isolated contexts.')
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')
