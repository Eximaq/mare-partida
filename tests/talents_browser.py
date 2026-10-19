"""Isolated talent UI, persistence and real combat acceptance."""
import copy,json,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for,create,saved,KEY
OUT=Path(tempfile.gettempdir())/'mare-talents-qa';OUT.mkdir(exist_ok=True)
results=[]
def record(name):results.append(name);print(name+': passed',flush=True)
def diag(q):return q.evaluate('__mareDiagnostics()')
def open_tree(q):
    q.locator('.bottom-nav [data-panel=character]').click()
    q.locator('#characterTabs [data-character-tab=talents]').click()
def choose(q,node):
    q.locator('[data-talent-select="'+node+'"]').focus();q.locator('[data-talent-select="'+node+'"]').click()
def add(q,node,n=1):
    choose(q,node)
    for _ in range(n):q.locator('[data-talent-add]').click()
def confirm(q):q.locator('[data-talent-confirm]').click();q.locator('[data-confirm-accept]').click()
def travel(q):
    q.locator('#enterHunt').click();q.locator('[data-mode=map]').click();q.locator('[data-island][data-current=true]').click();q.locator('[data-travel-area]').click()
with sync_playwright() as p:
    b=p.chromium.launch(headless=True);errors=[]
    c,q=page_for(b,errors=errors);template=create(q);assert diag(q)['talentPoints']==1;c.close()
    seed=copy.deepcopy(template);seed.update(level=30,hp=100,energy=50)
    seed.pop('talentVersion',None);seed.pop('talentBuilds',None)
    c,q=page_for(b,seed,errors=errors)
    assert diag(q)['talentPoints']==30
    q.locator('.bottom-nav [data-panel=character]').click()
    assert q.locator('.character-choice').is_visible() and q.locator('[data-attribute-add]').count()==0
    q.locator('#closePanel').click();q.keyboard.press('p');assert q.locator('.character-choice').is_visible()
    q.locator('#characterTabs [data-character-tab=talents]').focus();q.keyboard.press('Enter')
    assert q.locator('.talent-node').count()==15 and q.locator('.talent-keystone').count()==3
    before=diag(q);persist=saved(q)
    choose(q,'sword-0-1');assert q.locator('[data-talent-add]').is_disabled()
    add(q,'sword-0-0',5);add(q,'sword-1-0')
    choose(q,'sword-2-0');assert q.locator('[data-talent-add]').is_disabled()
    assert 'duas' in q.locator('.talent-reason').inner_text()
    assert diag(q)['stats']==before['stats'] and saved(q)==persist
    q.locator('[data-talent-cancel]').click();assert '30 PT'==q.locator('[data-talent-points]').inner_text()
    add(q,'sword-0-0',10);add(q,'wear');choose(q,'parry');assert q.locator('[data-talent-add]').is_disabled()
    q.locator('[data-talent-confirm]').click();q.locator('[data-confirm-cancel]').click();assert saved(q)==persist
    confirm(q);committed=saved(q);assert diag(q)['talentPoints']==19 and diag(q)['stats']['crit']>before['stats']['crit']
    for _ in range(2):
        q.reload();q.wait_for_load_state('networkidle');assert diag(q)['talentPoints']==19
    assert saved(q)['talentBuilds']['sword']==committed['talentBuilds']['sword']
    record('landing_draft_rules_confirmation_reload')
    open_tree(q)
    for w,h in [(1920,1080),(1366,768),(1280,720),(393,852),(320,740)]:
        q.set_viewport_size(dict(width=w,height=h));q.locator('#dialogBody').evaluate('(e)=>e.scrollTop=0')
        choose(q,'wear');q.locator('#dialogBody').evaluate('(e)=>e.scrollTop=0')
        assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),(w,'overflow')
        box=q.locator('#characterTabs').bounding_box();assert box['y']>=0 and box['x']>=0 and box['x']+box['width']<=w+1,(w,box)
        q.screenshot(path=str(OUT/f'talents-{w}.png'))
    q.set_viewport_size(dict(width=1366,height=768))
    q.locator('[data-talent-reset]').click();q.locator('[data-confirm-cancel]').click();assert diag(q)['talentPoints']==19
    q.locator('[data-talent-reset]').click();q.locator('[data-confirm-accept]').click();assert diag(q)['talentPoints']==30
    for key in ['gold','inventory','equipment','attributes']:assert saved(q)[key]==committed[key]
    record('responsive_five_sizes_reset_preserves_progress')
    add(q,'sword-0-0');q.evaluate("()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mare-partida-save-v1')throw new Error('quota');return originalSet.call(this,k,v)}}")
    confirm(q);assert diag(q)['talentPoints']==30 and 'Nenhum ponto' in q.locator('.talent-message').inner_text()
    q.evaluate('()=>{Storage.prototype.setItem=window.originalSet}');assert saved(q)['talentBuilds']['sword']['nodes']=={}
    record('storage_failure_keeps_points_and_live_state');assert not errors,errors;c.close()
    for cls,key in [('brawler','concussion'),('sword','wear'),('gunner','focus'),('rogue','poison'),('cyborg','adaptive'),('strategist','freeze'),('healer','rejuvenation')]:
        g=copy.deepcopy(seed);g['classId']=cls;g['talentVersion']=1;g['talentBuilds']={cls:{'nodes':{cls+'-0-0':10},'keystone':key}}
        c,q=page_for(b,g,errors=errors);open_tree(q)
        assert q.locator('.talent-keystone.is-chosen').count()==1 and q.locator('.talent-node').count()==15
        q.locator('#closePanel').click();travel(q)
        for _ in range(45):
            q.clock.run_for(1000)
            d=diag(q)
            if d['talents']['procs'].get(key,0)>0 and d['damage']>0:break
            if key in ['focus','rejuvenation'] and d['kills']>0:break
        assert d['damage']>0 and d['walkable'],(cls,d)
        if key not in ['focus','rejuvenation']:assert d['talents']['procs'].get(key,0)>0,(cls,d)
        assert d['talentPoints']==d['level']-11
        open_tree(q);assert q.locator('[data-talent-reset]').is_disabled()
        if cls=='rogue':q.screenshot(path=str(OUT/'poison-combat.png'))
        record('class_tree_and_live_combat_'+cls);c.close()
    assert not errors,errors;b.close()
print(json.dumps({'groups':len(results),'screenshots':str(OUT),'errors':errors}))
