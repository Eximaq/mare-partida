"""Visual forge flows, actual atomic operations, isolated saves and responsive evidence."""
import copy,json,os,tempfile
from playwright.sync_api import sync_playwright
from polish_support import *
OUT=Path(os.environ.get('MARE_FORGE_EVIDENCE',str(Path(tempfile.gettempdir())/'mare-forge-browser')));OUT.mkdir(parents=True,exist_ok=True)
results=[];errors=[]
def record(name):results.append(dict(test=name,passed=True));print(name+': passed',flush=True)
def same(q,before):
    after=saved(q)
    for k in ['forgeSeq','equipment','inventory','gold','materials','attributes','level','xp','forgeHistory']:assert after.get(k)==before.get(k),k
def confirm(q):q.locator('[data-confirm-accept]').click()
def tab(q,name):q.locator('[data-forge-tab='+name+']').click()
def shot(q,name):
    q.locator('#dialogBody').evaluate('(e)=>e.scrollTop=0')
    for selector in ['.forge2-selection','.forge2-operation']:q.locator(selector).evaluate('(e)=>e.scrollTop=0')
    try:q.wait_for_function("[...document.querySelectorAll('#dialogBody img')].every(i=>i.complete&&i.naturalWidth>0)")
    except Exception:
        print(q.locator('#dialogBody img').evaluate_all('(xs)=>xs.filter(i=>!i.complete||!i.naturalWidth).map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth}))'),flush=True)
        raise
    assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    for s in ['.forge2-tabs','.forge2-selection','.forge2-operation']:
        b=q.locator(s).bounding_box();assert b['x']>=0 and b['x']+b['width']<=q.viewport_size['width']+1,(s,b)
    q.screenshot(path=str(OUT/(name+'.png')))
def seeded(template):
    g=fixture(template);g.update(gold=1000000,materials=10000,forgeVersion=2);g.pop('forgeHistory',None)
    g['equipment']['weapon'].update(rarity='epic',level=10)
    for a in ['for','des','vit','int','esp']:
        for n in range(1,6):
            index=['for','des','vit','int','esp'].index(a)*5+n-1
            for j in range(11 if a=='for' and n==1 else 1):g['inventory'].append({'id':f'p-{a}-{n}-{j}','def':33+index,'pearlId':f'pearl_{a}_{n}','level':1,'plus':0,'locked':False})
    return g
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get("CHROME_PATH"));c,q=page_for(browser,errors=errors);template=create(q);c.close()
    for size in SIZES:
        suffix=f'{size[0]}x{size[1]}';seed=seeded(template);c,q=page_for(browser,seed,size,errors);original=saved(q)
        assert original['forgeVersion']==4
        backup=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY+'-before-forge-v4')+')'));assert backup==seed
        panel(q,'forge');assert q.get_by_role('tab').count()==4;assert not q.locator('#forgeEquipment,#forgePearlSelect,#forgeFusionSelect').count()
        assert q.locator('.forge2-tile').count()==16
        q.locator('[data-forge-page="1"]').click();assert '2 /' in q.locator('.forge2-pagination').inner_text()
        q.locator('[data-forge-page="-1"]').click()
        q.locator('[data-forge-list]').click();assert q.locator('.forge2-catalog.as-list').count();q.locator('[data-forge-list]').click()
        q.locator('#forgeSearch').fill('texto inexistente');assert q.locator('.forge2-tile').count()==0;q.locator('#forgeSearch').fill('')
        q.locator('[data-forge-filter=where]').select_option('equipped');assert q.locator('.forge2-tile').count()==11
        q.locator('[data-forge-filter=rarity]').select_option('epic');assert q.locator('.forge2-tile').count()==1
        q.locator('[data-forge-filter=slot]').select_option('weapon');q.locator('[data-forge-filter=level]').fill('11');q.locator('[data-forge-filter=level]').press('Tab');assert q.locator('.forge2-tile').count()==0
        q.locator('[data-forge-filter=level]').fill('10');q.locator('[data-forge-filter=level]').press('Tab');q.locator('[data-forge-item=worn-weapon]').click();shot(q,'upgrade-'+suffix)
        # Guaranteed upgrade, current formula preview and actual exact costs.
        before=saved(q);cost=q.evaluate('MareForge.upgradeCost('+json.dumps(before['equipment']['weapon'])+')');q.locator('[data-forge-action=upgrade]').click();same(q,before);confirm(q);after=saved(q)
        assert after['equipment']['weapon']['plus']==1 and after['gold']==before['gold']-cost['gold'] and after['materials']==before['materials']-cost['materials'];assert q.locator('#forgeOperationResult.success').is_visible()
        tab(q,'imbue');assert q.locator('[data-forge-item=worn-weapon]').get_attribute('aria-pressed')=='true'
        q.locator('[data-forge-pearl="p-for-1-0"]').click();shot(q,'imbue-'+suffix)
        before=saved(q);q.locator('[data-forge-action=imbue]').click();same(q,before);q.locator('[data-confirm-cancel]').click();same(q,before)
        q.locator('[data-forge-action=imbue]').click();confirm(q);after=saved(q);assert after['equipment']['weapon']['sockets'][0]=='pearl_for_1';assert len(after['inventory'])==len(before['inventory'])-1
        d=q.evaluate('__mareDiagnostics()');assert abs(d['stats']['attributes']['strength']-d['stats']['preAttributes']['strength']*1.02)<1e-5
        before=saved(q);q.locator('[data-forge-remove="0"]').click();same(q,before);confirm(q);after=saved(q);assert after['gold']==before['gold']-252 and after['equipment']['weapon']['sockets'][0] is None
        # Individual reforge cancel then commit, other lines preserved, next cost grows.
        tab(q,'reforge');shot(q,'reforge-line-'+suffix);before=saved(q);q.locator('[data-forge-action=reforgeLine]').nth(1).click();same(q,before);assert 'resultado pode ser inferior' in q.locator('#confirmationMessage').inner_text();q.locator('[data-confirm-cancel]').click();same(q,before)
        q.evaluate('Math.random=()=>0.99');q.locator('[data-forge-action=reforgeLine]').nth(1).click();confirm(q);after=saved(q)
        for i in [0,2,3]:assert after['equipment']['weapon']['extras'][i]==before['equipment']['weapon']['extras'][i]
        assert after['equipment']['weapon']['reforgeAttempts']==1;assert len(after['equipment']['weapon']['extras'])==4
        q.locator('[data-forge-reforge-mode=all]').click();shot(q,'reforge-all-'+suffix);before=saved(q);q.locator('[data-forge-action=reforge]').click();same(q,before);confirm(q);after=saved(q)
        old=copy.deepcopy(before['equipment']['weapon']);new=copy.deepcopy(after['equipment']['weapon'])
        for k in ['extras','reforgeAttempts']:old.pop(k);new.pop(k)
        assert new==old
        # Equipment fusion and filters persisted. Clear filters to expose all eligible bag items.
        tab(q,'fusion')
        for name in ['where','rarity','slot']:q.locator('[data-forge-filter='+name+']').select_option('')
        q.locator('[data-forge-filter=level]').fill('');q.locator('[data-forge-filter=level]').press('Tab')
        assert q.locator('[data-forge-item=worn-weapon]').count()==0
        q.locator('[data-forge-auto]').click();assert q.locator('.forge2-material-slot.filled').count()==5;q.locator('[data-forge-clear]').click();assert q.locator('.forge2-material-slot.filled').count()==0;q.locator('[data-forge-auto]').click();shot(q,'fusion-equipment-'+suffix)
        before=saved(q);q.locator('[data-forge-action=fuseEquipment]').click();same(q,before);q.locator('[data-confirm-cancel]').click();same(q,before)
        q.locator('[data-forge-action=fuseEquipment]').click();confirm(q);after=saved(q);assert len(after['inventory'])==len(before['inventory'])-4;assert after['equipment']==before['equipment'];assert q.locator('#forgeOperationResult.success').is_visible();new_items=[i for i in after['inventory'] if i['id'] not in {x['id'] for x in before['inventory']}];assert len(new_items)==1 and new_items[0]['plus']==0 and new_items[0]['rarity']=='uncommon'
        # Pearl fusion: cancellation, success and failure consume exact quantities.
        q.locator('[data-forge-fusion-mode=pearls]').click();
        for _ in range(5):q.locator('[data-forge-fusion-pearl=pearl_for_1]').click()
        shot(q,'fusion-pearl-'+suffix)
        q.evaluate('Math.random=()=>0.1');before=saved(q);q.locator('[data-forge-action=fuse]').click();same(q,before);q.locator('[data-confirm-cancel]').click();same(q,before)
        q.locator('[data-forge-action=fuse]').click();confirm(q);after=saved(q);assert len(after['inventory'])==len(before['inventory'])-4 and after['gold']==before['gold']-40
        q.evaluate('Math.random=()=>0.999');
        for _ in range(5):q.locator('[data-forge-fusion-pearl=pearl_for_1]').click()
        before=saved(q);q.locator('[data-forge-action=fuse]').click();confirm(q);after=saved(q);assert len(after['inventory'])==len(before['inventory'])-5 and after['gold']==before['gold']-40;assert q.locator('#forgeOperationResult.failure').is_visible();shot(q,'fusion-failure-'+suffix)
        committed=saved(q);close(q);q.reload();q.wait_for_load_state('networkidle');again=saved(q)
        for k in ['forgeVersion','forgeSeq','forgeHistory','equipment','inventory','gold','materials']:assert committed[k]==again[k],k
        assert len({i['id'] for i in again['inventory']})==len(again['inventory'])
        record('visual_flows_transactions_reload_'+suffix);c.close()
    # Risky +5 failure and +19 success; confirmation cancellation has no RNG/payment.
    seed=seeded(template);seed['equipment']['weapon']['plus']=5;c,q=page_for(browser,seed,errors=errors);panel(q,'forge');q.evaluate('Math.random=()=>0.999');before=saved(q);q.locator('[data-forge-action=upgrade]').click();same(q,before);confirm(q);after=saved(q);assert after['equipment']['weapon']['plus']==5 and after['gold']<before['gold'];assert q.locator('#forgeOperationResult.failure').is_visible();shot(q,'upgrade-failure');c.close()
    seed['equipment']['weapon']['plus']=19;c,q=page_for(browser,seed,errors=errors);panel(q,'forge');q.evaluate('Math.random=()=>0');q.locator('[data-forge-action=upgrade]').click();confirm(q);assert saved(q)['equipment']['weapon']['plus']==20;assert q.locator('[data-forge-action=upgrade]').is_disabled();shot(q,'upgrade-limit');c.close();record('upgrade_risk_failure_limit')
    seed=seeded(template);seed.update(gold=0,materials=0);seed['equipment']['weapon']['locked']=True;c,q=page_for(browser,seed,errors=errors);panel(q,'forge');assert q.locator('[data-forge-action=upgrade]').is_disabled();tab(q,'reforge');assert q.locator('[data-forge-action=reforgeLine]:enabled').count()==0;tab(q,'fusion');q.locator('[data-forge-auto]').click();assert q.locator('[data-forge-action=fuseEquipment]').is_disabled();c.close();record('locks_insufficient_budget')
    assert not errors,errors;record('no_javascript_errors');browser.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')

