"""Appearance editor through real menus, draft/cancel/apply/reload and isolated save."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8125/dist/')
OUT=Path(__file__).resolve().parents[1]/'docs/evidence-paper-doll/appearance'
OUT.mkdir(parents=True,exist_ok=True)
NORMAL='mare-partida-save-v1';DEV='mare-partida-dev-save-v1'
with sync_playwright() as p:
 b=p.chromium.launch();c=b.new_context(viewport={'width':1366,'height':900});q=c.new_page();errors=[]
 q.on('pageerror',lambda e:errors.append(str(e)))
 c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
 c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'))
 q.goto(BASE,wait_until='networkidle')
 q.wait_for_function('typeof window.__mareDiagnostics==="function"')
 q.locator('#characterName').fill('Aparencia Compartilhada');q.locator('#nextToClass').click();q.locator('[data-class=sword]').click();q.locator('#createCharacter').click()
 def open_look():
  q.locator('#characterMenuTrigger').click();q.locator('[data-character-section=status]').click();q.locator('[data-character-section=appearance]').click()
 def saved():return q.evaluate('JSON.parse(localStorage.getItem("'+DEV+'"))')
 open_look();assert q.get_by_role('link',name='Abrir laboratório de aparência').is_visible()
 q.get_by_role('link',name='Abrir laboratório de aparência').click()
 q.wait_for_function('window.__mareDiagnostics?.().paperDollReview.state==="ready"')
 normal=q.evaluate('localStorage.getItem("'+NORMAL+'")')
 open_look();q.wait_for_function('document.querySelector("#dollLookState")?.textContent.includes("sincronizadas")')
 assert 'paperDollLook' not in saved()
 q.locator('[data-doll-look=hair]').select_option('bald')
 q.locator('[data-doll-look-cancel]').click()
 assert q.locator('[data-doll-look=hair]').input_value()=='short-black'
 assert 'paperDollLook' not in saved()
 q.locator('[data-doll-look=hair]').select_option('bald');q.locator('[data-doll-look-apply]').click()
 assert saved()['paperDollLook']=={'version':1,'hair':'bald','outfit':'navy'}
 for direction in ['south','north','west','east']:
  q.locator('#dollLookDirection').select_option(direction)
  for action in ['idle','walk','attack']:
   q.locator('#dollLookAction').select_option(action)
   q.wait_for_function('document.querySelector("#dollLookState")?.textContent.includes("sincronizadas")')
 q.locator('#dollLookDirection').select_option('south');q.locator('#dollLookAction').select_option('idle')
 q.screenshot(path=str(OUT/'appearance-1366.png'),full_page=True)
 q.locator('#closePanel').click();q.reload(wait_until='networkidle')
 q.wait_for_function('window.__mareDiagnostics?.().paperDollReview.state==="ready"');open_look()
 assert q.locator('[data-doll-look=hair]').input_value()=='bald'
 # Storage failure must not apply the draft to the live character.
 q.evaluate("() => {window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mare-partida-dev-save-v1')throw Error('test-full');return window.originalSetItem.call(this,k,v)};}")
 q.locator('[data-doll-look=hair]').select_option('short-black');q.locator('[data-doll-look-apply]').click()
 assert q.get_by_text('Não foi possível salvar. A aparência anterior foi preservada.').is_visible()
 assert saved()['paperDollLook']['hair']=='bald'
 q.locator('[data-doll-look-cancel]').click();assert q.locator('[data-doll-look=hair]').input_value()=='bald'
 q.evaluate('() => {Storage.prototype.setItem=window.originalSetItem;}')
 # Equipment removal is a real inventory transaction, not a visual-only fake.
 q.locator('#closePanel').click();q.locator('.bottom-nav [data-panel=inventory]').click()
 q.locator('[data-inv-slot=coat]').click();q.locator('[data-unequip=coat]').click();q.locator('[data-close-panel]').click()
 open_look();q.locator('[data-doll-look=outfit]').select_option('base');q.locator('[data-doll-look-apply]').click()
 assert saved()['equipment']['coat'] is None and saved()['paperDollLook']['outfit']=='base'
 q.wait_for_function('document.querySelector("#dollLookState")?.textContent.includes("sincronizadas")')
 q.set_viewport_size({'width':393,'height':852})
 assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 q.screenshot(path=str(OUT/'appearance-393.png'),full_page=True)
 assert q.evaluate('localStorage.getItem("'+NORMAL+'")')==normal
 assert not errors,errors
 c.close();b.close()
print('Appearance editor passed: normal gate, four directions/actions, draft cancellation, apply/reload, storage rollback, mobile and normal-save isolation.')
