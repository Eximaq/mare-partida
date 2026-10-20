"""Short real-game samples, not a full level 1–20 simulation."""
import copy,json
from playwright.sync_api import sync_playwright
from polish_support import page_for,create,saved
weapons=dict(sword=0,brawler=2,gunner=4,rogue=12,cyborg=14,strategist=16,healer=33)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True);errors=[];c,q=page_for(b,errors=errors);template=create(q);c.close();rows=[]
    for cls,index in weapons.items():
        seed=copy.deepcopy(template);seed['classId']=cls;seed['equipment']['weapon']['def']=index
        c,q=page_for(b,seed,errors=errors);q.locator('#enterHunt').click();q.locator('[data-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area]').click()
        q.clock.run_for(30000);d=q.evaluate('__mareDiagnostics()');assert d['kills']>=2,(cls,d['kills']);assert d['walkable'];assert d['hp']>0,(cls,d['hp'])
        q.locator('#returnLobby').click();data=saved(q);assert data['stats']['xpEarned']>0;assert data['hunts']['areas']['beach']['kills']==d['kills']
        row=dict(classId=cls,kills=d['kills'],level=d['level'],xp=data['stats']['xpEarned'],hp=round(d['hp']),potions=data['potions']);rows.append(row);print(json.dumps(row),flush=True);c.close()
    assert not errors,errors;b.close();print(json.dumps(dict(passed=True,sample_seconds=30,classes=7,errors=errors)),flush=True)
