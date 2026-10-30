"""Thirty-second combat samples at Orange's entry level, not a campaign benchmark."""
import copy,json
from playwright.sync_api import sync_playwright
from polish_support import ROOT,KEY,saved
weapons={'sword':(0,'strength','dexterity'),'brawler':(2,'strength','vitality'),'gunner':(4,'dexterity','strength'),'rogue':(12,'dexterity','vitality'),'cyborg':(14,'vitality','strength'),'strategist':(16,'intelligence','spirit'),'healer':(33,'spirit','intelligence')}
errors=[]
def page(b,seed=None):
    c=b.new_context();c.route('**/__dev_version',lambda r:r.fulfill(body='stable-test'))
    if seed:c.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(seed))+')')
    q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install();q.goto('http://127.0.0.1:8123/');q.wait_for_function('typeof __mareDiagnostics==="function"');q.evaluate('MareOrangeRenderer.boot');return c,q
with sync_playwright() as p:
    b=p.chromium.launch();c,q=page(b);q.locator('#characterName').fill('Nauta amostra');q.locator('#nextToClass').click();q.locator('#nextToAppearance').click();q.locator('#createCharacter').click();q.locator('[data-confirm-accept]').click();q.clock.run_for(100);template=saved(q);c.close();rows=[]
    for cls,(index,primary,secondary) in weapons.items():
        seed=copy.deepcopy(template);seed.update(classId=cls,level=21,hp=99999,energy=99999,potions=30)
        seed['attributes']={k:0 for k in seed['attributes']};seed['attributes'][primary]=70;seed['attributes'][secondary]=30
        seed['equipment']['weapon'].update({'def':index,'level':4,'rarity':'epic'})
        c,q=page(b,seed);q.locator('#modesMenuTrigger').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=orange-town]').click();q.locator('[data-travel-area=orange]').click()
        for _ in range(30):q.clock.run_for(1000)
        d=q.evaluate('__mareDiagnostics()');q.locator('#returnLobby').click();data=saved(q)
        row={'classId':cls,'kills':d['kills'],'level':d['level'],'xp':data['stats']['xpEarned'],'hp':round(d['hp']),'potions':data['potions'],'attributes':d['attributes']};rows.append(row);print(json.dumps(row),flush=True)
        assert d['walkable'];assert d['kills']>0,(cls,d);assert data['stats']['xpEarned']>0;c.close()
    assert not errors,errors;b.close();(ROOT/'docs/evidence-orange-town/class-samples.json').write_text(json.dumps({'seconds':30,'fixture':'Nv21, 100 attribute points 70/30, class weapon epic tier4, starter armor, 30 potions, no assigned talents/Haki','rows':rows,'errors':errors},indent=2),encoding='utf-8')
