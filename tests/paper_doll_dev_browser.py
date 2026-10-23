"""Player-accessible preview, real inventory transactions and isolated DEV persistence."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8125/dist/')
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/evidence-paper-doll/dev-preview';OUT.mkdir(parents=True,exist_ok=True)
NORMAL='mare-partida-save-v1';DEV='mare-partida-dev-save-v1'
with sync_playwright() as p:
 b=p.chromium.launch();c=b.new_context(viewport={'width':1366,'height':900});q=c.new_page();q.clock.install();errors=[];requests=[]
 q.on('pageerror',lambda e:errors.append(str(e)));q.on('request',lambda r:requests.append(r.url))
 c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'))
 c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
 q.goto(BASE+'?paperDollReview=navy-starter',wait_until='networkidle')
 q.locator('#characterName').fill('Revisao Isolada');q.locator('#nextToClass').click();q.locator('[data-class=sword]').click();q.locator('#createCharacter').click();q.clock.run_for(300)
 assert not q.evaluate('__mareDiagnostics().paperDollReview.enabled')
 assert not any('paper-doll-navy-starter' in u for u in requests)
 normal=q.evaluate('localStorage.getItem("'+NORMAL+'")')
 q.goto(BASE+'?dev=1&paperDollReview=navy-starter',wait_until='networkidle')
 q.wait_for_function('window.__mareDiagnostics?.().paperDollReview.state==="ready"');q.clock.run_for(400)
 assert q.evaluate('__mareDiagnostics().paperDollReview.draws')>0
 assert q.locator('.dev-badge').inner_text()=='LABORATÓRIO · PAPER DOLL EM REVISÃO'
 def saved():return json.loads(q.evaluate('localStorage.getItem("'+DEV+'")'))
 def state():return q.evaluate('__mareDiagnostics().paperDollReview')
 assert saved()['devSandbox']
 # Normal pagehide saves elapsed time before DEV opens; freeze the baseline after navigation.
 after_exit=q.evaluate('localStorage.getItem("'+NORMAL+'")');assert json.loads(after_exit)['classId']==json.loads(normal)['classId'];normal=after_exit
 q.locator('#devLauncher').click();assert q.get_by_role('link',name='Desativar prévia visual').is_visible();q.screenshot(path=str(OUT/'laboratory-1366.png'),full_page=True);q.locator('#closePanel').click()
 # Equip a real, unsupported pair of boots; restore the original immediately after removal.
 boot=next(i for i in saved()['inventory'] if i['def']==8)
 q.locator('.bottom-nav [data-panel=inventory]').click();q.locator('[data-item="'+boot['id']+'"]').click();q.locator('[data-equip="'+boot['id']+'"]').click()
 q.locator('[data-close-panel]').click();q.clock.run_for(200)
 before=state()['draws'];q.clock.run_for(300);assert state()['draws']==before and state()['lastReason']=='unmapped-equipment'
 q.locator('.bottom-nav [data-panel=inventory]').click();q.locator('[data-inv-slot=boots]').click();q.locator('[data-unequip=boots]').click();q.locator('[data-close-panel]').click();q.clock.run_for(300)
 assert state()['draws']>before and state()['lastReason'] is None
 # Removing the initial weapon resolves back to the declared default visual, without save appearance data.
 q.locator('.bottom-nav [data-panel=inventory]').click();q.locator('[data-inv-slot=weapon]').click();q.locator('[data-unequip=weapon]').click();q.locator('[data-close-panel]').click();q.clock.run_for(300)
 assert saved()['equipment']['weapon'] is None and state()['lastReason'] is None
 for key in ['w','a','s','d']:q.keyboard.down(key);q.clock.run_for(600);q.keyboard.up(key);q.clock.run_for(200)
 q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area=beach]').click();q.clock.run_for(24000)
 assert q.evaluate('__mareDiagnostics().damage')>0 and state()['draws']>before
 assert state()['cacheEntries']<=96 and state()['cacheBytes']<=4*1024*1024
 q.screenshot(path=str(OUT/'combat-1366.png'))
 assert not any('appearance' in k.lower() or 'paper' in k.lower() for k in saved())
 assert q.evaluate('localStorage.getItem("'+NORMAL+'")')==normal
 # DEV class changes must fall back, not show a swordsman for every action category.
 q.locator('#devLauncher').click();q.locator('#devClass').select_option('gunner');q.locator('[data-dev-command=class]').click();q.locator('#closePanel').click();q.clock.run_for(200)
 before=state()['draws'];q.clock.run_for(300);assert state()['draws']==before
 q.set_viewport_size({'width':393,'height':852});q.locator('#devLauncher').click();assert q.evaluate('document.documentElement.scrollWidth<=innerWidth');q.screenshot(path=str(OUT/'laboratory-393.png'),full_page=True)
 q.get_by_role('link',name='Desativar prévia visual').click();q.wait_for_function('window.__mareDiagnostics?.().paperDollReview.state==="off"')
 q.locator('#devLauncher').click();q.locator('[data-dev-exit]').click();q.wait_for_function('window.__mareDiagnostics?.().dev.active===false')
 assert 'paperDollReview' not in q.url and not state()['enabled']
 restored=json.loads(q.evaluate('localStorage.getItem("'+NORMAL+'")'));assert restored['classId']=='sword' and not restored.get('devSandbox')
 assert not errors,errors
 # Failed asset requests must leave a working game with the legacy sprite.
 c2=b.new_context();c2.add_init_script('localStorage.setItem('+json.dumps(NORMAL)+','+json.dumps(normal)+')');c2.route('**/paper-doll-navy-starter-20261023/review-pack.json',lambda r:r.fulfill(status=404,body='missing'))
 fail=c2.new_page();fail.goto(BASE+'?dev=1&paperDollReview=navy-starter',wait_until='networkidle');fail.wait_for_function('window.__mareDiagnostics?.().paperDollReview.state==="failed"');assert fail.evaluate('__mareDiagnostics().paperDollReview.draws')==0
 assert fail.locator('#worldCanvas').is_visible();c2.close();c.close();b.close()
print('DEV preview passed: no normal asset requests, explicit activation, inventory fallback/removal, real hunt damage, class fallback, mobile, disable/exit, failed loading and normal-save isolation.')

